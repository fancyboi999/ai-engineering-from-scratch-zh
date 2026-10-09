const assert = require('node:assert/strict');
const test = require('node:test');
const { init } = require('./intelligence-check');

function setup() {
  const attributes = new Map([['data-state', 'idle']]);
  const handlers = [];
  const button = {
    disabled: true,
    addEventListener(type, handler) {
      assert.equal(type, 'click');
      handlers.push(handler);
    },
  };
  const answer = { textContent: '一个非常非官方的测试。' };
  const hint = { textContent: '问一个大问题。得到一个小回答。' };
  const label = { textContent: '问问机器' };
  const sponsor = { hidden: true };
  const children = {
    '[data-intelligence-trigger]': button,
    '[data-intelligence-answer]': answer,
    '[data-intelligence-hint]': hint,
    '[data-intelligence-label]': label,
    '[data-intelligence-sponsor]': sponsor,
  };
  const card = {
    getAttribute(name) { return attributes.get(name) ?? null; },
    setAttribute(name, value) { attributes.set(name, value); },
    querySelector(selector) { return children[selector] ?? null; },
  };
  const doc = {
    querySelector(selector) {
      assert.equal(selector, '[data-intelligence-check]');
      return card;
    },
  };
  const environment = {
    reduced: false,
    matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return { matches: this.reduced };
    },
  };
  return {
    doc, card, button, answer, hint, label, sponsor, children, environment, handlers,
    click(detail = 1) { handlers.forEach(handler => handler({ detail })); },
  };
}

test('initialization enables the button without answering the question', () => {
  const state = setup();
  assert.equal(init(state.doc, state.environment), true);
  assert.equal(state.button.disabled, false);
  assert.equal(state.card.getAttribute('data-state'), 'idle');
  assert.equal(state.answer.textContent, '一个非常非官方的测试。');
  assert.equal(state.hint.textContent, '问一个大问题。得到一个小回答。');
  assert.equal(state.label.textContent, '问问机器');
});

test('pointer activation answers immediately and opts into decorative motion', () => {
  const state = setup();
  init(state.doc, state.environment);
  state.click();
  assert.equal(state.card.getAttribute('data-state'), 'answered');
  assert.equal(state.card.getAttribute('data-motion'), 'animate');
  assert.equal(state.card.getAttribute('data-check'), '1');
  assert.equal(state.card.getAttribute('data-dial'), '1');
  assert.equal(state.answer.textContent, '先定义“到了”。');
  assert.equal(state.hint.textContent, '在此期间，动手造点东西。');
  assert.equal(state.label.textContent, '再问一次');
  assert.equal(state.button.disabled, false);
});

test('keyboard activation answers immediately without motion', () => {
  const state = setup();
  init(state.doc, state.environment);
  state.click(0);
  assert.equal(state.card.getAttribute('data-motion'), 'instant');
  assert.equal(state.answer.textContent, '先定义“到了”。');
});

test('reduced motion is checked at each activation, including changes after initialization', () => {
  const state = setup();
  init(state.doc, state.environment);
  state.environment.reduced = true;
  state.click();
  assert.equal(state.card.getAttribute('data-motion'), 'instant');
  assert.equal(state.answer.textContent, '先定义“到了”。');
  state.environment.reduced = false;
  state.click();
  assert.equal(state.card.getAttribute('data-motion'), 'animate');
  assert.equal(state.answer.textContent, '先定义“智能”。');
});

test('repeated activation cycles replies while keeping a monotonic check count', () => {
  const state = setup();
  init(state.doc, state.environment);
  const expected = [
    ['先定义“到了”。', '在此期间，动手造点东西。'],
    ['先定义“智能”。', '一个不错的起点。'],
    ['反向传播仍然值得学。', '有些问题最好通过动手构建来回答。'],
    ['先定义“到了”。', '在此期间，动手造点东西。'],
  ];
  expected.forEach(([answer, hint], index) => {
    state.click();
    assert.equal(state.answer.textContent, answer);
    assert.equal(state.hint.textContent, hint);
    assert.equal(state.card.getAttribute('data-check'), String(index + 1));
    assert.equal(state.card.getAttribute('data-dial'), String(index % 3 + 1));
  });
});

test('missing or incomplete markup is safe and leaves the static button disabled', () => {
  assert.equal(init(null), false);
  assert.equal(init({ querySelector() { return null; } }), false);
  const state = setup();
  delete state.children['[data-intelligence-answer]'];
  assert.equal(init(state.doc, state.environment), false);
  assert.equal(state.button.disabled, true);
  assert.equal(state.handlers.length, 0);
});

test('initializing twice never duplicates handlers or resets the reply cycle', () => {
  const state = setup();
  init(state.doc, state.environment);
  state.click();
  assert.equal(init(state.doc, state.environment), false);
  assert.equal(state.handlers.length, 1);
  state.click();
  assert.equal(state.answer.textContent, '先定义“智能”。');
  assert.equal(state.card.getAttribute('data-check'), '2');
});

test('the optional button label and unavailable matchMedia do not prevent activation', () => {
  const state = setup();
  delete state.children['[data-intelligence-label]'];
  assert.equal(init(state.doc, {}), true);
  state.click();
  assert.equal(state.answer.textContent, '先定义“到了”。');
  assert.equal(state.card.getAttribute('data-motion'), 'animate');
});

test('the sponsor link appears after the second answer and stays', () => {
  const state = setup();
  init(state.doc, state.environment);
  state.click();
  assert.equal(state.sponsor.hidden, true);
  state.click();
  assert.equal(state.sponsor.hidden, false);
  state.click();
  assert.equal(state.sponsor.hidden, false);
});

test('a card without the sponsor link still answers', () => {
  const state = setup();
  delete state.children['[data-intelligence-sponsor]'];
  assert.equal(init(state.doc, state.environment), true);
  state.click();
  state.click();
  assert.equal(state.answer.textContent, '先定义“智能”。');
});
