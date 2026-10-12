const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, 'projects.js'), 'utf8');
const copySource = source.slice(source.indexOf('  function bindCopy('), source.indexOf('  function renderMarkdown('));

function setup(sharedMarkdown = false) {
  const status = { textContent: '', toggleAttribute() {} };
  const document = { activeElement: null };
  const button = {
    dataset: {},
    disabled: false,
    textContent: 'Copy',
    getAttribute(name) { return name === (sharedMarkdown ? 'data-code' : 'data-copy') ? 'python3 scripts/project_test.py example --stage 1' : null; },
    closest() { return { querySelector() { return status; } }; },
    focus() { document.activeElement = this; },
  };
  let handler;
  let settle;
  const calls = [];
  const context = {
    document,
    navigator: { clipboard: { writeText(text) {
      calls.push(text);
      return new Promise(resolve => { settle = resolve; });
    } } },
    fallbackCopy() { return false; },
    clearTimeout() {},
    setTimeout() {},
    scope: { addEventListener(_event, listener) { handler = listener; } },
  };
  vm.runInNewContext(copySource + '\nbindCopy(scope);', context);
  return {
    button, document, status, calls,
    click() { return handler({ target: { closest(selector) {
      if (sharedMarkdown) assert.ok(selector.includes('.code-copy'));
      return button;
    } } }); },
    finish() { settle(); },
  };
}

test('copy completion preserves keyboard focus without disabling the button', async () => {
  const state = setup();
  state.button.focus();
  const pending = state.click();
  assert.equal(state.button.disabled, false);
  assert.equal(state.document.activeElement, state.button);
  state.finish();
  await pending;
  assert.equal(state.document.activeElement, state.button);
  assert.equal(state.button.textContent, '已复制');
  assert.equal(state.status.textContent, '命令已复制。');
});

test('a delayed copy never takes focus back from another control', async () => {
  const state = setup();
  state.button.focus();
  const pending = state.click();
  const nextControl = { id: 'next-copy-button' };
  state.document.activeElement = nextControl;
  state.finish();
  await pending;
  assert.equal(state.document.activeElement, nextControl);
});

test('repeated activation waits for the existing copy and then allows another', async () => {
  const state = setup();
  const pending = state.click();
  await state.click();
  assert.equal(state.calls.length, 1);
  state.finish();
  await pending;
  const second = state.click();
  assert.equal(state.calls.length, 2);
  assert.equal(state.calls[0], 'python3 scripts/project_test.py example --stage 1');
  state.finish();
  await second;
});

test('shared MDRender code-copy buttons use data-code with the same accessible copy handler', async () => {
  const state = setup(true);
  const pending = state.click();
  state.finish();
  await pending;
  assert.equal(state.calls[0], 'python3 scripts/project_test.py example --stage 1');
  assert.equal(state.button.textContent, '已复制');
  assert.equal(state.status.textContent, '命令已复制。');
});
