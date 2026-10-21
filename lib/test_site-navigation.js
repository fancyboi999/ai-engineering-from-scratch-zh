'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeHeaderNavigation } = require('./site-navigation');

test('rebuilding a utility page preserves theme ownership and narration opt-out', () => {
  const source = '<head></head><link href="/style.css" rel="stylesheet"><header class="site-header"><div class="header-inner"><a class="logo" href="/">Old</a><nav class="header-nav"><a href="/catalog.html" aria-current="page">课程表</a></nav></div></header><body></body>';
  const first = normalizeHeaderNavigation(source);
  assert.match(first, /data-header-theme-owner="header"/);
  assert.match(first, /data-header-narration="off"/);
  assert.match(first, /fonts\.googleapis\.com\/css2\?family=VT323/);
  assert.match(first, /id="header-theme-bootstrap"/);
  assert.match(first, /href="\/catalog.html"[^>]*aria-current="page"/);
  assert.equal(normalizeHeaderNavigation(first), first);
  assert.equal((first.match(/src="\/header.js/g) || []).length, 1);
});

test('rebuilding a reader preserves its page theme handler and relative asset root', () => {
  const source = '<link href="../style.css" rel="stylesheet"><header class="site-header"><nav class="header-nav"></nav><button id="themeToggle"></button></header><body></body>';
  const result = normalizeHeaderNavigation(source);
  assert.match(result, /data-header-theme-owner="page"/);
  assert.match(result, /data-header-narration="auto"/);
  assert.match(result, /href="..\/index.html"/);
  assert.match(result, /src="..\/header.js/);
  assert.equal(normalizeHeaderNavigation(result), result);
});


test('the shared navigation exposes local highlights on nested reader pages', () => {
  const { renderNavigation } = require('./site-navigation');
  const html = renderNavigation('/');
  assert.match(html, /href="\/highlights.html" data-header-page="highlights">我的高亮<\/a>/);
});
