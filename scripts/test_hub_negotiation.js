'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { createServer } = require('./serve-agent-site');
const markdown = require('../api/markdown');
const site = path.resolve(__dirname, '../site');
const manifest = JSON.parse(fs.readFileSync(path.join(site, 'hub-pages.json'), 'utf8'));

async function listen(t) {
  const server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return `http://127.0.0.1:${server.address().port}`;
}

for (const route of ['/phase/setup-and-tooling', '/glossary/attention']) {
  test(`${route}: real GET/HEAD use shared Accept qualities, explicit rejection and Vary`, async t => {
    const base = await listen(t);
    const cases = [
      ['*/*', 200, 'text/html'], ['text/html, text/markdown;q=0', 200, 'text/html'],
      ['text/html;q=1, text/markdown;q=0.1', 200, 'text/html'],
      ['text/html, text/markdown;q=.1', 200, 'text/html'],
      ['text/html;q=0.1, text/markdown;q=1', 200, 'text/markdown'],
      ['text/html, text/markdown', 200, 'text/markdown'],
      ['text/markdown;q=0, */*;q=1', 200, 'text/html'],
      ['text/html;q=0, text/markdown;q=0', 406, 'application/problem+json'],
      ['application/json', 406, 'application/problem+json'],
    ];
    for (const [accept, status, type] of cases) {
      const get = await fetch(base + route, { headers: { Accept: accept } });
      assert.equal(get.status, status, accept);
      assert.ok(get.headers.get('content-type').startsWith(type), accept);
      assert.equal(get.headers.get('vary'), 'Accept, Accept-Encoding');
      assert.equal(get.headers.get('content-language'), 'zh-CN');
      const body = await get.text();
      if (status === 200) {
        const page = manifest.pages[route];
        assert.equal(body, fs.readFileSync(path.join(site, type === 'text/html' ? page.html : page.markdown), 'utf8'));
        if (type === 'text/html') assert.ok(body.includes(`href="https://aieng-zh.cn${route}"`));
      } else { assert.equal(JSON.parse(body).code, 'representation_not_supported'); assert.equal(get.headers.get('cache-control'), 'no-store'); }
      const head = await fetch(base + route, { method: 'HEAD', headers: { Accept: accept } });
      assert.equal(head.status, status); assert.equal(await head.text(), '');
      for (const key of ['content-type', 'content-length', 'cache-control', 'vary', 'content-language']) assert.equal(head.headers.get(key), get.headers.get(key), key);
    }
    const post = await fetch(base + route, { method: 'POST' });
    assert.equal(post.status, 405); assert.equal(post.headers.get('allow'), 'GET, HEAD');
  });
}

test('all 245 source-generated Hub routes and unknown paths remain a finite allowlist', async t => {
  const base = await listen(t);
  assert.equal(Object.keys(manifest.pages).length, 245);
  for (const [route, page] of Object.entries(manifest.pages)) {
    const response = await fetch(base + route, { headers: { Accept: 'text/markdown' } });
    assert.equal(response.status, 200, route);
    assert.equal(await response.text(), fs.readFileSync(path.join(site, page.markdown), 'utf8'), route);
  }
  for (const route of ['/phase/no-such-phase', '/glossary/no-such-term']) {
    for (const accept of ['text/html', 'text/markdown', 'application/json']) {
      const response = await fetch(base + route, { headers: { Accept: accept } });
      assert.equal(response.status, 404, route); assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  }
});

function invoke(handler, value) {
  const headers = {}; let body = '';
  const res = { setHeader(key, v) { headers[key] = v; }, end(v) { body = v || ''; } };
  handler({ method: 'GET', headers: { accept: 'application/json' }, query: { path: value } }, res);
  return { status: res.statusCode, headers, body };
}

test('Hub registry fails closed and unsafe user paths never select arbitrary filesystem files', () => {
  let reads = 0;
  const handler = markdown.createHandler({ readHubPages() { reads++; return manifest; } });
  for (const unsafe of ['/phase/../../README.md', '/glossary/%2e%2e/.env', '/phase//etc/passwd', 'constructor', '__proto__', '/glossary/x?file=/etc/passwd']) {
    assert.equal(invoke(handler, unsafe).status, 404, unsafe);
  }
  assert.equal(reads, 0);
  assert.equal(invoke(handler, ['/phase/setup-and-tooling', '/phase/math-foundations']).status, 400);
  for (const invalid of [null, { pages: [] }, { pages: { '/phase/test': { html: '../../.env', markdown: '/etc/passwd' } } }]) {
    const result = invoke(markdown.createHandler({ readHubPages: () => invalid }), '/phase/test');
    assert.equal(result.status, 503); assert.equal(result.headers['Cache-Control'], 'no-store');
  }
});
