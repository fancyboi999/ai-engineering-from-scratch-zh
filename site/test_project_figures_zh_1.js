'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const baseline = '04e84b1a213c620c860a0d169ea9524e17c0f513';
const projects = {
  'agent-budget-planner': 4, 'browser-agent': 4, 'document-extraction-desk': 4,
  'mcp-at-scale': 5, 'meeting-notes-to-actions': 4, 'memory-server': 4,
  'research-report-agent': 8, 'sandbox-ladder': 4, 'skill-validator': 4,
  'token-counter-and-cost-meter': 4, 'tool-call-firewall': 4,
  'web-change-brief': 4, 'workflow-hooks': 4,
};
const rraIds = ['pipeline', 'bm25', 'snippet-offsets', 'plan-facets', 'cited-writer', 'critic', 'publish', 'scorecard'].map(id => 'pj-rra-' + id);
const plain = value => JSON.parse(JSON.stringify(value));
const chinese = value => assert.match(value, /[\u4e00-\u9fff]/);
function source(slug, original) {
  const file = 'site/figures/projects/' + slug + '.js';
  if (!original) return fs.readFileSync(path.join(__dirname, 'figures/projects', slug + '.js'), 'utf8');
  if (process.env.AIFS_FIGURE_FROZEN_ROOT) return fs.readFileSync(path.join(process.env.AIFS_FIGURE_FROZEN_ROOT, file), 'utf8');
  return execFileSync('git', ['show', baseline + ':' + file], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
}
// Reuse the existing read-only DOM/runtime test facility, without running or
// changing its assertions. This also mounts the actual LF research providers.
function environment() {
  const facility = fs.readFileSync(path.join(__dirname, 'test_project_figure_runtime.js'), 'utf8');
  const context = { require, __dirname, console };
  vm.runInNewContext(facility.slice(0, facility.indexOf('\nconst controls =')) + '\nglobalThis.fixture = environment();', context);
  const env = context.fixture;
  env.window.LF.svgEl = env.el;
  env.document.createTextNode = text => env.el('#text', {}, [text]);
  return env;
}
function load(slug, original = false, actualRuntime = false) {
  const env = environment(), configs = new Map(), providers = {};
  const register = env.window.AIFSProjectFigures.register;
  const lfRegister = env.window.LF.register;
  env.window.LF.register = entries => { Object.assign(providers, entries); lfRegister(entries); };
  env.window.AIFSProjectFigures.register = (id, config) => {
    configs.set(id, config);
    if (actualRuntime) register(id, config);
  };
  vm.runInNewContext(source(slug, original), { window: env.window, document: env.document, URL, TextEncoder });
  const hosts = new Map();
  if (slug === 'research-report-agent') {
    const mountLab = env.window.AIFSProjectFigures.mountLab;
    for (const [id, provider] of Object.entries(providers)) {
      env.window.AIFSProjectFigures.mountLab = (body, lab) => {
        configs.set(id, { lab });
        if (actualRuntime) mountLab(body, lab);
      };
      const host = env.el('div'); env.document.body.append(host);
      provider(host); hosts.set(id, host);
    }
  } else if (actualRuntime) {
    for (const [id, provider] of Object.entries(providers)) {
      const host = env.el('div'); env.document.body.append(host);
      provider(host); hosts.set(id, host);
    }
  }
  return { configs, hosts, env };
}
function defaults(lab) { return Object.fromEntries(lab.controls.map(c => [c.key, c.value])); }
function controls(lab) {
  return plain(lab.controls.map(({ label, options, ...control }) => ({ ...control, ...(options ? { options: options.map(({ label, ...option }) => option) } : {}) })));
}
// Only human string leaves may differ. Preserve full output shape, all numeric
// and boolean leaves (including intermediate frames), numeric strings, identity
// links and exact machine receipts. This does not reduce results to summaries.
function mechanics(value, key = '') {
  if (key === 'receipt') return plain(value);
  if (Array.isArray(value)) return value.map(item => mechanics(item));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mechanics(v, k)]));
  if (typeof value === 'string') {
    if (['id', 'from', 'to', 'tone'].includes(key) || /^-?\d+(?:\.\d+)?$/.test(value)) return value;
    return '<human text>';
  }
  return value;
}
function variants(lab) {
  const base = defaults(lab), cases = [base];
  for (const scenario of lab.scenarios || []) cases.push({ ...base, ...scenario.values });
  for (const c of lab.controls) {
    const values = c.type === 'checkbox' ? [!c.value]
      : c.type === 'select' ? c.options.map(o => o.value)
      : c.type === 'range' || c.type === 'number' ? [c.min, c.max, c.value + (c.step || 1), -1, 1.5, true]
      : ['', c.value + ',share', '7', ...Object.values(base).filter(x => typeof x === 'string'), '<img src=x onerror=alert(1)>'];
    for (const value of values) if (value !== undefined) cases.push({ ...base, [c.key]: value });
  }
  return cases;
}
let totalCases = 0, successfulCases = 0, rejectionCases = 0;
for (const [slug, count] of Object.entries(projects)) {
  test(`${slug}: complete Chinese fields, real registration and frozen calculation parity`, () => {
    const candidate = load(slug), original = load(slug, true);
    const ids = slug === 'research-report-agent' ? rraIds : Array.from({ length: count }, (_, i) => `pj-${slug}-${i + 1}`);
    assert.deepEqual([...candidate.configs.keys()], ids);
    assert.deepEqual([...original.configs.keys()], ids);
    for (const id of ids) {
      const current = candidate.configs.get(id), old = original.configs.get(id);
      if (slug === 'research-report-agent') {
        const host = candidate.hosts.get(id);
        chinese(host.querySelector('.lf-label').textContent);
        chinese(host.querySelector('.lf-head').children[1].textContent);
        chinese(host.querySelector('.lf-cap').textContent);
      } else {
        chinese(current.title); chinese(current.caption);
        for (const step of current.steps || []) chinese(step.label);
        if (current.lab.question) chinese(current.lab.question);
      }
      for (const c of current.lab.controls) {
        chinese(c.label);
        for (const o of c.options || []) if (!/^[A-D](, [A-D])*$/.test(o.label)) chinese(o.label);
      }
      for (const scenario of current.lab.scenarios || []) chinese(scenario.label);
      assert.deepEqual(controls(current.lab), controls(old.lab), id + ' control schema/default/fixture');
      assert.deepEqual(plain((current.lab.scenarios || []).map(s => s.values)), plain((old.lab.scenarios || []).map(s => s.values)));
      let changed = false;
      const base = mechanics(plain(current.lab.calculate(defaults(current.lab), 0)));
      for (const values of variants(old.lab)) {
        totalCases++;
        const input = JSON.stringify(values);
        let a, b, errorA, errorB;
        try { a = plain(current.lab.calculate(values, 0)); } catch (e) { errorA = e; }
        assert.equal(JSON.stringify(values), input, id + ' input mutated');
        try { b = plain(old.lab.calculate(values, 0)); } catch (e) { errorB = e; }
        assert.equal(!!errorA, !!errorB, id + ' rejection parity: ' + input);
        if (errorA) { rejectionCases++; continue; }
        successfulCases++;
        assert.deepEqual(mechanics(a), mechanics(b), id + ' numeric/boolean/shape/receipt parity: ' + input);
        chinese(a.summary);
        for (const frame of a.frames || []) { chinese(frame.label); chinese(frame.explanation); }
        for (const metric of a.metrics || []) if (metric.label !== 'IDF') chinese(metric.label);
        for (const column of a.columns || []) chinese(column);
        if (JSON.stringify(mechanics(a)) !== JSON.stringify(base)) changed = true;
      }
      assert.ok(changed, id + ' must change computation, not just a human label');
    }
  });
}

test('research-report-agent: eight distinct calculator signals and all causal branches survive translation', () => {
  const { configs, hosts } = load('research-report-agent');
  const calculate = (id, overrides = {}) => {
    const lab = configs.get('pj-rra-' + id).lab;
    return plain(lab.calculate({ ...defaults(lab), ...overrides }));
  };
  assert.equal(calculate('bm25').metrics[1].value, '2.0033');
  assert.notEqual(calculate('bm25', { tf: 0 }).metrics[1].value, calculate('bm25').metrics[1].value);
  assert.equal(calculate('snippet-offsets').metrics[2].value, true);
  assert.equal(calculate('snippet-offsets', { quote: 'fabricated' }).metrics[2].value, false);
  assert.match(calculate('plan-facets').summary, /^模型/);
  assert.match(calculate('plan-facets', { reply: 'not JSON' }).summary, /^规则回退/);
  assert.match(calculate('plan-facets', { useModel: false }).summary, /^规则:/);
  assert.deepEqual(calculate('plan-facets').rows, [['When do guest tokens expire?', 'tokens, expire']]);
  assert.equal(calculate('cited-writer').metrics[1].value, 1);
  assert.equal(calculate('cited-writer', { text: 'No citation. Unknown [S99].' }).metrics[1].value, 0);
  assert.match(calculate('critic').summary, /^数字改变/);
  assert.match(calculate('critic', { claim: 'Tokens never expire after 15 minutes.' }).summary, /^否定改变/);
  assert.match(calculate('critic', { used: 5 }).summary, /^预算耗尽/);
  assert.match(calculate('publish', { snippet: 'fabricated' }).summary, /拒绝/);
  assert.equal(calculate('publish').rows[0][1], 'Orchard &lt;policy&gt; audit');
  assert.match(calculate('scorecard', { expected: 0, found: 0, facts: 0, covered: 0 }).summary, /80\.00/);
  assert.match(calculate('pipeline', { budget: 4 }).summary, /停止/);
  assert.match(calculate('pipeline', { documents: 0 }).summary, /没有/);
  const visible = [...hosts.values()].map(h => h.textContent).join('\n');
  assert.match(visible, /容器共享宿主内核/);
  assert.match(visible, /每个句子以引用标记结尾/);
  assert.ok(!visible.includes('BM25 RANKING'));
});

test('all owned providers mount through the real shared runtime and input events recompute', () => {
  for (const slug of Object.keys(projects)) {
    const { hosts } = load(slug, false, true);
    assert.equal(hosts.size, projects[slug]);
    for (const [id, host] of hosts) {
      const lab = host.querySelector('.pj-mechanism-lab'); assert.ok(lab, id);
      const inputs = lab.querySelectorAll('input').concat(lab.querySelectorAll('select'));
      const renderedResult = () => lab.querySelector('.pj-trace-state').textContent + lab.querySelector('.pj-lab-message').textContent;
      const before = renderedResult();
      for (const input of inputs) {
        if (input.getAttribute('type') === 'checkbox') { input.checked = !input.checked; input.dispatch('change'); }
        else if (input.getAttribute('type') === 'text') { input.value = '<script>not markup</script>'; input.dispatch('input'); }
        else if (input.tagName === 'select') { input.value = input.children.at(-1).getAttribute('value'); input.dispatch('change'); }
        else { input.value = String(Number(input.value) + Number(input.getAttribute('step') || 1)); input.dispatch('input'); }
        if (renderedResult() !== before) break;
      }
      assert.notEqual(renderedResult(), before, id + ' input must change the calculated result, not just the control readout');
      assert.equal(lab.querySelector('script'), null);
    }
  }
});

test('source-named lexical, protocol and evidence fixtures remain byte-identical', () => {
  for (const slug of Object.keys(projects)) {
    const old = source(slug, true), current = source(slug, false);
    for (const literal of old.match(/\/(?:\\.|[^/\n])+\/[dgimsuvy]*(?=[),;.])/g) || []) {
      assert.ok(current.includes(literal), slug + ': regex rule changed: ' + literal);
    }
    for (const signature of old.match(/function\s+[A-Za-z_$][\w$]*\([^)]*\)/g) || []) assert.ok(current.includes(signature), slug + ': signature changed');
  }
  const rra = source('research-report-agent', true), currentRra = source('research-report-agent', false);
  for (const name of ['sents', 'sn']) {
    const array = rra.match(new RegExp('var ' + name + ' = \\[([\\s\\S]*?)\\n    \\];'))?.[0];
    assert.ok(array); assert.ok(currentRra.includes(array), name + ' evidence fixture changed');
  }
  const mcp = source('mcp-at-scale', true);
  const toolGeneration = mcp.slice(mcp.indexOf('    const resources ='), mcp.indexOf('    const used ='));
  assert.ok(source('mcp-at-scale', false).includes(toolGeneration), 'MCP schema serialization/ranking changed');
  const memory = source('memory-server', true);
  const retrieval = memory.slice(memory.indexOf('    const tokens ='), memory.indexOf('    return {'));
  assert.ok(source('memory-server', false).includes(retrieval), 'feature hashing/retrieval changed');
});

test('agent-budget-planner: Chinese validation and rejection frames preserve ledger state and units', () => {
  const { configs } = load('agent-budget-planner');
  const calculate = (stage, overrides = {}) => {
    const lab = configs.get('pj-agent-budget-planner-' + stage).lab;
    return plain(lab.calculate({ ...defaults(lab), ...overrides }));
  };
  for (let stage = 1; stage <= 4; stage++) {
    for (const control of configs.get('pj-agent-budget-planner-' + stage).lab.controls.filter(c => c.type === 'number')) {
      for (const invalid of [-1, 1.5, true, null, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => calculate(stage, { [control.key]: invalid }), /非负安全整数/);
      }
    }
  }
  assert.throws(() => calculate(1, { inputTokens: Number.MAX_SAFE_INTEGER, inputRate: 2 }), /输入乘积/);
  assert.throws(() => calculate(2, { limit: 10 }), /不能超出限额/);
  assert.equal(calculate(2, { amount: 50 }).bars.find(b => b.label === '可用').value, 0);
  assert.equal(calculate(3).bars.find(b => b.label === '可用').value, 60);
  const replay = calculate(4);
  const rejected = replay.frames.filter(frame => /因.*拒绝/.test(frame.label));
  assert.equal(rejected.length, 2);
  for (const frame of rejected) {
    const previous = replay.frames[replay.frames.indexOf(frame) - 1];
    assert.deepEqual(frame.receipt.ledger, previous.receipt.ledger);
    assert.equal(frame.receipt.elapsed_ms, previous.receipt.elapsed_ms);
  }
  assert.equal(replay.frames.some(frame => frame.label === 'C：检查预算'), false);
  const bars = calculate(4, { deadline: 200 }).bars;
  const costBars = bars.filter(b => b.unit === '教学单位'); assert.equal(costBars.length, 3);
  assert.ok(costBars.every(b => b.max === 100));
  assert.equal(bars.find(b => b.unit === 'ms').max, 200);
});

test('lane 1 parity coverage evidence', () => {
  assert.ok(totalCases > 600); assert.ok(successfulCases > 500); assert.ok(rejectionCases > 0);
  console.log(`lane 1: 57 IDs; ${totalCases} parity cases (${successfulCases} successful, ${rejectionCases} paired rejections); zero skips`);
});
