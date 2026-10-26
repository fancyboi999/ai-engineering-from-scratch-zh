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
const manualRoot = path.join(root, 'manuals');
const manualManifests = fs.readdirSync(manualRoot).flatMap(id => {
  const file = path.join(manualRoot, id, 'manual.json');
  return fs.existsSync(file) ? [JSON.parse(fs.readFileSync(file, 'utf8'))] : [];
});
const publishedManualIds = manualManifests.filter(manual => manual.status === 'ready').map(manual => manual.id).sort();
const lessons = JSON.parse(read('lesson-seo.json')).lessons;
const projects = vm.runInNewContext(read('projects-data.js') + '\nwindow.AIFS_PROJECTS', { window: {} }).projects;

// These checks consume the real integrated build, not frozen English fixtures.
test('build.js publishes exports before loading the manual builder and has no require-time writes', () => {
  const before = read('data.js');
  const result = spawnSync(process.execPath, ['-e', `const b=require('./site/build'); const m=require('./site/build-manuals'); if(typeof b.githubSourceUrl!=='function'||m.loadAll().length!==${manualManifests.length})process.exit(1)`], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(read('data.js'), before);
});

test('all 542 static lessons preserve Chinese source rendering, canonical, quiz and Hub discovery', () => {
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
  assert.equal(count, 542);
});

test('project, stage, manual and Hub sources are fully generated', () => {
  assert.equal(projects.length, 78);
  let stages = 0;
  const sitemap = read('sitemap.xml');
  for (const project of projects) {
    assert.ok(sitemap.includes('/project/' + project.id + '/'));
    for (const stage of project.stages) {
      const source = fs.readFileSync(path.join(root, project.path, 'stages', stage.id, 'docs/zh.md'), 'utf8');
      assert.equal(read(`project-content/${project.id}/stages/${stage.id}/docs/zh.md`), source);
      assert.ok(sitemap.includes('/project/' + project.id + '/' + stage.id + '/'));
      stages++;
    }
  }
  assert.equal(stages, 322);
  for (const { id, status } of manualManifests) {
    assert.match(read(`manual-${id}.html`), /lang="zh-CN"/);
    assert.match(read(`manual-${id}-print.html`), /lang="zh-CN"/);
    assert.equal(sitemap.includes(`/manual-${id}.html`), status === 'ready', `${id} publication status`);
    assert.equal(/<meta name="robots" content="noindex">/.test(read(`manual-${id}.html`)), status !== 'ready', `${id} indexing status`);
  }
  const listedManuals = vm.runInNewContext(read('manuals-data.js') + '\nwindow.AIFS_MANUALS', { window: {} });
  assert.deepEqual(Array.from(listedManuals, manual => manual.id).sort(), publishedManualIds);
  for (const { id, status } of manualManifests) {
    assert.equal(read('manuals.html').includes('href="manual-' + id + '.html"'), status === 'ready', id + ' listing status');
  }
  assert.equal(fs.readdirSync(path.join(site, 'hubs/phase')).length, 20);
  assert.equal(fs.readdirSync(path.join(site, 'hubs/glossary')).length, 225);
  const cards = JSON.parse(read('og-cards.json')).cards;
  assert.equal(Object.keys(cards).filter(key => key.startsWith('project/')).length, 78);
  assert.deepEqual(Object.keys(cards).filter(key => key.startsWith('manual/')).sort(), publishedManualIds.map(id => 'manual/' + id));
  assert.equal(Object.keys(cards).filter(key => key.startsWith('phase/')).length, 20);
  assert.equal(Object.keys(cards).filter(key => key.startsWith('term/')).length, 225);
  const manualFiles = manualManifests.flatMap(manual => [`manual-${manual.id}.html`, `manual-${manual.id}-print.html`]);
  for (const file of ['index.html', 'catalog.html', 'glossary.html', 'project.html', 'projects.html', 'manuals.html', ...manualFiles]) {
    const head = read(file).split('</head>')[0];
    if (!file.endsWith('-print.html')) {
      assert.equal((head.match(/property="og:image"/g) || []).length, 1, file);
      // Drafts are rendered for review but are excluded from the published OG manifest.
      const manual = manualManifests.find(entry => file === `manual-${entry.id}.html`);
      const draft = manual && manual.status !== 'ready';
      assert.equal((head.match(/name="twitter:card"/g) || []).length, draft ? 0 : 1, file);
      if (draft) assert.match(head, /property="og:image" content="https:\/\/aieng-zh\.cn\/og\/page\/manuals\.png(?:\?v=[a-f0-9]+)?"/);
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
    assert.match(html.headers.get('vary'), /Accept/);
    assert.equal(html.headers.get('content-language'), 'zh-CN');
  }
  const response = await fetch(base + '/og/project/agent-budget-planner.png');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /image\/png/);
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
  assert.match(response.url, /\?v=[a-f0-9]+$/);
});

test('app.js modal Hub wire switches phases, rejects undeclared targets and preserves keyboard close/focus', () => {
  const source = read('app.js');
  const functions = ['phaseHubHref', 'openModal', 'closeModal', 'initModal'].map(name => {
    const match = source.match(new RegExp('  function ' + name + '\\([^]*?\\n  \\}'));
    assert.ok(match, name + ' source function missing');
    return match[0];
  }).join('\n');
  const elements = new Map(); let active;
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const classes = new Set(), attributes = {}, listeners = {};
    const value = { hidden: true, textContent: '', style: {}, isConnected: true,
      setAttribute: (key, v) => { attributes[key] = v; },
      getAttribute: key => attributes[key], removeAttribute: key => { delete attributes[key]; },
      addEventListener: (key, listener) => { listeners[key] = listener; },
      focus: () => { active = value; },
      classList: { add: key => classes.add(key), remove: key => classes.delete(key), contains: key => classes.has(key),
        toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key) },
      querySelectorAll: () => [element('modalClose'), element('modalPhaseLink')],
    };
    elements.set(id, value); return value;
  }
  const events = new Map(), originFocus = element('origin'); active = originFocus;
  const phases = vm.runInNewContext(read('data.js') + '\nPHASES');
  const context = vm.createContext({ PHASES: phases, currentPhaseIdx: -1, modalReturnFocus: null,
    document: { get activeElement() { return active; }, body: element('body'), getElementById: element,
      addEventListener: (name, listener) => { if (!events.has(name)) events.set(name, []); events.get(name).push(listener); } },
    window: {}, requestAnimationFrame: callback => callback(), renderModalLessons: phase => { context.renderedPhase = phase; },
    bindProgressActions: () => {},
  });
  vm.runInContext(functions + '\ninitModal();', context);
  const link = element('modalPhaseLink'), overlay = element('modalOverlay');
  for (const index of [0, 14]) {
    context.openModal(index, true);
    assert.equal(link.hidden, false); assert.equal(link.getAttribute('href'), phases[index].hub);
    assert.equal(link.textContent, '查看' + phases[index].name + '阶段概览');
    assert.equal(context.renderedPhase, phases[index]); assert.equal(overlay.classList.contains('open'), true);
    assert.equal(active, element('modalClose'));
    for (const listener of events.get('keydown')) listener({ key: 'Escape', target: { closest: () => null } });
    assert.equal(overlay.classList.contains('open'), false); assert.equal(active, originFocus);
    assert.equal(element('body').style.overflow, '');
  }
  const valid = phases[0].hub;
  for (const invalid of [undefined, 'https://aiengineeringfromscratch.com/phase/setup-and-tooling', '/phase/not-published', '/phase/math-foundations']) {
    phases[0].hub = invalid; context.openModal(0, false);
    assert.equal(link.hidden, true); assert.equal(link.getAttribute('href'), undefined);
    assert.equal(context.renderedPhase, phases[0]); context.closeModal(true);
  }
  phases[0].hub = valid; context.openModal(0, true);
  assert.equal(link.hidden, false); assert.equal(link.getAttribute('href'), valid); context.closeModal(true);
  assert.match(read('index.html'), /<a class="modal-phase-link" id="modalPhaseLink" hidden>/);
  assert.match(read('index.html'), /app\.js\?v=20261026a/);
});
