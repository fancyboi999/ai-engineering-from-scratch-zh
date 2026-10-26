'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');
const projects = vm.runInNewContext(read('projects-data.js') + '\nwindow.AIFS_PROJECTS.projects', { window: {} });
const markdown = require('./project-markdown');
const renderer = require('./md-render');

test('every project and stage has readable, distinct HTML before JavaScript runs', () => {
  for (const project of projects) {
    const overview = read(`project/${project.id}/index.html`);
    const main = overview.match(/<main\b[\s\S]*?<\/main>/)[0];
    assert.doesNotMatch(main, /正在加载项目/, project.id);
    assert.match(main, /<h1>/, project.id);
    for (const stage of project.stages) {
      const route = `/project/${project.id}/${stage.id}/`;
      assert.ok(main.includes(`href="${route}"`), route + ' is discoverable without JavaScript');
      const html = read(route.slice(1) + 'index.html');
      assert.ok(html.includes(`rel="canonical" href="https://aieng-zh.cn${route}"`), route);
      assert.ok(html.includes(`id="pjDoc" data-prerendered-stage="${stage.id}"`), route);
      assert.doesNotMatch(html, /正在加载项目|正在加载课程/, route);
      const source = fs.readFileSync(path.join(__dirname, '..', stage.doc), 'utf8');
      const rendered = markdown.render(source, path.posix.dirname(stage.doc), renderer,
        target => require('./build').githubSourceUrl(target, 'blob'));
      assert.ok(html.includes(rendered.html), route + ' contains the complete source document');
      assert.match(html, /script type="application\/ld\+json" data-project-seo/);
    }
  }
});

test('real HTTP serves project source content without client rendering or a second request', async t => {
  const { once } = require('node:events');
  const server = require('../scripts/serve-agent-site').createServer();
  t.after(() => new Promise(resolve => server.close(resolve)));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const project of projects.filter(item => ['tiny-coding-agent', 'research-report-agent'].includes(item.id))) {
    for (const route of [`/project/${project.id}/`, ...project.stages.map(stage => `/project/${project.id}/${stage.id}/`)]) {
      const response = await fetch(origin + route);
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get('content-type'), /text\/html/);
      const html = await response.text();
      assert.equal(html, read(route.slice(1) + 'index.html'));
      assert.doesNotMatch(html, /正在加载项目/);
    }
  }
});

test('figure providers resolve at the site root when a stage uses a nested URL', async () => {
  const source = read('projects.js');
  const loader = source.slice(source.indexOf('  function loadFigures('), source.indexOf('  function prerequisiteHtml('));
  const scripts = [];
  const document = {
    createElement: () => ({}),
    head: { appendChild(script) { scripts.push(script); script.onload(); } },
  };
  const context = vm.createContext({ document, scriptVersion: 'test' });
  vm.runInContext(loader, context);
  const project = projects.find(item => item.id === 'tiny-coding-agent');
  await context.loadFigures(project);
  assert.ok(scripts.length);
  for (const script of scripts) {
    const url = new URL(script.src, 'https://aieng-zh.cn/project/tiny-coding-agent/01-confine-paths/');
    assert.ok(url.pathname.startsWith('/figures/projects/'), url.href);
    assert.ok(fs.existsSync(path.join(__dirname, url.pathname)));
  }
});
