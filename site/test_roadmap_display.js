'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'roadmap.js'), 'utf8');
function definition(name) {
  const match = source.match(new RegExp('  function ' + name + '\\([^]*?\\n  \\}'));
  assert.ok(match, name); return match[0];
}
const context = vm.createContext({ NAME_MAX: 22, NODE_W: 210 });
vm.runInContext(['clipLine', 'splitName', 'fitNodeTitle'].map(definition).join('\n'), context);

test('roadmap.js long names retain a deterministic character cap and fit the existing node width', () => {
  for (const value of ['很长的中文阶段名称'.repeat(12), 'Very Long Mixed 中文 Engineering Delivery '.repeat(8)]) {
    const lines = context.splitName(value);
    for (const line of lines) {
      assert.ok(Array.from(line).length <= 22);
      const label = { textContent: line, getAttribute: () => line,
        getComputedTextLength() { return Array.from(this.textContent).length * 18.45; } };
      context.fitNodeTitle(label);
      assert.ok(label.getComputedTextLength() <= 182);
      assert.ok(label.textContent.endsWith('…'));
    }
  }
  for (const value of ['短名', 'Math']) {
    assert.deepEqual(Array.from(context.splitName(value)), [value.toUpperCase()]);
    const label = { textContent: value, getAttribute: () => value, getComputedTextLength: () => 50 };
    context.fitNodeTitle(label); assert.equal(label.textContent, value);
  }
});

test('roadmap.js unavailable, zero, NaN or throwing SVG measurements use a finite safe fallback', () => {
  const css = fs.readFileSync(path.join(__dirname, 'roadmap.css'), 'utf8');
  const rule = css.match(/\.roadmap-node-title\s*\{([^}]+)\}/)[1];
  assert.match(rule, /font-size:\s*18px/); assert.match(rule, /letter-spacing:\s*0\.45px/);
  for (const measurement of [undefined, () => 0, () => NaN, () => { throw Error('not attached'); }]) {
    const original = '中文长名'.repeat(10);
    const label = { textContent: original, getAttribute: () => original, getComputedTextLength: measurement };
    context.fitNodeTitle(label);
    assert.ok(Array.from(label.textContent).length * 18.45 <= 182);
    assert.ok(label.textContent.endsWith('…'));
    assert.ok(!/NaN|undefined/.test(label.textContent));
  }
});

test('roadmap.js actual init handles empty PHASES before graph validation, without NaN or an empty SVG', () => {
  const elements = new Map(); let init;
  const element = id => { if (!elements.has(id)) elements.set(id, { textContent: '', innerHTML: '' }); return elements.get(id); };
  const context = {
    PHASES: [], ROADMAP_PREREQS: {},
    localStorage: { getItem: () => null }, window: { matchMedia: () => ({ matches: false }) },
    document: { documentElement: { setAttribute() {} }, getElementById: element,
      createElement: () => ({ set textContent(value) { this.innerHTML = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;'); } }),
      addEventListener: (name, callback) => { if (name === 'DOMContentLoaded') init = callback; } },
  };
  vm.runInNewContext(source, context); init();
  assert.equal(element('roadmapPhaseCount').textContent, '0');
  assert.equal(element('roadmapLessonCount').textContent, '0');
  assert.equal(element('roadmapProgressCount').textContent, '0 / 0');
  assert.equal(element('roadmapNextPhase').textContent, '暂无阶段');
  assert.match(element('roadmapGraphWrap').innerHTML, /roadmap-graph-message.+还没有已发布的阶段。/);
  assert.doesNotMatch(element('roadmapGraphWrap').innerHTML, /svg|NaN|undefined/);
});
