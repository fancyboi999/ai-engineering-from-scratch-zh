const assert = require('node:assert/strict');
const test = require('node:test');
const { withDiscovery } = require('./build-agents');

const HEADING = '## API 与 MCP';
const source = [
  '# AI Engineering from Scratch · 简体中文版',
  '',
  '> 一套免费、开源的 AI 工程课程。',
  '',
  'Canonical site: https://aieng-zh.cn',
  'Source: https://github.com/fancyboi999/ai-engineering-from-scratch-zh',
  '',
  '## 开发者资源',
  '- [开发者文档](https://aieng-zh.cn/developer.html)',
  '',
].join('\n');

const lines = (text) => text.split('\n');
const count = (text, line) => lines(text).filter((value) => value === line).length;

test('the discovery section follows the summary and precedes the first file list', () => {
  const out = withDiscovery(source);
  const all = lines(out);
  assert.equal(all[0], '# AI Engineering from Scratch · 简体中文版');
  assert.equal(all.findIndex((line) => line.startsWith('## ')), all.indexOf(HEADING));
  assert.ok(all.findIndex((line) => line.startsWith('> ')) < all.indexOf(HEADING));
  assert.ok(all.indexOf('Source: https://github.com/fancyboi999/ai-engineering-from-scratch-zh') < all.indexOf(HEADING));
  assert.ok(all.indexOf(HEADING) < all.indexOf('## 开发者资源'));
  assert.equal(count(out, HEADING), 1);
  assert.match(out, /\]\(https:\/\/aieng-zh\.cn\/docs\)/);
  assert.match(out, /\]\(https:\/\/aieng-zh\.cn\/openapi\.json\)/);
  assert.match(out, /\]\(https:\/\/aieng-zh\.cn\/server\.json\)/);
  assert.equal(out.replace(/## API 与 MCP\n\n(?:- .*\n)+\n/, ''), source);
});

test('a second agent build leaves llms.txt unchanged', () => {
  const once = withDiscovery(source);
  assert.equal(withDiscovery(once), once);
  assert.equal(count(withDiscovery(withDiscovery(once)), HEADING), 1);
});

test('a file without file lists gets the section at the end', () => {
  const out = withDiscovery('# Title\n\n> Summary.\n');
  assert.ok(out.startsWith('# Title\n\n> Summary.\n\n' + HEADING + '\n'));
  assert.equal(withDiscovery(out), out);
});
