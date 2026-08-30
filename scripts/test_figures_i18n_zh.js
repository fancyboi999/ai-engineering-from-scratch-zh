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
    this.listeners = Object.create(null);
    (children || []).forEach((child) => this.append(child));
  }

  append(child) {
    const node = typeof child === 'string' ? text(child) : child;
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }

  get firstChild() { return this.childNodes[0] || null; }
  get className() { return this.attrs.class || ''; }
  getAttribute(name) {
    if (name === 'data-figure') return this.dataset.figure || null;
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
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
  const source = fs.readFileSync(path.join(site, filename), 'utf8');
  let registered = null;
  vm.runInNewContext(source, {
    window: { LF: { register(figures) { registered = figures; } } },
    document: {}
  }, { filename: path.join(site, filename) });
  return Object.keys(registered || {});
}

function main() {
  const agent = registeredFigures('figures-agent-skills.js');
  const mcpFigures = registeredFigures('figures-mcp.js');
  const i18nSource = fs.readFileSync(path.join(site, 'figures-i18n-zh.js'), 'utf8');
  assert.equal(agent.length, 19, 'Agent Skills provider must still expose all 19 renderers');
  assert.equal(mcpFigures.length, 17, 'MCP provider must still expose all 17 renderers');
  for (const name of agent.concat(mcpFigures)) {
    assert.ok(i18nSource.includes("'" + name + "': 1"), 'provider figure missing from Chinese overlay: ' + name);
  }

  const skill = host('skill-package-anatomy', [
    one('span', 'asf-title', 'Skill package anatomy'),
    one('span', 'asf-hint', 'open the complete deployable unit'),
    one('span', 'asf-caption', 'Package integrity includes every file the workflow names. Validate the tree before publishing the catalog entry.')
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
  const document = new Document([skill, mcp]);
  const window = { mountLessonFigures() {} };
  vm.runInNewContext(fs.readFileSync(path.join(site, 'figures-i18n-zh.js'), 'utf8'), { window, document }, {
    filename: path.join(site, 'figures-i18n-zh.js')
  });

  window.applyFigureI18n(document);
  assert.equal(skill.querySelector('.asf-title'), null, 'test DOM must use generic tree traversal');
  assert.equal(skill.childNodes[0].firstChild.nodeValue, '技能包结构');
  assert.equal(skill.childNodes[1].firstChild.nodeValue, '展开完整的可部署单元');
  assert.equal(mcp.childNodes[0].firstChild.nodeValue, 'MCP 注册表准入账本');
  assert.equal(mcp.childNodes[2].firstChild.nodeValue, '供应链条件');
  assert.equal(mcp.childNodes[3].firstChild.nodeValue, '运行准入');
  assert.equal(mcp.childNodes[4].firstChild.nodeValue, '通过');
  assert.equal(svg.firstChild.firstChild.nodeValue, '场景', 'SVG scene labels use the same exact map');
  assert.equal(mcp.childNodes[5].firstChild.nodeValue, protocol, 'protocol evidence is a protected literal');

  // Provider click handlers replace status/button nodes. The delegated overlay
  // listener must translate the new nodes without a second mount.
  mcp.childNodes[3] = one('button', 'mcp-lab__action', 'Run Admit');
  mcp.childNodes[3].parentNode = mcp;
  mcp.childNodes[4] = one('span', 'mcp-lab__status', 'DENIED');
  mcp.childNodes[4].parentNode = mcp;
  mcp.emit('click');
  assert.equal(mcp.childNodes[3].firstChild.nodeValue, '运行准入');
  assert.equal(mcp.childNodes[4].firstChild.nodeValue, '已拒绝');

  console.log('figure i18n VM/DOM test passed: 19 Agent Skills + 17 MCP providers; first mount and click rerender remain Chinese while protocol literals remain unchanged');
}

main();
