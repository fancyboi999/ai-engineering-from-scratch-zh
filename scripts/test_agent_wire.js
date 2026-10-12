const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { once } = require('node:events');
const { createServer } = require('./serve-agent-site');
const { PAGES, ORIGIN } = require('../lib/agent-content');
const { createLimiter } = require('../lib/agent-http');
const catalog = require('../api/v1/catalog');
const schemas = require('../lib/agent-schemas');
const spec = require('../site/openapi.json');

async function listen(server, t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}`;
}

function rpc(base, message, extra = {}) {
  return fetch(base + '/mcp', {
    method: 'POST', headers: {
      'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-11-25', ...extra,
    }, body: typeof message === 'string' ? message : JSON.stringify(message),
  });
}

test('real HTTP serves navigation representations, discovery aliases, static lessons and API recovery', async t => {
  const base = await listen(createServer(), t);
  for (const [route, filename] of Object.entries(PAGES)) {
    const html = await fetch(base + route);
    assert.equal(html.status, 200, route);
    assert.match(html.headers.get('content-type'), /text\/html/, route);
    assert.equal(await html.text(), fs.readFileSync(path.join(__dirname, '../site', filename), 'utf8'), route);
    const markdown = await fetch(base + route, { headers: { Accept: 'text/markdown' } });
    assert.equal(markdown.status, 200, route);
    assert.match(markdown.headers.get('content-type'), /text\/markdown/, route);
    assert.match(markdown.headers.get('vary'), /Accept/, route);
    const body = await markdown.text();
    assert.ok(body.length > 200, route);
    assert.doesNotMatch(body, /<script|<!DOCTYPE|aiengineeringfromscratch\.com/i, route);
    const head = await fetch(base + route, { method: 'HEAD', headers: { Accept: 'text/markdown' } });
    assert.equal(head.status, 200, route); assert.equal(await head.text(), '');
  }
  for (const route of ['/server.json', '/.well-known/mcp.json', '/api/openapi.json', '/openapi.json']) {
    const response = await fetch(base + route); assert.equal(response.status, 200, route);
    const json = await response.json();
    assert.equal(route.includes('openapi') ? json.servers[0].url : json.remotes[0].url, route.includes('openapi') ? ORIGIN : ORIGIN + '/mcp');
  }
  for (const accept of ['*/*', 'text/html', 'application/json']) {
    const response = await fetch(base + '/api/v2/no-such-endpoint', { headers: { Accept: accept } });
    assert.equal(response.status, 404); assert.match(response.headers.get('content-type'), /application\/problem\+json/);
    assert.equal((await response.json()).code, 'resource_not_found');
  }
  const missing = await fetch(base + '/api/v1/markdown?path=/missing', { headers: { Accept: 'text/markdown' } });
  assert.equal(missing.status, 404); assert.match(await missing.text(), /课程索引/);
  const staticLesson = await fetch(base + '/lessons/00-setup-and-tooling/13-python-for-ai-engineering/');
  assert.equal(staticLesson.status, 200); assert.match(await staticLesson.text(), /列表对比生成器|AI 工程的 Python 基础/);
  const legacy = await fetch(base + '/lesson.html?path=phases%2F00-setup-and-tooling%2F01-dev-environment', { redirect: 'manual' });
  assert.equal(legacy.status, 200);
  assert.match(await legacy.text(), /md-render\.js/);
});

test('real REST wire preserves Chinese source, GET/HEAD parity and typed error paths', async t => {
  const base = await listen(createServer(), t);
  const response = await fetch(base + '/api/v1/catalog?q=attention&limit=1');
  assert.equal(response.status, 200);
  const result = await response.json(); assert.equal(result.items.length, 1);
  assert.ok(!Object.hasOwn(result.items[0], 'markdown'));
  const sourcePath = result.items[0].path;
  const read = await fetch(base + '/api/v1/resource?path=' + encodeURIComponent(sourcePath));
  assert.equal(read.status, 200);
  const entry = await read.json();
  assert.equal(entry.markdown, fs.readFileSync(path.join(__dirname, '..', sourcePath, 'docs/zh.md'), 'utf8'));
  assert.match(entry.sourceUrl, /fancyboi999\/ai-engineering-from-scratch-zh\/blob\/main\/.*\/docs\/zh\.md$/);
  assert.equal(read.headers.get('ratelimit'), null);
  const head = await fetch(base + '/api/v1/resource?path=' + encodeURIComponent(sourcePath), { method: 'HEAD' });
  assert.equal(head.status, 200); assert.equal(await head.text(), '');
  for (const header of ['content-type', 'content-length', 'cache-control', 'vary', 'x-api-version', 'link']) assert.equal(head.headers.get(header), read.headers.get(header));
  for (const [suffix, status] of [
    ['/api/v1/catalog?limit=1&limit=2', 400], ['/api/v1/catalog?limit=51', 400],
    ['/api/v1/resource?path=../../.env', 404], ['/api/v1/resource?path=__proto__', 404],
    ['/api/v1/resource?path=' + encodeURIComponent(sourcePath) + '&lang=en', 400],
    ['/api/v1/markdown?path=/about&path=/catalog', 400],
  ]) {
    const bad = await fetch(base + suffix); assert.equal(bad.status, status, suffix);
    assert.match(bad.headers.get('content-type'), /application\/problem\+json/, suffix);
    assert.equal(bad.headers.get('cache-control'), 'no-store', suffix);
  }
  const rejected = await fetch(base + '/api/v1/catalog', { headers: { Accept: 'application/json;q=0, */*' } });
  assert.equal(rejected.status, 406);
});

test('real MCP transport initializes, searches, reads and rejects unsafe or oversized requests', async t => {
  const base = await listen(createServer(), t);
  const init = await rpc(base, { jsonrpc: '2.0', id: 1, method: 'initialize', params: {
    protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'wire-test', version: '1' },
  } });
  assert.equal(init.status, 200);
  assert.equal((await init.json()).result.serverInfo.name, 'ai-engineering-from-scratch-zh');
  assert.equal(init.headers.get('mcp-session-id'), null);
  const notification = await rpc(base, { jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal(notification.status, 202); assert.equal(await notification.text(), '');
  const tools = await rpc(base, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  assert.equal((await tools.json()).result.tools.length, 2);
  const search = await rpc(base, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search_curriculum', arguments: { q: 'Python', limit: 1 } } });
  const entry = (await search.json()).result.structuredContent.items[0];
  const read = await rpc(base, { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'read_resource', arguments: { path: entry.path, lang: 'zh' } } });
  const content = (await read.json()).result;
  assert.deepEqual(JSON.parse(content.content[0].text), content.structuredContent);
  assert.match(content.structuredContent.markdown, /学习目标/);
  const rejectedOrigin = await rpc(base, { jsonrpc: '2.0', id: 5, method: 'ping' }, { Origin: 'https://evil.example' });
  assert.equal(rejectedOrigin.status, 403);
  const invalid = await rpc(base, '{'); assert.equal(invalid.status, 400); assert.equal((await invalid.json()).error.code, -32700);
  const oversized = await rpc(base, ' '.repeat(65537)); assert.equal(oversized.status, 413);
  const get = await fetch(base + '/mcp'); assert.equal(get.status, 405); assert.equal(get.headers.get('allow'), 'POST');
});

test('navigation Markdown includes every published lesson, glossary definition and prerequisite edge', async t => {
  const vm = require('node:vm');
  const data = vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site/data.js'), 'utf8') + ';({PHASES,GLOSSARY,ROADMAP_PREREQS})');
  const manifest = require('../site/lesson-seo.json');
  const base = await listen(createServer(), t);
  const readMarkdown = async route => {
    const response = await fetch(base + route, { headers: { Accept: 'text/markdown' } });
    assert.equal(response.status, 200, route);
    return response.text();
  };
  for (const route of ['/', '/catalog']) {
    const body = await readMarkdown(route);
    const linked = new Set([...body.matchAll(/https:\/\/aieng-zh\.cn\/lessons\/([^\s)]+)\//g)].map(match => 'phases/' + match[1]));
    const expected = Object.keys(manifest.lessons).filter(key => key.startsWith('phases/'));
    assert.deepEqual([...linked].sort(), expected.sort(), route);
    for (const phase of data.PHASES) assert.ok(body.includes(phase.name), phase.name);
  }
  const glossary = await readMarkdown('/glossary');
  assert.match(glossary, new RegExp(`${data.GLOSSARY.length} 个术语`));
  for (const term of data.GLOSSARY) {
    assert.ok(glossary.includes(term.means), term.term);
    assert.ok(glossary.includes('/glossary.html#' + term.slug), term.term);
  }
  assert.doesNotMatch(glossary, /正在加载|0\s+已索引术语/);
  const roadmap = await readMarkdown('/roadmap');
  for (const phase of data.PHASES) {
    const section = roadmap.split(`## 阶段 ${String(phase.id).padStart(2, '0')}：`)[1]?.split('\n## ')[0];
    assert.ok(section, phase.name);
    const required = data.ROADMAP_PREREQS[phase.id] || [];
    for (const id of required) assert.ok(section.includes(`阶段 ${String(id).padStart(2, '0')}：${data.PHASES.find(p => p.id === id).name}`), `${id} -> ${phase.id}`);
    if (!required.length) assert.match(section, /前置阶段：无/);
  }
});

test('MCP negotiates only the implemented revision and rejects legacy or missing version headers', async t => {
  const base = await listen(createServer(), t);
  const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'version-test', version: '1' } } };
  const first = await fetch(base + '/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify(initialize) });
  assert.equal(first.status, 200); assert.equal((await first.json()).result.protocolVersion, '2025-11-25');
  const old = await rpc(base, [{ jsonrpc: '2.0', id: 2, method: 'ping' }], { 'MCP-Protocol-Version': '2025-03-26' });
  assert.equal(old.status, 400); assert.equal((await old.json()).code, 'unsupported_protocol_version');
  const missing = await fetch(base + '/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' }) });
  assert.equal(missing.status, 400); assert.equal((await missing.json()).code, 'unsupported_protocol_version');
  const batch = await rpc(base, [{ jsonrpc: '2.0', id: 4, method: 'ping' }]);
  assert.equal(batch.status, 400); assert.equal((await batch.json()).error.code, -32600);
  const latest = await rpc(base, { jsonrpc: '2.0', id: 5, method: 'ping' });
  assert.equal(latest.status, 200); assert.deepEqual((await latest.json()).result, {});
});

test('real quota enforcement returns 429 and bodyless HEAD', async t => {
  const handler = catalog.createHandler({ limit: createLimiter({ limit: 1, vercel: false }) });
  const base = await listen(http.createServer((req, res) => { req.query = {}; handler(req, res); }), t);
  assert.equal((await fetch(base)).status, 200);
  const blocked = await fetch(base); assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  assert.equal((await blocked.json()).code, 'rate_limit_exceeded');
  const head = await fetch(base, { method: 'HEAD' }); assert.equal(head.status, 429); assert.equal(await head.text(), '');
});

test('OpenAPI, MCP schemas and generated source snapshot have the same Chinese resource contract', () => {
  assert.deepEqual(spec.components.schemas.Resource, schemas.resource);
  assert.deepEqual(spec.components.schemas.SearchResults, schemas.searchOutput);
  const entries = require('../generated/agent-content.json');
  assert.equal(new Set(entries.map(entry => entry.path)).size, entries.length);
  for (const entry of entries) {
    assert.match(entry.url, /^https:\/\/aieng-zh\.cn\//);
    assert.match(entry.sourceUrl, /fancyboi999\/ai-engineering-from-scratch-zh/);
    assert.ok(entry.markdown.length > 100);
  }
  const llms = fs.readFileSync(path.join(__dirname, '../site/llms.txt'), 'utf8');
  assert.match(llms, /https:\/\/aieng-zh\.cn\/mcp/);
  assert.match(llms, /https:\/\/aieng-zh\.cn\/openapi\.json/);
});
