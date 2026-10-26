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
    this.classList = { toggle() {}, add() {} };
    (children || []).forEach((child) => this.append(child));
  }

  append(child) {
    const node = typeof child === 'string' ? text(child) : child;
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
  }
  appendChild(child) { return this.append(child); }
  insertBefore(child, before) {
    if (!before) return this.append(child);
    child.parentNode = this;
    this.childNodes.splice(this.childNodes.indexOf(before), 0, child);
    return child;
  }
  removeChild(child) {
    this.childNodes.splice(this.childNodes.indexOf(child), 1);
    child.parentNode = null;
    return child;
  }
  set innerHTML(value) {
    const parts = String(value).match(/^(.*?)<small>(.*?)<\/small>$/);
    if (!parts) { this.textContent = String(value).replace(/<[^>]*>/g, ''); return; }
    this.textContent = parts[1];
    this.append(new Element('small', {}, [parts[2]]));
  }

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
  if (selector === '.lf-ctrl') return hasClass(node, 'lf-ctrl');
  if (selector === 'label') return node.tagName === 'LABEL';
  if (selector === 'input,select') return ['INPUT', 'SELECT'].includes(node.tagName);
  if (selector === '.lf-meta' || selector === '.lf-formula' || selector === '.lf-num') return hasClass(node, selector.slice(1));
  if (selector === '.lf-label') return hasClass(node, 'lf-label');
  if (selector === '.lf-head') return hasClass(node, 'lf-head');
  if (selector === '.lf-cap') return hasClass(node, 'lf-cap');
  if (selector === 'svg') return node.tagName === 'SVG';
  if (selector === 'text') return node.tagName === 'TEXT';
  if (selector === '.lf-readable-viewport' || selector === '.lf-readability-hint') return hasClass(node, selector.slice(1));
  if (selector === 'svg text') return node.tagName === 'TEXT' && node.parentNode && node.parentNode.tagName === 'SVG';
  if (selector === '.lf-ctrl label' && node.tagName === 'LABEL') {
    for (let parent = node.parentNode; parent; parent = parent.parentNode) {
      if (hasClass(parent, 'lf-ctrl')) return true;
    }
  }
  return false;
}

class Document {
  constructor(hosts) { this.hosts = hosts; }
  createElement(tag) { return new Element(tag); }
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
  const files = Array.isArray(filename) ? filename : [filename];
  const registered = {};
  const documentHead = new Element('head');
  const providerDocument = {
    head: documentHead,
    createElement(tag) { return new Element(tag); },
    createTextNode: text,
    getElementById(id) {
      return documentHead.querySelectorAll('*').find((node) => node.attrs.id === id) || null;
    }
  };
  let uid = 0;
  const LF = {
    el(tag, attrs, children) { return new Element(tag, attrs, children); },
    svgEl(tag, attrs, children) { return new Element(tag, attrs, children); },
    smil(tag, attrs) { return new Element(tag, attrs); },
    uid(prefix) { return prefix + '-' + (++uid); },
    clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); },
    fmtInt(x) { return x.toLocaleString('en-US'); },
    slider(state, key, label, min, max, step) {
      const input = new Element('input', { type: 'range', min, max, step, value: state[key] });
      input.value = state[key];
      input.addEventListener('input', () => { state[key] = Number(input.value); state._render(); });
      return new Element('div', { class: 'lf-ctrl' }, [
        new Element('div', { class: 'lf-ctrl-head' }, [new Element('label', {}, [label])]), input
      ]);
    },
    select(state, key, label, options) {
      const select = new Element('select', {}, options.map(([text, value]) => new Element('option', { value }, [text])));
      select.value = state[key];
      select.addEventListener('change', () => { state[key] = select.value; state._render(); });
      return new Element('div', { class: 'lf-ctrl' }, [new Element('label', {}, [label]), select]);
    },
    addMotionController() {},
    registerDisposer() {},
    register(figures) { Object.assign(registered, figures); }
  };
  const context = {
    window: {
      LF, LESSON_FIGURES: registered,
      matchMedia() { return { matches: true }; },
      setTimeout() { return 1; },
      clearTimeout() {}
    },
    document: providerDocument
  };
  for (const file of files) vm.runInNewContext(fs.readFileSync(path.join(site, file), 'utf8'), context, { filename: path.join(site, file) });
  return registered;
}

function visibleText(root) {
  const values = [];
  (function walk(node) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const value = child.nodeValue.trim();
        if (value) values.push(value);
      } else if (!hasClass(child, 'lf-readability-hint')) {
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

function testVisualFindingReaderText() {
  const cases = [
    ['figures-vision-speech.js', 'cnn-param-count', 'CNN 参数量', '一个卷积层'],
    ['figures-visaudio4.js', 'v4-vision-pipeline', '视觉综合项目 · 流水线', '生产视觉服务由一串契约连接而成'],
    ['figures-foundations2.js', 'data-augmentation', '数据增强', '数据增强对每张训练图像'],
    ['figures-cv2.js', 'clip-contrastive', 'CLIP · 对比矩阵', 'CLIP 将图像与图像描述'],
    ['figures-tools2.js', 'tp-tool-loop', '工具循环', '每套工具调用栈都运行同样的四步循环'],
    ['figures-llmstack5.js', 'l5-vlm-recipe-knobs', 'VLM 配方调节项', 'MM1、Idefics2、Cambrian-1 和 Prismatic'],
    ['figures-llmstack5.js', 'l5-onevision-budget', 'OneVision token 预算', 'LLaVA-OneVision 将每个样本'],
    ['figures-multimodal2.js', 'mm-mrope-axes', 'M-RoPE 三轴', 'Qwen2-VL 将每个 token'],
    ['figures-agents-alignment.js', 'agent-loop', '智能体循环', '智能体是一个循环'],
    ['figures-autoswarm5.js', 'a5-orchestrator-scale', '编排规模', 'Anthropic 的 Research 系统']
  ];
  const overlay = fs.readFileSync(path.join(site, 'figures-i18n-zh.js'), 'utf8');
  const entries = cases.map(([file, name, title, caption]) => {
    const rendered = host(name, []);
    loadProvider(file)[name](rendered);
    return { name, title, caption, host: rendered };
  });
  const window = {};
  const document = new Document(entries.map((entry) => entry.host));
  vm.runInNewContext(overlay, { window, document });

  function machineTree(node) {
    if (node.nodeType === 3) return null;
    const attrs = Object.assign({}, node.attrs);
    delete attrs['aria-label'];
    const style = Object.assign({}, node.style);
    if (node.tagName === 'SVG') delete style.minWidth; // display scale, not SVG geometry
    const children = node.children.flatMap(child => {
      if (hasClass(child, 'lf-readability-hint')) return [];
      if (hasClass(child, 'lf-readable-viewport')) return child.children.map(machineTree);
      return [machineTree(child)];
    });
    return { tag: node.tagName, attrs, style, children };
  }
  function numbers(rendered) { return visibleText(rendered).join(' ').match(/\d+(?:[.,]\d+)*/g) || []; }
  function applyAndCheck(entry, event) {
    const before = machineTree(entry.host);
    const numericBefore = numbers(entry.host);
    if (event) entry.host.emit(event); else window.applyFigureI18n(new Document([entry.host]));
    assert.deepEqual(machineTree(entry.host), before, entry.name + ': attributes, geometry, animation, option values must not change');
    assert.deepEqual(numbers(entry.host), numericBefore, entry.name + ': displayed numbers must not change');
  }
  entries.forEach((entry) => {
    applyAndCheck(entry);
    assert.equal(entry.host.querySelector('.lf-label').textContent, entry.title);
    assert.ok(entry.host.querySelector('.lf-cap').textContent.startsWith(entry.caption), entry.name + ': full Chinese caption');
    const svg = entry.host.querySelector('svg');
    const viewports = entry.host.querySelectorAll('.lf-readable-viewport');
    assert.equal(viewports.length, svg ? 1 : 0, entry.name + ': wrap only actual SVG');
    if (svg) {
      assert.equal(viewports[0].attrs.tabindex, '0');
      assert.equal(viewports[0].attrs.role, 'region');
      assert.match(entry.host.querySelector('.lf-readability-hint').textContent, /方向键/);
      const width = Number(svg.attrs.viewBox.split(/\s+/)[2]);
      const font = Math.min(...svg.querySelectorAll('text').map(n => Number(n.attrs['font-size'])).filter(n => n > 0));
      assert.ok(parseFloat(svg.style.minWidth) / width * font >= 12, entry.name + ': at least 12 CSS px');
      applyAndCheck(entry);
      assert.equal(entry.host.querySelectorAll('.lf-readable-viewport').length, 1, 'idempotent display wrapper');
    }
  });

  // All selected exact strings must match actual renderer text, including SVG
  // descendants inside nested groups; unrelated literal outputs remain intact.
  const maps = JSON.parse(overlay.match(/var READER_TEXT = (\{[\s\S]*?\n  \});/)[1]);
  for (const entry of entries) {
    if (entry.name === 'agent-loop') continue; // all twelve real input steps below
    const raw = host(entry.name, []);
    loadProvider(cases.find((row) => row[1] === entry.name)[0])[entry.name](raw);
    for (const [english, chinese] of Object.entries(maps[entry.name] || {})) {
      assert.ok(visibleText(raw).includes(english), entry.name + ': mapping must match source text: ' + english);
      assert.ok(visibleText(entry.host).includes(chinese), entry.name + ': mapped text must reach DOM: ' + english);
    }
  }
  const pipeline = entries.find((entry) => entry.name === 'v4-vision-pipeline').host;
  ['ConvNeXt-T', 'label: cereal 0.94', '"box": [82,74,..]', '"cls": "cereal"', '"score": 0.94'].forEach((literal) => {
    assert.ok(visibleText(pipeline).includes(literal), 'model and output literal unchanged: ' + literal);
  });

  const cnn = entries.find((entry) => entry.name === 'cnn-param-count');
  for (const [index, value] of [[0, 1], [1, 512], [2, 7], [3, 64], [3, 8]]) {
    const input = cnn.host.querySelectorAll('*').filter((node) => node.tagName === 'INPUT')[index];
    input.value = value; input.emit('input');
    applyAndCheck(cnn, 'input');
    assert.match(cnn.host.querySelector('.lf-meta').textContent, /^同样的 \d+x\d+ 特征图使用全连接层 = [\d.]+[KMB]? 个参数/);
    assert.match(cnn.host.querySelector('.lf-formula').textContent, /与空间尺寸无关$/);
  }
  const augmentation = entries.find((entry) => entry.name === 'data-augmentation');
  const select = augmentation.host.querySelectorAll('*').find((node) => node.tagName === 'SELECT');
  assert.deepEqual(select.children.map((node) => node.attrs.value), ['flip', 'rotate', 'crop', 'color']);
  assert.deepEqual(select.children.map((node) => node.textContent), ['水平翻转', '旋转 90 度', '随机裁剪', '颜色扰动']);
  for (const mode of ['flip', 'rotate', 'crop', 'color']) {
    select.value = mode; select.emit('change');
    applyAndCheck(augmentation, 'change');
    assert.match(augmentation.host.querySelector('.lf-meta').textContent, /^每轮生成新视图/);
    assert.ok(visibleText(augmentation.host).includes('增强 4'));
  }
  const copies = augmentation.host.querySelectorAll('*').find((node) => node.tagName === 'INPUT');
  for (const value of [1, 4]) {
    copies.value = value; copies.emit('input'); applyAndCheck(augmentation, 'input');
    assert.ok(augmentation.host.querySelector('.lf-meta').textContent.includes((1000 * (value + 1)).toLocaleString('en-US')));
  }
  const agent = entries.find((entry) => entry.name === 'agent-loop');
  const step = agent.host.querySelectorAll('*').find((node) => node.tagName === 'INPUT');
  const expectedNotes = Object.values(maps['agent-loop']);
  assert.equal(expectedNotes.length, 12, 'all twelve note mappings must exist');
  for (let value = 0; value < 12; value++) {
    step.value = value; step.emit('input'); applyAndCheck(agent, 'input');
    assert.equal(agent.host.querySelector('.lf-meta').textContent, expectedNotes[value], 'agent-loop: translated actual step ' + value);
    if (value === 1) assert.ok(visibleText(agent.host).includes('search_web'));
    if (value === 11) assert.ok(visibleText(agent.host).includes('ready to answer'));
  }

  const control = one('button', 'lf-motion-toggle', '暂停动画', { 'aria-label': 'Pause explanatory animation' });
  pipeline.appendChild(control);
  for (const [english, chinese] of [['Pause explanatory animation', '暂停讲解动画'], ['Play explanatory animation', '播放讲解动画']]) {
    control.setAttribute('aria-label', english); pipeline.emit('click');
    assert.equal(control.getAttribute('aria-label'), chinese);
  }
  const untouched = host('unowned-widget', [one('span', '', 'encoder'), one('span', 'lf-meta', 'a dense layer on the same 32x32 map = 1.0B params  ·  10.0Kx more')]);
  const untouchedBefore = visibleText(untouched);
  window.applyFigureI18n(new Document([untouched]));
  assert.deepEqual(visibleText(untouched), untouchedBefore, 'reader mappings are scoped to owned widget IDs');
  pipeline.appendChild(one('code', '', 'crop + resize'));
  pipeline.appendChild(new Element('pre', {}, [one('span', '', 'decode + detect')]));
  pipeline.appendChild(one('span', '', 'unknown explanatory text'));
  pipeline.emit('click');
  assert.ok(visibleText(pipeline).includes('crop + resize'), 'code not translated');
  assert.ok(visibleText(pipeline).includes('decode + detect'), 'nested preformatted code not translated');
  assert.ok(visibleText(pipeline).includes('unknown explanatory text'), 'unknown prose not guessed');
  console.log('visual-finding reader i18n/display passed: 10 real widgets; CNN/augmentation input, all 12 agent steps, motion aria; numerical/geometry/value parity');
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
testVisualFindingReaderText();

function testNestedContextCache() {
  const render = loadProvider(['figures-llmeng.js', 'figures-claude-certifications.js'])['04-context-cache'];
  const widget = host('04-context-cache', []);
  render(widget);
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(site, 'figures-i18n-zh.js'), 'utf8'), { window, document: new Document([widget]) });
  function tree(node) {
    const attrs = Object.assign({}, node.attrs); delete attrs['aria-label'];
    const style = Object.assign({}, node.style); if (node.tagName === 'SVG') delete style.minWidth;
    return { tag: node.tagName, attrs, style, value: node.value, children: node.children.flatMap(child => {
      if (hasClass(child, 'lf-readability-hint')) return [];
      if (hasClass(child, 'lf-readable-viewport')) return child.children.map(tree);
      return [tree(child)];
    }) };
  }
  function apply(event) {
    const before = tree(widget);
    const numbers = visibleText(widget).join(' ').match(/\d+(?:[.,]\d+)*/g);
    const svg = widget.querySelector('svg');
    const nodes = svg.querySelectorAll('*');
    if (event) widget.emit(event); else window.applyFigureI18n(new Document([widget]));
    assert.deepEqual(tree(widget), before, 'nested cache: attribute/geometry/animation/control tree unchanged');
    assert.deepEqual(visibleText(widget).join(' ').match(/\d+(?:[.,]\d+)*/g), numbers, 'nested cache: all numbers unchanged');
    assert.equal(widget.querySelector('svg'), svg, 'complete SVG retained');
    assert.deepEqual(svg.querySelectorAll('*'), nodes, 'all SVG child identities retained');
    assert.match(widget.querySelector('.lf-cap').textContent, /^(重复出现的长系统|语义缓存会)/);
    assert.equal(widget.querySelector('.lf-head').textContent, svg.attrs.viewBox === '0 0 520 120' ? 'Prompt 缓存命中拖动前缀占比与命中率' : '语义缓存拖动阈值');
    const expectedAria = svg.attrs.viewBox === '0 0 520 120'
      ? ['缓存机制', '共享前缀（占 prompt %）', '缓存命中率（%）']
      : ['缓存机制', '相似度阈值'];
    assert.deepEqual(widget.querySelectorAll('input,select').map(node => node.getAttribute('aria-label')), expectedAria);
    const formula = widget.querySelector('.lf-formula').textContent;
    if (svg.attrs.viewBox === '0 0 520 120') {
      assert.equal(svg.querySelectorAll('text').length, 2);
      assert.equal(svg.style.minWidth, '624px', '520-unit diagram with explicit 10-unit text scales to 12px');
      assert.equal(widget.querySelectorAll('.lf-readable-viewport').length, 1);
      assert.match(formula, /^saved = hit_rate × prefix_fraction = /);
      assert.match(widget.querySelector('.lf-meta').textContent, /^命中率/);
      assert.match(widget.querySelector('.lf-num').textContent, /% 预填充计算节省量$/);
    } else {
      assert.equal(svg.querySelectorAll('text').length, 0, 'semantic SVG has no text; null minPx is not small text');
      assert.equal(widget.querySelectorAll('.lf-readable-viewport').length, 0);
      assert.match(formula, /^当 cos\(query, cached\) ≥ /);
      assert.match(widget.querySelector('.lf-meta').textContent, /^阈值/);
      assert.match(widget.querySelector('.lf-num').textContent, /^\d+ 条由缓存返回（共 10 条）$/);
    }
  }
  apply();
  assert.equal(widget.querySelector('.lf-num').textContent, '56.0 % 预填充计算节省量');
  assert.equal(widget.querySelector('.lf-formula').textContent, 'saved = hit_rate × prefix_fraction = 0.80 × 0.70 = 0.56');
  const mode = widget.querySelectorAll('input,select').find(node => node.tagName === 'SELECT');
  assert.deepEqual(mode.children.map(node => node.attrs.value), ['prefix', 'semantic']);
  for (const value of ['prefix', 'semantic', 'prefix']) {
    mode.value = value; mode.emit('change'); apply('change');
    if (value === 'semantic') {
      assert.equal(widget.querySelector('.lf-num').textContent, '4 条由缓存返回（共 10 条）');
      assert.equal(widget.querySelector('.lf-meta').textContent, '阈值 0.85  ·  命中中有 0 条返回错误答案  ·  均衡');
    } else {
      assert.equal(widget.querySelector('.lf-num').textContent, '56.0 % 预填充计算节省量');
    }
    const inputs = widget.querySelectorAll('input,select').filter(node => node.tagName === 'INPUT');
    for (const input of inputs) {
      for (const value of (inputs.length === 1 ? [0.5, 0.7, 0.85, 0.99] : [0, 50, 100])) {
        input.value = value; input.emit('input'); apply('input');
        assert.equal(input.value, value, 'overlay must retain input values');
        if (inputs.length === 1 && value === 0.7) {
          assert.equal(widget.querySelector('.lf-num').textContent, '8 条由缓存返回（共 10 条）');
          assert.equal(widget.querySelector('.lf-meta').textContent, '阈值 0.70  ·  命中中有 3 条返回错误答案  ·  低阈值：命中多，风险高');
        }
      }
    }
  }
  widget.append(new Element('pre', {}, [one('code', '', 'SEMANTIC CACHE')]));
  widget.append(one('span', '', 'Unknown cache explanation'));
  widget.append(one('div', 'lf-cap', 'Unknown cache caption'));
  widget.append(one('input', '', '', { 'aria-label': 'Unknown cache control' }));
  widget.emit('click');
  assert.equal(widget.children.at(-1).getAttribute('aria-label'), 'Unknown cache control');
  assert.ok(visibleText(widget).includes('Unknown cache explanation'));
  assert.ok(visibleText(widget).includes('Unknown cache caption'));
  assert.ok(visibleText(widget).includes('SEMANTIC CACHE'), 'cache code subtrees are not translated');
  console.log('nested context-cache: real prefix → semantic → prefix consumer, dynamic inputs, exact captions/headers/aria, number and attribute tree invariance passed');
}
testNestedContextCache();

function testScopedProviderLocales() {
  const svgTitle = one('title', '', 'ROOT-CAUSE WALK', { id: 'stable-title' });
  const animatedText = new Element('text', { x: '300', y: '65' }, [
    text('limits too low  0.86'), new Element('animate', { attributeName: 'opacity', values: '0;1', dur: '6s' })
  ]);
  const svg = new Element('svg', { viewBox: '0 0 520 250', 'aria-labelledby': 'stable-title' }, [svgTitle, animatedText]);
  const option = one('option', '', 'enabled', { value: 'enabled' });
  const meter = one('span', '', 'score 0.86 / 12 requests', { 'aria-label': 'Root cause evidence' });
  const code = one('code', '', 'ROOT-CAUSE WALK');
  const widget = host('locale-test', [svg, new Element('select', {}, [option]), meter,
    new Element('pre', {}, [code]), one('button', '', 'Motion reduced')]);
  const other = host('unrelated-widget', [one('span', '', 'ROOT-CAUSE WALK')]);
  let observerCallback, disconnected = false;
  const disposers = [];
  const window = {
    AIFS_FIGURE_LOCALES: { 'sample-provider.js': { 'locale-test': {
      text: { 'ROOT-CAUSE WALK': '根因排查', 'limits too low  0.86': '限额过低  0.86',
        enabled: '已启用', 'Root cause evidence': '根因证据' },
      patterns: [['^score ([\\d.]+) / (\\d+) requests$', '得分 $1 / $2 个请求']]
    } } },
    LF: { registerDisposer(_host, fn) { disposers.push(fn); } },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; }
      observe(_host, options) {
        if (_host === widget) observerCallback = this.callback;
        assert.deepEqual(Array.from(options.attributeFilter), ['aria-label', 'aria-description', 'aria-roledescription', 'aria-valuetext', 'title', 'alt', 'placeholder']);
      }
      disconnect() { disconnected = true; }
    }
  };
  const document = new Document([widget, other]);
  vm.runInNewContext(fs.readFileSync(path.join(site, 'figures-i18n-zh.js'), 'utf8'), { window, document });
  window.applyFigureI18n(document);
  assert.equal(svgTitle.textContent, '根因排查');
  assert.equal(svgTitle.getAttribute('id'), 'stable-title');
  assert.equal(svg.getAttribute('aria-labelledby'), 'stable-title');
  assert.equal(animatedText.firstChild.nodeValue, '限额过低  0.86');
  assert.equal(animatedText.children[0].getAttribute('dur'), '6s', 'SVG animation subtree remains intact');
  assert.equal(option.textContent, '已启用');
  assert.equal(option.getAttribute('value'), 'enabled', 'option machine value remains intact');
  assert.equal(meter.textContent, '得分 0.86 / 12 个请求');
  assert.equal(meter.getAttribute('aria-label'), '根因证据');
  assert.equal(code.textContent, 'ROOT-CAUSE WALK', 'nested code subtree remains intact');
  assert.equal(other.textContent, 'ROOT-CAUSE WALK', 'dictionaries cannot leak into another widget');
  meter.textContent = 'score 0.51 / 99 requests';
  observerCallback();
  assert.equal(meter.textContent, '得分 0.51 / 99 个请求', 'timer-only updates are translated');
  observerCallback();
  assert.equal(meter.textContent, '得分 0.51 / 99 个请求', 'translation is idempotent');
  meter.textContent = 'Unknown explanation';
  observerCallback();
  assert.equal(meter.textContent, 'Unknown explanation', 'unknown prose is reported, never guessed');
  disposers.forEach(fn => fn());
  assert.equal(disconnected, true, 'unmount disposes the scoped observer');
  console.log('provider locales: scoped text/aria/options, timer updates, SVG/number/code preservation and disposal passed');
}
testScopedProviderLocales();
