'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'projects.js'), 'utf8');
function helper(name) {
  const match = source.match(new RegExp('  function ' + name + '\\([^]*?\\n  \\}'));
  assert.ok(match, name); return match[0];
}
const phases = vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8') + '\nPHASES');
const context = vm.createContext({ PHASES: phases });
vm.runInContext(helper('esc') + '\n' + helper('prerequisiteHtml'), context);
const render = context.prerequisiteHtml;
const escape = context.esc;

test('renderProject uses the bounded prerequisite renderer for actual 71 strings and 54 course objects', () => {
  assert.match(source, /var prereqs = \(project\.prerequisites \|\| \[\]\)\.map\(prerequisiteHtml\)\.join\(''\)/);
  let strings = 0, courses = 0;
  const projects = vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'projects-data.js'), 'utf8') + '\nwindow.AIFS_PROJECTS.projects', { window: {} });
  for (const project of projects) for (const requirement of project.prerequisites || []) {
    const html = render(requirement);
    assert.doesNotMatch(html, /<li><\/li>|path="?\s*["&]|lesson\.html\?path=/, project.id);
    if (typeof requirement === 'string') {
      assert.equal(html, '<li>' + escape(requirement.trim()) + '</li>'); strings++;
    } else {
      const href = '/lessons/' + requirement.path.replace(/^phases\//, '') + '/';
      assert.equal(html, `<li><a href="${href}">${escape(requirement.title)}</a></li>`);
      assert.ok(fs.existsSync(path.join(__dirname, '..', requirement.path, 'docs/zh.md')), requirement.path);
      courses++;
    }
  }
  assert.equal(strings, 71); assert.equal(courses, 54);
  for (const file of ['project.html', 'projects.html']) assert.match(fs.readFileSync(path.join(__dirname, file), 'utf8'), /projects\.js\?v=20261019a/);
});

test('strings are escaped knowledge requirements, not fabricated links; invalid objects are explicit non-links', () => {
  const input = '中文 "引号" <img onerror="alert(1)"> & 知识';
  assert.equal(render(input), '<li>' + escape(input) + '</li>');
  for (const requirement of [null, {}, 7, '', { path: 'javascript:alert(1)', title: input },
    { path: 'https://example.com/', title: input }, { path: 'phases/no-course/no-lesson', title: input },
    { path: 'phases/00-setup-and-tooling/01-dev-environment' }, { path: '../../.env', title: input }]) {
    const html = render(requirement); assert.doesNotMatch(html, /<a|<img|<li><\/li>/);
    assert.ok(html.includes('前置要求信息无效') || html.includes(escape(input)));
  }
  const valid = { path: 'phases/00-setup-and-tooling/01-dev-environment', title: input };
  assert.equal(render(valid), `<li><a href="/lessons/00-setup-and-tooling/01-dev-environment/">${escape(input)}</a></li>`);
});
