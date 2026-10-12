'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const { createServer } = require('./serve-agent-site');
const root = path.resolve(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'site/lesson.html'), 'utf8');
function actualFunction(name) {
  const match = template.match(new RegExp('      function ' + name + '\\([^]*?\\n      \\}'));
  assert.ok(match, name); return match[0];
}
const data = vm.runInNewContext(fs.readFileSync(path.join(root, 'site/data.js'), 'utf8') + '\n({PHASES,LEARNING_PATHS})');
const certs = JSON.parse(fs.readFileSync(path.join(root, 'site/certification-seo.json'), 'utf8'));
const corePath = 'phases/00-setup-and-tooling/01-dev-environment';

test('actual sidebar-generated URLs resolve and fetch under static core, legacy, learningPath, career and certification modes', async t => {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const track = certs.tracks['claude-ccar-f'];
  const learningPath = data.LEARNING_PATHS.find(entry => entry.id === 'software-engineering-fundamentals');
  const career = data.LEARNING_PATHS.find(entry => entry.kind === 'career-route');
  const careerStart = career.lessons[0].path.replace(/^phases\//, '/lessons/') + '/';
  const cases = [
    { name: 'static core', pathname: '/lessons/00-setup-and-tooling/01-dev-environment/', path: corePath },
    { name: 'legacy core', pathname: '/lesson.html?path=' + corePath, path: corePath },
    { name: 'static learningPath', pathname: '/lessons/00-setup-and-tooling/01-dev-environment/?learningPath=' + learningPath.id, path: corePath, learningPath },
    { name: 'static career path', pathname: careerStart + '?learningPath=' + career.id, path: career.lessons[0].path, learningPath: career },
    { name: 'certification track', pathname: '/lesson?path=' + track.lessons[0].path + '&track=' + track.id, path: track.lessons[0].path, track },
  ];
  let checked = 0;
  for (const mode of cases) {
    const sidebar = { innerHTML: '' };
    const context = vm.createContext({
      PHASES: data.PHASES, document: { getElementById: () => sidebar, createElement() {
        return { set textContent(value) { this.innerHTML = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); } };
      } },
      currentPhaseIndex: 0, currentLessonSlug: '01-dev-environment', lessonPath: mode.path,
      learningPathMode: !!mode.learningPath, learningPath: mode.learningPath,
      certificationMode: !!mode.track, certificationSupplementalMode: false, certificationTrack: mode.track,
      flatLessons: mode.track ? mode.track.lessons.map(lesson => ({ ...lesson, lessonName: lesson.title }))
        : mode.learningPath ? mode.learningPath.lessons.map(lesson => ({ ...lesson, lessonName: lesson.name || lesson.title || lesson.path })) : [],
      lessonProgressClass: () => '', learningPathGateClass: () => '', learningPathGateAttributes: () => '',
    });
    vm.runInContext(['escapeHtml', 'lessonHref', 'learningPathLessonHref', 'extractPhaseSlug', 'extractLessonSlug', 'buildSidebar'].map(actualFunction).join('\n') + '\nbuildSidebar();', context);
    const urls = [...sidebar.innerHTML.matchAll(/href="([^"]+)"/g)].map(match => new URL(match[1].replace(/&amp;/g, '&'), origin + mode.pathname));
    assert.ok(urls.length > 0, mode.name);
    if (mode.learningPath) assert.equal(urls[0].pathname, mode.learningPath.kind === 'career-route' ? '/learning-paths.html' : '/catalog.html');
    for (const url of urls) {
      assert.equal(url.origin, origin); assert.ok(!url.pathname.includes('/catalog.html') || url.pathname === '/catalog.html', url.href);
      const response = await fetch(url, { headers: { Accept: 'text/html' } });
      assert.equal(response.status, 200, `${mode.name}: ${url}`); assert.match(response.headers.get('content-type'), /text\/html/);
      const body = await response.text();
      if (mode.learningPath && mode.learningPath.kind === 'career-route' && url === urls[0]) assert.ok(body.includes('id="' + decodeURIComponent(url.hash.slice(1)) + '"'), url.href);
      checked++;
    }
  }
  assert.ok(checked > 40, `actual route checks: ${checked}`);
});
