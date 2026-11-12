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
const context = vm.createContext({ window: {} });
vm.runInContext(['esc', 'normalizePath', 'contentUrl', 'demoFigure'].map(helper).join('\n'), context);
const projects = vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'projects-data.js'), 'utf8') + '\nwindow.AIFS_PROJECTS.projects', { window: {} });

// 项目页与阶段页都是 /project/<id>/[<stage>/] 下的预渲染目录；素材地址必须从这两种深度都解析到站点里的真实文件。
function assertResolves(html, page, label) {
  const urls = [...html.matchAll(/(?:src|poster|data-gif|data-poster)="([^"]+)"/g)].map(match => match[1].replace(/&amp;/g, '&'));
  assert.ok(urls.length, label + ' has media');
  for (const url of urls) {
    const resolved = new URL(url, 'https://aieng-zh.cn' + page);
    assert.equal(resolved.origin, 'https://aieng-zh.cn', label + ' ' + url);
    const file = path.join(__dirname, decodeURIComponent(resolved.pathname));
    assert.ok(fs.existsSync(file), `${label}: ${url} on ${page} resolves to missing ${resolved.pathname}`);
  }
}

test('project and stage demo media resolve to real files from their prerendered routes', () => {
  let checked = 0;
  for (const project of projects) {
    const base = project.contentBase || project.path;
    const projectPage = '/project/' + project.id + '/';
    for (const demo of project.demos || []) {
      assertResolves(context.demoFigure(demo, base), projectPage, project.id);
      checked++;
    }
    for (const stage of project.stages || []) {
      if (!stage.demo) continue;
      const html = context.demoFigure(stage.demo, base);
      assertResolves(html, projectPage, project.id + '/' + stage.id);
      assertResolves(html, projectPage + stage.id + '/', project.id + '/' + stage.id);
      checked++;
    }
  }
  assert.ok(checked > 0);
});
