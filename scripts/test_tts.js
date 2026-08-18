#!/usr/bin/env node
/* Regression coverage for site/tts.js without a browser dependency. */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class EventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener, capture) {
    const list = this.listeners.get(type) || [];
    list.push({ listener, capture: !!capture });
    this.listeners.set(type, list);
  }

  removeEventListener(type, listener, capture) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter((entry) =>
      entry.listener !== listener || entry.capture !== !!capture
    ));
  }

  dispatch(type, event) {
    const list = (this.listeners.get(type) || []).slice();
    for (const entry of list) entry.listener(event || { type, target: this });
  }
}

class ClassList {
  constructor() {
    this.values = new Set();
  }

  add(...values) {
    values.forEach((value) => this.values.add(value));
  }

  remove(...values) {
    values.forEach((value) => this.values.delete(value));
  }

  toggle(value, force) {
    const enabled = force === undefined ? !this.values.has(value) : !!force;
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }

  contains(value) {
    return this.values.has(value);
  }
}

class Element extends EventTarget {
  constructor(document, tagName) {
    super();
    this.document = document;
    this.tagName = tagName;
    this.nodeType = 1;
    this.parentNode = null;
    this.children = [];
    this.childNodes = [];
    this.classList = new ClassList();
    this.attributes = new Map();
    this.style = {};
    this.textContent = '';
    this.hidden = false;
    this.offsetParent = {};
    this.offsetWidth = 160;
    this.offsetHeight = 40;
    this._id = '';
    this._className = '';
    this._queries = new Map();
  }

  set id(value) {
    this._id = value;
    if (value) this.document.byId.set(value, this);
  }

  get id() {
    return this._id;
  }

  set className(value) {
    this._className = value;
    value.split(/\s+/).filter(Boolean).forEach((item) => this.classList.add(item));
  }

  get className() {
    return this._className;
  }

  set innerHTML(value) {
    this._innerHTML = value;
    if (this.id === 'ttsBar') this.createBarControls();
  }

  get innerHTML() {
    return this._innerHTML || '';
  }

  createBarControls() {
    const make = (tag, selector, id, action) => {
      const element = new Element(this.document, tag);
      element.parentNode = this;
      if (id) element.id = id;
      if (action) element.setAttribute('data-tts', action);
      this.children.push(element);
      this._queries.set(selector, element);
      return element;
    };
    make('span', '#ttsStatus', 'ttsStatus');
    make('button', '[data-tts="playpause"]', '', 'playpause');
    make('select', '#ttsRate', 'ttsRate');
    make('select', '#ttsVoice', 'ttsVoice');
    make('button', '[data-tts="collapse"]', '', 'collapse');
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this.document.register(child);
    return child;
  }

  insertBefore(child) {
    return this.appendChild(child);
  }

  querySelector(selector) {
    return this._queries.get(selector) || null;
  }

  querySelectorAll() {
    return [];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  matches(selector) {
    return selector.split(',').some((part) => {
      const value = part.trim();
      if (!value) return false;
      if (value === this.tagName) return true;
      if (value[0] === '.') return this.classList.contains(value.slice(1));
      if (value === '[data-tts]') return this.attributes.has('data-tts');
      const action = /^\[data-tts="(.+)"\]$/.exec(value);
      return !!action && this.getAttribute('data-tts') === action[1];
    });
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (node.matches && node.matches(selector)) return node;
      node = node.parentNode;
    }
    return null;
  }

  contains(node) {
    for (let current = node; current; current = current.parentNode) {
      if (current === this) return true;
    }
    return false;
  }

  getClientRects() {
    return [{}];
  }

  getBoundingClientRect() {
    return { top: 100, bottom: 140, left: 20, width: 160, height: 40 };
  }

  scrollIntoView() {}
}

class Document extends EventTarget {
  constructor() {
    super();
    this.byId = new Map();
    this.documentElement = { lang: 'zh-CN', clientWidth: 1280 };
    this.body = new Element(this, 'body');
    this.readyState = 'loading';
    this.themeParent = new Element(this, 'header');
    this.theme = new Element(this, 'button');
    this.theme.className = 'theme-toggle';
    this.themeParent.appendChild(this.theme);
    this.blocks = ['第一段用于朗读。', '第二段用于朗读。', '第三段用于朗读。'].map((text) => {
      const block = new Element(this, 'p');
      block.textContent = text;
      return block;
    });
    this.article = new Element(this, 'article');
    this.article.className = 'lesson-article';
    this.article.textContent = this.blocks.map((block) => block.textContent).join(' ') +
      ' 这是一段足够长的测试正文，用于满足页面朗读器的最小内容阈值。';
    this.article.querySelectorAll = () => this.blocks;
    this.blocks.forEach((block) => {
      block.parentNode = this.article;
    });
  }

  register(element) {
    if (element.id) this.byId.set(element.id, element);
    element.children.forEach((child) => this.register(child));
  }

  createElement(tagName) {
    return new Element(this, tagName);
  }

  getElementById(id) {
    return this.byId.get(id) || null;
  }

  querySelector(selector) {
    if (selector === '.theme-toggle') return this.theme;
    if (selector === '.lesson-article') return this.article;
    return null;
  }

  contains(element) {
    return this.article.contains(element) || this.body.contains(element) || this.themeParent.contains(element);
  }
}

class Storage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

class Utterance {
  constructor(text) {
    this.text = text;
  }
}

function boot() {
  const document = new Document();
  const timers = [];
  const intervals = new Map();
  let timerId = 0;
  const voice = { name: 'Test Chinese Voice', lang: 'zh-CN', voiceURI: 'test-zh', default: true };
  const synth = {
    spoken: [],
    speaking: false,
    cancelCount: 0,
    getVoices: () => [voice],
    addEventListener: () => {},
    speak(utterance) {
      this.spoken.push(utterance);
      this.speaking = true;
    },
    cancel() {
      this.cancelCount++;
      this.speaking = false;
    },
    pause() {
      this.speaking = false;
    },
    resume() {
      this.speaking = true;
    },
  };
  const window = new EventTarget();
  window.speechSynthesis = synth;
  window.SpeechSynthesisUtterance = Utterance;
  window.innerHeight = 900;
  window.innerWidth = 1280;
  window.pageYOffset = 0;
  window.pageXOffset = 0;
  window.matchMedia = () => ({ matches: false });
  window.getSelection = () => ({ isCollapsed: true, rangeCount: 0 });
  const context = {
    window,
    document,
    navigator: { userAgent: 'Firefox' },
    localStorage: new Storage(),
    sessionStorage: new Storage(),
    SpeechSynthesisUtterance: Utterance,
    Node: { DOCUMENT_POSITION_FOLLOWING: 4 },
    console,
    setInterval(callback) {
      const id = ++timerId;
      intervals.set(id, callback);
      return id;
    },
    clearInterval(id) { intervals.delete(id); },
    setTimeout(callback) {
      const id = ++timerId;
      timers.push({ id, callback });
      return id;
    },
    clearTimeout(id) {
      const index = timers.findIndex((timer) => timer.id === id);
      if (index !== -1) timers.splice(index, 1);
    },
  };
  const sourcePath = path.join(__dirname, '..', 'site', 'tts.js');
  const source = fs.readFileSync(sourcePath, 'utf8').replace(
    '  if (document.readyState === \'loading\') {',
    '  window.__ttsTestApi = { state: state, els: els, start: start, stop: stop, jump: jump };\n\n  if (document.readyState === \'loading\') {'
  );
  assert.notStrictEqual(source.indexOf('window.__ttsTestApi'), -1, 'test hook insertion failed');
  vm.runInNewContext(source, context, { filename: sourcePath });
  document.dispatch('DOMContentLoaded', { type: 'DOMContentLoaded', target: document });
  return {
    api: window.__ttsTestApi,
    document,
    sessionStorage: context.sessionStorage,
    synth,
    voice,
    flushTimers() {
      while (timers.length) timers.shift().callback();
    },
    tickIntervals() {
      Array.from(intervals.values()).forEach((callback) => callback());
    },
  };
}

function start(env) {
  assert.strictEqual(env.api.start(false), true);
  return env.synth.spoken[env.synth.spoken.length - 1];
}

function testGestureRecovery() {
  const env = boot();
  const first = start(env);
  first.onerror({ error: 'not-allowed' });

  assert.strictEqual(env.synth.spoken.length, 1, 'not-allowed must not scan the queue');
  assert.strictEqual(env.api.state.index, 0);
  assert.strictEqual(env.api.state.awaitingGesture, true);
  assert.strictEqual(env.sessionStorage.getItem('tts:resume'), '1');

  env.document.dispatch('pointerdown', { type: 'pointerdown', target: env.document.body });
  assert.strictEqual(env.synth.spoken.length, 2, 'the first user gesture retries once');
  assert.strictEqual(env.synth.spoken[1].text, first.text);
  assert.strictEqual(env.api.state.index, 0);
  assert.strictEqual(env.api.state.awaitingGesture, false);

  env.synth.spoken[1].onerror({ error: 'not-allowed' });
  env.document.dispatch('keydown', { type: 'keydown', key: 'Space', target: env.document.body });
  assert.strictEqual(env.synth.spoken.length, 3, 'a key activation retries once');
  assert.strictEqual(env.api.state.awaitingGesture, false);
}

function testControlGestureDoesNotReverseIntoStop() {
  const env = boot();
  const first = start(env);
  first.onerror({ error: 'not-allowed' });

  env.document.dispatch('pointerdown', { type: 'pointerdown', target: env.api.els.playPause });
  env.api.els.bar.dispatch('click', { type: 'click', target: env.api.els.playPause });

  assert.strictEqual(env.synth.spoken.length, 2, 'control pointerdown resumes exactly once');
  assert.strictEqual(env.api.state.playing, true, 'the following control click must not stop playback');
  assert.strictEqual(env.sessionStorage.getItem('tts:resume'), '1');
}

function testLateCallbacksCannotAdvanceReplacement() {
  const env = boot();
  const first = start(env);
  env.api.jump(1);
  const second = env.synth.spoken[1];

  first.onend();
  first.onerror({ error: 'synthesis-failed' });
  assert.strictEqual(env.synth.spoken.length, 2, 'late callbacks from a canceled utterance are ignored');
  assert.strictEqual(env.api.state.index, 1);

  second.onend();
  env.flushTimers();
  assert.strictEqual(env.synth.spoken.length, 3);
  assert.strictEqual(env.synth.spoken[2].text, '第三段用于朗读。');
}

function testNormalEndAndErrorAdvanceOnce() {
  const env = boot();
  const first = start(env);
  first.onend();
  env.flushTimers();
  const second = env.synth.spoken[1];
  second.onerror({ error: 'synthesis-failed' });
  env.flushTimers();
  const third = env.synth.spoken[2];
  third.onend();
  env.flushTimers();

  assert.strictEqual(env.synth.spoken.length, 3);
  assert.strictEqual(env.api.state.playing, false);
  assert.strictEqual(env.sessionStorage.getItem('tts:resume'), null);
}

function testSilentEngineStopsAfterFourAttempts() {
  const env = boot();
  start(env);

  for (let attempt = 1; attempt <= 4; attempt++) {
    env.synth.speaking = false;
    env.synth.pending = false;
    env.tickIntervals();
    env.tickIntervals();
    env.flushTimers();
  }

  assert.strictEqual(env.synth.spoken.length, 4, 'watchdog must stop on the fourth ignored attempt');
  assert.strictEqual(env.api.state.playing, false);
  assert.strictEqual(env.sessionStorage.getItem('tts:resume'), null);
}

function testStopJumpRateAndVoiceInvalidateOldUtterances() {
  const env = boot();
  const first = start(env);
  env.api.jump(1);
  const jumped = env.synth.spoken[1];

  env.api.els.rate.value = '1.5';
  env.api.els.rate.dispatch('change', { type: 'change', target: env.api.els.rate });
  const rateRestart = env.synth.spoken[2];
  assert.strictEqual(rateRestart.rate, 1.5);

  env.api.els.voice.value = env.voice.voiceURI;
  env.api.els.voice.dispatch('change', { type: 'change', target: env.api.els.voice });
  const voiceRestart = env.synth.spoken[3];
  assert.strictEqual(voiceRestart.voice, env.voice);

  first.onend();
  jumped.onerror({ error: 'synthesis-failed' });
  rateRestart.onend();
  assert.strictEqual(env.synth.spoken.length, 4, 'all replaced utterances stay inert');

  env.api.stop();
  voiceRestart.onend();
  voiceRestart.onerror({ error: 'synthesis-failed' });
  assert.strictEqual(env.synth.spoken.length, 4, 'callbacks after stop stay inert');
  assert.strictEqual(env.api.state.playing, false);
  assert.strictEqual(env.sessionStorage.getItem('tts:resume'), null);
}

testGestureRecovery();
testControlGestureDoesNotReverseIntoStop();
testLateCallbacksCannotAdvanceReplacement();
testNormalEndAndErrorAdvanceOnce();
testStopJumpRateAndVoiceInvalidateOldUtterances();
testSilentEngineStopsAfterFourAttempts();
console.log('tts regression tests passed');
