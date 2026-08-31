#!/usr/bin/env node
'use strict';

/*
 * Dependency-free VM/DOM regression test for the Chinese figure overlay.
 * It deliberately tests the post-mount tree rather than provider internals:
 * providers remain byte-identical upstream and may rebuild their subtree on
 * interaction, while this layer owns the translated DOM.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');

function text(value) {
  return { nodeType: 3, nodeValue: value, parentNode: null };
}

class Element {
  constructor(tagName, attrs, children) {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.attrs = Object.assign({}, attrs);
    this.dataset = Object.assign({}, attrs && attrs.dataset);
    this.childNodes = [];
    this.parentNode = null;
    this.style = {};
    this.listeners = Object.create(null);
    this.classList = { toggle() {} };
    (children || []).forEach((child) => this.append(child));
  }

  append(child) {
    const node = typeof child === 'string' ? text(child) : child;
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  appendChild(child) { return this.append(child); }

  get firstChild() { return this.childNodes[0] || null; }
  get children() { return this.childNodes.filter((node) => node.nodeType === 1); }
  get className() { return this.attrs.class || ''; }
  get textContent() {
    return this.childNodes.map((node) => node.nodeType === 3 ? node.nodeValue : node.textContent).join('');
  }
  set textContent(value) {
    this.childNodes = [];
    this.append(String(value));
  }
  getAttribute(name) {
    if (name === 'data-figure') return this.dataset.figure || null;
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  removeAttribute(name) { delete this.attrs[name]; }
  addEventListener(type, listener) { (this.listeners[type] || (this.listeners[type] = [])).push(listener); }
  emit(type) { (this.listeners[type] || []).forEach((listener) => listener({ type, target: this })); }

  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const all = [];
    (function walk(node) {
      node.childNodes.forEach((child) => {
        if (child.nodeType !== 1) return;
        all.push(child);
        walk(child);
      });
    })(this);
    return all.filter((node) => matches(node, selector));
  }
}

function hasClass(node, cls) {
  return (' ' + node.className + ' ').includes(' ' + cls + ' ');
}

function matches(node, selector) {
  if (selector === '*') return true;
  if (selector === '.lf-label') return hasClass(node, 'lf-label');
  if (selector === '.lf-head') return hasClass(node, 'lf-head');
  if (selector === '.lf-cap') return hasClass(node, 'lf-cap');
  if (selector === 'svg') return node.tagName === 'SVG';
  if (selector === 'svg text') return node.tagName === 'TEXT' && node.parentNode && node.parentNode.tagName === 'SVG';
  if (selector === '.lf-ctrl label') return node.tagName === 'LABEL' && node.parentNode && hasClass(node.parentNode, 'lf-ctrl');
  return false;
}

class Document {
  constructor(hosts) { this.hosts = hosts; }
  querySelectorAll(selector) {
    assert.equal(selector, '.lesson-figure[data-figure]');
    return this.hosts;
  }
}

function host(name, children) {
  return new Element('section', { class: 'lesson-figure', dataset: { figure: name, lfMounted: '1' } }, children);
}

function one(tag, className, value, attrs) {
  return new Element(tag, Object.assign({ class: className }, attrs), [value]);
}

function registeredFigures(filename) {
  return Object.keys(loadProvider(filename));
}

function loadProvider(filename) {
  const source = fs.readFileSync(path.join(site, filename), 'utf8');
  let registered = null;
  const documentHead = new Element('head');
  const providerDocument = {
    head: documentHead,
    createElement(tag) { return new Element(tag); },
    createTextNode: text,
    getElementById(id) {
      return documentHead.querySelectorAll('*').find((node) => node.attrs.id === id) || null;
    }
  };
  const LF = {
    el(tag, attrs, children) { return new Element(tag, attrs, children); },
    svgEl(tag, attrs, children) { return new Element(tag, attrs, children); },
    smil(tag, attrs) { return new Element(tag, attrs); },
    addMotionController() {},
    registerDisposer() {},
    register(figures) { registered = figures; }
  };
  vm.runInNewContext(source, {
    window: {
      LF,
      matchMedia() { return { matches: true }; },
      setTimeout() { return 1; },
      clearTimeout() {}
    },
    document: providerDocument
  }, { filename: path.join(site, filename) });
  return registered || {};
}

function visibleText(root) {
  const values = [];
  (function walk(node) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const value = child.nodeValue.trim();
        if (value) values.push(value);
      } else {
        walk(child);
      }
    });
  })(root);
  return values;
}

const PROTECTED_VISIBLE_TEXT = new Set([
  'deliver(pkg)', 'A1', 'A2', 'A3', 'A4', 'VAD', 'STT', 'LLM', 'TTS', 'KV',
  'agent', 'transfer_to_refund', 'FAIL_TO_PASS', 'PASS_TO_PASS',
  'invoke_agent  CLIENT', 'execute_tool  search', 'chat  gpt model',
  'execute_tool  fetch', 'chat  claude model', 'SWE-bench, GAIA, BFCL',
  'Bengaluru', 'Tokyo', 'Zurich', 'get_weather', 'search_web', 'run_python',
  'send_email', 'query_db', 'fs.read', 'fs.list', 'pg.query', 'gh.issues',
  'gh.prs', 'stdin / stdout', 'working', 'input_required', 'completed', 'failed',
  'server.json', '(start, end)', 'def', 'main', '(', ')', ':', 'ret', '@agent fix',
  'CI', 'PR', 'c1', 'c2', 'c3', 'IDLE', 'PLANNING', 'EXECUTING',
  'AWAITING_TOOL', 'REFLECTING', 'DONE', '/args/limit: expected integer',
  '{"id":7,"method":"tools/call"}', '{"id":7,"result":{...}}',
  '{"method":"progress"}', '{"id":9,"met###',
  '{"id":null,"error":{"code":-32700}}', '{"id":10,"method":"ping"}',
  't', '1s', 'key a1f3'
]);

function isProtectedVisibleText(value) {
  return PROTECTED_VISIBLE_TEXT.has(value) ||
    /^w 0\.\d+$/.test(value) || /^provider [ABC]$/.test(value) ||
    /^\d{4}$/.test(value) || /^\d+%$/.test(value);
}

function assertProviderTranslated(host, before, stage) {
  const after = visibleText(host);
  assert.equal(after.length, before.length, stage + ': translation must not drop visible nodes');
  before.forEach((value, index) => {
    if (isProtectedVisibleText(value)) {
      assert.equal(after[index], value, stage + ': protected protocol/code literal changed: ' + value);
      return;
    }
    if (!/[A-Za-z]/.test(value)) return;
    assert.notEqual(after[index], value, stage + ': untranslated user-visible text: ' + value);
  });
}

function main() {
  const agent = registeredFigures('figures-agent-skills.js');
  const mcpFigures = registeredFigures('figures-mcp.js');
  const extensionFiles = [
    'figures-agents3.js', 'figures-agents4.js', 'figures-tools2.js', 'figures-capstone-f.js'
  ];
  const extensionProviders = extensionFiles.map((filename) => [filename, loadProvider(filename)]);
  const extensionNames = extensionProviders.flatMap((entry) => Object.keys(entry[1]));
  const i18nSource = fs.readFileSync(path.join(site, 'figures-i18n-zh.js'), 'utf8');
  assert.equal(agent.length, 19, 'Agent Skills provider must still expose all 19 renderers');
  assert.equal(mcpFigures.length, 17, 'MCP provider must still expose all 17 renderers');
  for (const name of agent.concat(mcpFigures)) {
    assert.ok(i18nSource.includes("'" + name + "': 1"), 'provider figure missing from Chinese overlay: ' + name);
  }
  assert.equal(extensionNames.length, 34, 'new upstream providers must still expose all 34 renderers');
  for (const name of extensionNames) {
    assert.ok(i18nSource.includes("'" + name + "': 1"), 'extended provider figure missing from Chinese overlay: ' + name);
  }

  const skill = host('skill-package-anatomy', [
    one('span', 'asf-title', 'Skill package anatomy'),
    one('span', 'asf-hint', 'open the complete deployable unit'),
    one('span', 'asf-caption', 'Package integrity includes every file the workflow names. Validate the tree before publishing the catalog entry.'),
    one('button', 'lf-motion-toggle', 'Pause animation', { 'aria-label': 'Replay explanatory animation' }),
    one('button', 'lf-motion-replay', 'Replay animation')
  ]);
  const protocol = '{"jsonrpc":"2.0","method":"tools/call"}';
  const mcp = host('mcp-registry-admission', [
    one('span', 'mcp-lab__title', 'MCP REGISTRY ADMISSION LEDGER'),
    one('p', 'mcp-lab__prompt', 'Change one supply-chain fact, then run admission. The result is derived from publisher proof, artifact provenance, Registry state, revocation, live discovery, and descriptor pins.'),
    one('div', 'mcp-lab__control-label', 'Supply-chain condition'),
    one('button', 'mcp-lab__action', 'Run Admit'),
    one('span', 'mcp-lab__status', 'PASS'),
    one('pre', 'mcp-lab__evidence', protocol),
    new Element('svg', {}, [new Element('text', {}, ['Scenario'])])
  ]);
  const svg = mcp.querySelector('svg');
  const extensionCases = [];
  for (const [, provider] of extensionProviders) {
    for (const [name, render] of Object.entries(provider)) {
      const rendered = host(name, []);
      render(rendered);
      extensionCases.push({ name, render, host: rendered, before: visibleText(rendered) });
    }
  }
  const agentSkillCases = [];
  for (const [name, render] of Object.entries(loadProvider('figures-agent-skills.js'))) {
    const rendered = host(name, []);
    render(rendered);
    agentSkillCases.push({ name, host: rendered });
  }
  const document = new Document([skill, mcp]
    .concat(extensionCases.map((entry) => entry.host))
    .concat(agentSkillCases.map((entry) => entry.host)));
  const window = { mountLessonFigures() {} };
  vm.runInNewContext(fs.readFileSync(path.join(site, 'figures-i18n-zh.js'), 'utf8'), { window, document }, {
    filename: path.join(site, 'figures-i18n-zh.js')
  });

  window.applyFigureI18n(document);
  assert.equal(skill.querySelector('.asf-title'), null, 'test DOM must use generic tree traversal');
  assert.equal(skill.childNodes[0].firstChild.nodeValue, '技能包结构');
  assert.equal(skill.childNodes[1].firstChild.nodeValue, '展开完整的可部署单元');
  assert.equal(skill.childNodes[3].firstChild.nodeValue, '暂停动画');
  assert.equal(skill.childNodes[3].getAttribute('aria-label'), '重播讲解动画');
  assert.equal(skill.childNodes[4].firstChild.nodeValue, '重播动画');
  assert.equal(mcp.childNodes[0].firstChild.nodeValue, 'MCP 注册表准入账本');
  assert.equal(mcp.childNodes[2].firstChild.nodeValue, '供应链条件');
  assert.equal(mcp.childNodes[3].firstChild.nodeValue, '运行准入');
  assert.equal(mcp.childNodes[4].firstChild.nodeValue, '通过');
  assert.equal(svg.firstChild.firstChild.nodeValue, '场景', 'SVG scene labels use the same exact map');
  assert.equal(mcp.childNodes[5].firstChild.nodeValue, protocol, 'protocol evidence is a protected literal');
  for (const entry of extensionCases) {
    assertProviderTranslated(entry.host, entry.before, entry.name + ' first render');
  }
  for (const entry of agentSkillCases) {
    const controlText = entry.host.querySelectorAll('*')
      .filter((node) => hasClass(node, 'asf-button'))
      .map((node) => node.textContent);
    assert.ok(controlText.includes('上一步'), entry.name + ': Previous control must be Chinese');
    assert.ok(controlText.includes('下一步'), entry.name + ': Next control must be Chinese');
    assert.ok(controlText.includes('重播'), entry.name + ': Replay control must be Chinese');
  }
  const discoveryText = visibleText(agentSkillCases.find((entry) => entry.name === 'skill-discovery-pipeline').host);
  assert.ok(discoveryText.includes('已配置') && discoveryText.includes('根目录'), 'Configured roots first-frame node must be Chinese');
  assert.ok(discoveryText.includes('枚举'), 'Enumerate first-frame node must be Chinese');
  const disclosureText = visibleText(agentSkillCases.find((entry) => entry.name === 'skill-disclosure-levels').host);
  assert.ok(disclosureText.includes('本任务纳入的上下文'), 'context-admitted zone must be Chinese');
  ['Previous', 'Next', 'Replay', 'Configured', 'roots', 'Enumerate', 'context admitted for one task'].forEach((value) => {
    assert.ok(!discoveryText.includes(value) && !disclosureText.includes(value), 'Agent Skills first frame still contains English UI: ' + value);
  });

  // Provider click handlers replace status/button nodes. The delegated overlay
  // listener must translate the new nodes without a second mount.
  mcp.childNodes[3] = one('button', 'mcp-lab__action', 'Run Admit');
  mcp.childNodes[3].parentNode = mcp;
  mcp.childNodes[4] = one('span', 'mcp-lab__status', 'DENIED');
  mcp.childNodes[4].parentNode = mcp;
  mcp.emit('click');
  assert.equal(mcp.childNodes[3].firstChild.nodeValue, '运行准入');
  assert.equal(mcp.childNodes[4].firstChild.nodeValue, '已拒绝');

  // These four providers currently animate with SMIL rather than rebuilding
  // through controls. Re-rendering their subtree before a delegated click
  // models the same host contract used by interactive providers.
  for (const entry of extensionCases) {
    entry.host.childNodes = [];
    entry.render(entry.host);
    const rerenderedEnglish = visibleText(entry.host);
    entry.host.emit('click');
    assertProviderTranslated(entry.host, rerenderedEnglish, entry.name + ' click rerender');
  }

  console.log('figure i18n VM/DOM test passed: 19 Agent Skills + 17 MCP + 34 extended providers; first mount and click rerender remain Chinese while protocol/code literals remain unchanged');
}

main();
