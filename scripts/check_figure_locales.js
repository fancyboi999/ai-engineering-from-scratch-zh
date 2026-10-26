#!/usr/bin/env node
'use strict';

// Validate the dictionaries before a malformed dynamic rule reaches a lesson.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const site = path.resolve(__dirname, '../site');
const directory = path.join(site, 'figure-locales');
const registry = {};
let figures = 0, exact = 0, patterns = 0, preserved = 0;
for (const filename of fs.readdirSync(directory).filter(file => file.endsWith('.js')).sort()) {
  const window = { AIFS_FIGURE_LOCALES: {} };
  vm.runInNewContext(fs.readFileSync(path.join(directory, filename), 'utf8'), { window }, { filename, timeout: 1000 });
  assert.deepEqual(Object.keys(window.AIFS_FIGURE_LOCALES), [filename], filename + ': provider namespace');
  assert.ok(fs.existsSync(path.join(site, filename)), filename + ': source provider exists');
  registry[filename] = window.AIFS_FIGURE_LOCALES[filename];
  for (const [name, entry] of Object.entries(registry[filename])) {
    const label = filename + ' / ' + name;
    assert.ok(entry && typeof entry === 'object', label);
    assert.ok(!Object.keys(entry).some(key => !['text', 'patterns', 'preserve'].includes(key)), label + ': unknown field');
    figures++;
    for (const [source, translated] of Object.entries(entry.text || {})) {
      assert.ok(source.trim() && typeof translated === 'string' && translated.trim(), label + ': nonempty text');
      assert.notEqual(source, translated, label + ': unchanged text belongs in preserve');
      exact++;
    }
    for (const rule of entry.patterns || []) {
      assert.equal(rule.length, 2, label + ': pattern and replacement');
      assert.ok(typeof rule[0] === 'string' && typeof rule[1] === 'string' && rule[1].trim(), label + ': pattern types');
      assert.ok(rule[0].startsWith('^') && rule[0].endsWith('$'), label + ': match a complete reader string');
      assert.ok(!['^.*$', '^.+$', '^(.*)$', '^(.+)$', '^([\\s\\S]*)$'].includes(rule[0]), label + ': no catch-all translation');
      new RegExp(rule[0]);
      patterns++;
    }
    for (const keep of entry.preserve || []) {
      assert.ok(typeof keep.text === 'string' && keep.text.trim() && typeof keep.reason === 'string' && keep.reason.trim(), label + ': literal needs a reason');
      assert.ok(!Object.prototype.hasOwnProperty.call(entry.text || {}, keep.text), label + ': cannot translate and preserve the same text');
      preserved++;
    }
  }
}
console.log(JSON.stringify({ providers: Object.keys(registry).length, figures, exact, patterns, preserved }));
