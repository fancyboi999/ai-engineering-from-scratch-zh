const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { once } = require('node:events');

// 验证 --standalone 的真实函数文件，不模拟 Vercel 路由或 CDN。
async function main() {
  const output = path.resolve(process.argv[2] || path.join(__dirname, '../.vercel/output'));
  const functions = path.join(output, 'functions');
  const names = ['api/v1/catalog', 'api/v1/resource', 'api/mcp', 'api/markdown', 'api/v1/markdown', 'api/lesson', 'api/certification'];
  const handlers = {};
  const hashes = [];
  for (const name of names) {
    const directory = path.join(functions, name + '.func');
    const config = JSON.parse(fs.readFileSync(path.join(directory, '.vc-config.json'), 'utf8'));
    assert.equal(config.runtime, 'nodejs24.x');
    assert.equal(Object.keys(config.filePathMap || {}).length, 0, 'Use vercel build --prod --standalone');
    const filename = path.join(directory, config.handler);
    handlers['/' + name] = require(filename);
    if (name.includes('markdown')) {
      for (const page of ['index', 'developer', 'glossary', 'prereqs']) assert.ok(fs.statSync(path.join(directory, 'site/agent-pages', page + '.md')).size > 200);
    } else if (name === 'api/lesson' || name === 'api/certification') {
      const page = name.split('/')[1];
      assert.ok(fs.statSync(path.join(directory, 'site', page + '.html')).size > 200);
      assert.ok(fs.statSync(path.join(directory, 'site', page + '-seo.json')).size > 200);
    } else {
      const content = fs.readFileSync(path.join(directory, 'generated/agent-content.json'));
      assert.ok(JSON.parse(content).length >= 595);
      hashes.push(crypto.createHash('sha256').update(content).digest('hex'));
    }
  }
  assert.equal(new Set(hashes).size, 1, 'All resource handlers must contain the same published snapshot');
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    req.query = Object.fromEntries(url.searchParams);
    const handler = handlers[url.pathname];
    if (!handler) { res.writeHead(404); res.end(); return; }
    if (typeof handler === 'function') await handler(req, res);
    else {
      const request = new Request(url, { method: req.method, headers: req.headers, ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body: req, duplex: 'half' }) });
      const response = await handler.fetch(request, { socket: req.socket });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const catalog = await fetch(base + '/api/v1/catalog?limit=1');
    assert.equal(catalog.status, 200);
    const entry = (await catalog.json()).items[0];
    const resource = await fetch(base + '/api/v1/resource?path=' + encodeURIComponent(entry.path));
    assert.equal(resource.status, 200);
    assert.match((await resource.json()).markdown, /学习目标/);
    for (const name of ['api/markdown', 'api/v1/markdown']) {
      const markdown = await fetch(`${base}/${name}?path=/glossary`, { headers: { Accept: 'text/markdown' } });
      assert.equal(markdown.status, 200); assert.match(await markdown.text(), /实际含义/);
    }
    const mcp = await fetch(base + '/api/mcp', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_curriculum', arguments: { limit: 1 } } }),
    });
    assert.equal(mcp.status, 200);
    assert.equal((await mcp.json()).result.structuredContent.items.length, 1);
    const lesson = await fetch(base + '/api/lesson?path=' + encodeURIComponent('phases/00-setup-and-tooling/01-dev-environment'));
    assert.equal(lesson.status, 200); assert.match(await lesson.text(), /https:\/\/aieng-zh\.cn\/lessons\//);
    const certManifest = JSON.parse(fs.readFileSync(path.join(functions, 'api/certification.func/site/certification-seo.json'), 'utf8'));
    const track = Object.keys(certManifest.tracks)[0];
    const certification = await fetch(base + '/api/certification?id=' + encodeURIComponent(track));
    assert.equal(certification.status, 200); assert.match(await certification.text(), /https:\/\/aieng-zh\.cn\/certification/);
    console.log('standalone function bundles: 7/7 passed; snapshots, Markdown, REST, MCP and existing readers loaded from compiled artifacts');
  } finally {
    server.closeAllConnections(); server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
