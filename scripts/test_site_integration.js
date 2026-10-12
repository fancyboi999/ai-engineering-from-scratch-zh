'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { createServer } = require('./serve-agent-site');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const read = file => fs.readFileSync(path.join(site, file), 'utf8');
const lessons = JSON.parse(read('lesson-seo.json')).lessons;
const projects = vm.runInNewContext(read('projects-data.js') + '\nwindow.AIFS_PROJECTS', { window: {} }).projects;

// These checks consume the real integrated build, not frozen English fixtures.
test('build.js publishes exports before loading the manual builder and has no require-time writes', () => {
  const before = read('data.js');
  const result = spawnSync(process.execPath, ['-e', "const b=require('./site/build'); const m=require('./site/build-manuals'); if(typeof b.githubSourceUrl!=='function'||m.loadAll().length!==2)process.exit(1)"], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(read('data.js'), before);
});

test('all 528 static lessons preserve Chinese source rendering, canonical, quiz and Hub discovery', () => {
  let count = 0;
  for (const entry of Object.values(lessons).filter(entry => entry.path.startsWith('phases/'))) {
    const file = entry.path.replace(/^phases\//, 'lessons/') + '/index.html';
    const html = read(file);
    assert.ok(html.includes(`href="${entry.canonicalUrl}"`), file);
    assert.match(html, /window\.__PRERENDERED__ = /, file);
    assert.match(html, /id="lessonContent"><article class="lesson-article">/, file);
    assert.ok(html.includes(`href="${entry.context.hub}"`), file);
    assert.match(html, /\/og\/lesson\/phases\/.+\.png\?v=[a-f0-9]+/, file);
    assert.doesNotMatch(html, /(?:>,+<meta|aiengineeringfromscratch\.com)/, file);
    const payload = JSON.parse(html.match(/window\.__PRERENDERED__ = ([^\n]+);<\/script>/)[1]);
    assert.equal(payload.path, entry.path);
    const quizPath = path.join(root, entry.path, 'quiz.json');
    assert.deepEqual(payload.quiz, fs.existsSync(quizPath) ? JSON.parse(fs.readFileSync(quizPath, 'utf8')) : null);
    for (const [, href] of html.matchAll(/<a\b[^>]*href="(\/lessons\/[^"#?]+)[^\"]*"/g)) {
      assert.ok(fs.existsSync(path.join(site, href, 'index.html')), `${file}: ${href}`);
    }
    count++;
  }
  assert.equal(count, 528);
});

test('76 project sources, 308 stage docs, two manuals and 245 Hub pages are fully generated', () => {
  assert.equal(projects.length, 76);
  let stages = 0;
  const sitemap = read('sitemap.xml');
  for (const project of projects) {
    assert.ok(sitemap.includes('/project.html?id=' + project.id));
    for (const stage of project.stages) {
      const source = fs.readFileSync(path.join(root, project.path, 'stages', stage.id, 'docs/zh.md'), 'utf8');
      assert.equal(read(`project-content/${project.id}/stages/${stage.id}/docs/zh.md`), source);
      assert.ok(sitemap.includes('&amp;stage=' + stage.id));
      stages++;
    }
  }
  assert.equal(stages, 308);
  for (const id of ['a2a-101', 'docker-sandboxes-101']) {
    assert.match(read(`manual-${id}.html`), /lang="zh-CN"/);
    assert.match(read(`manual-${id}-print.html`), /lang="zh-CN"/);
    assert.ok(sitemap.includes(`/manual-${id}.html`));
  }
  assert.equal(fs.readdirSync(path.join(site, 'hubs/phase')).length, 20);
  assert.equal(fs.readdirSync(path.join(site, 'hubs/glossary')).length, 225);
  const cards = JSON.parse(read('og-cards.json')).cards;
  assert.equal(Object.keys(cards).filter(key => key.startsWith('project/')).length, 76);
  assert.equal(Object.keys(cards).filter(key => key.startsWith('phase/')).length, 20);
  assert.equal(Object.keys(cards).filter(key => key.startsWith('term/')).length, 225);
  for (const file of ['index.html', 'catalog.html', 'glossary.html', 'project.html', 'projects.html', 'manuals.html', 'manual-a2a-101.html', 'manual-a2a-101-print.html', 'manual-docker-sandboxes-101.html', 'manual-docker-sandboxes-101-print.html']) {
    const head = read(file).split('</head>')[0];
    if (!file.endsWith('-print.html')) {
      assert.equal((head.match(/property="og:image"/g) || []).length, 1, file);
      assert.equal((head.match(/name="twitter:card"/g) || []).length, 1, file);
    }
    assert.doesNotMatch(head, />,+<meta/, file);
    assert.equal((head.match(/<link rel="icon" href="\/favicon\.ico\?v=20260831a" sizes="32x32">/g) || []).length, 1, file);
    assert.equal((head.match(/<link rel="icon" href="\/favicon\.svg\?v=20260831a" type="image\/svg\+xml">/g) || []).length, 1, file);
  }
});

test('real HTTP negotiates Hub and static lesson Markdown, serves dynamic PNG, and keeps HTML canonical', async t => {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const entry = Object.values(lessons).find(entry => entry.path.startsWith('phases/'));
  for (const [route, markdown] of [
    [entry.canonicalUrl.replace('https://aieng-zh.cn', ''), fs.readFileSync(path.join(root, entry.path, 'docs/zh.md'), 'utf8')],
    ['/phase/setup-and-tooling', read('agent-pages/phase/setup-and-tooling.md')],
    ['/glossary/attention', read('agent-pages/glossary/attention.md')],
  ]) {
    const response = await fetch(base + route, { headers: { Accept: 'text/markdown' } });
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), /text\/markdown/);
    assert.match(response.headers.get('vary'), /Accept/);
    assert.equal(await response.text(), markdown);
    const head = await fetch(base + route, { method: 'HEAD', headers: { Accept: 'text/markdown' } });
    assert.equal(head.status, 200); assert.equal(await head.text(), '');
    const html = await fetch(base + route, { headers: { Accept: 'text/html' } });
    assert.equal(html.status, 200); assert.match(await html.text(), /lang="zh-CN"/);
  }
  const response = await fetch(base + '/og/project/agent-budget-planner.png');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /image\/png/);
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
  assert.match(response.url, /\?v=[a-f0-9]+$/);
});
