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
  const names = ['api/v1/catalog', 'api/v1/resource', 'api/mcp', 'api/markdown', 'api/v1/markdown'];
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
    await handler(req, res);
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
    console.log('standalone function bundles: 5/5 passed; snapshots, Markdown, REST and MCP loaded from compiled artifacts');
  } finally {
    server.closeAllConnections(); server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
