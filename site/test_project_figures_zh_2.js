'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { webcrypto } = require('node:crypto');

// The import checkpoint is byte-identical to the frozen upstream providers.
// CI supplies the pinned upstream tree; local Git is a fallback, never a skip.
const referenceCommit = '04e84b1a213c620c860a0d169ea9524e17c0f513';
const slugs = [
  'agent-trace-debugger', 'changelog-writer-from-git', 'cloud-agent-with-aws-strands',
  'csv-sql-question-workbench', 'dataset-split-auditor', 'doc-qa-with-citations',
  'harness-bench', 'json-schema-output-guard', 'multi-agent-code-review-panel',
  'postmortem-writer', 'rag-freshness-pipeline', 'report-judge',
  'retrieval-evaluation-lab', 'semantic-notes-search', 'skill-installer',
  'skill-router', 'source-grounded-study-coach', 'visual-evidence-library',
];
const clone = value => JSON.parse(JSON.stringify(value));
const chinese = (value, where) => assert.match(value, /[\u4e00-\u9fff]/u, where);
function source(slug, reference = false) {
  const relative = `site/figures/projects/${slug}.js`;
  if (reference) {
    const frozenRoot = process.env.AIFS_FIGURE_FROZEN_ROOT || process.env.AIFS_FIGURES_FROZEN_ROOT;
    if (frozenRoot) return fs.readFileSync(path.join(frozenRoot, relative), 'utf8');
    return execFileSync('git', ['show', `${referenceCommit}:${relative}`], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  }
  return fs.readFileSync(path.join(__dirname, 'figures/projects', `${slug}.js`), 'utf8');
}
function configs(slug, reference = false) {
  const registry = new Map();
  vm.runInNewContext(source(slug, reference), {
    window: { crypto: webcrypto, AIFSProjectFigures: { register(id, config) {
      assert.ok(!registry.has(id), `duplicate registration: ${id}`);
      registry.set(id, config);
    } } }, TextEncoder,
  });
  return registry;
}
function schema(config) {
  return clone(config.lab.controls.map(({ label, options, ...control }) => ({
    ...control, ...(options ? { options: options.map(({ label, ...option }) => option) } : {}),
  })));
}
const displayKeys = new Set(['title', 'caption', 'label', 'detail', 'explanation', 'summary', 'columns', 'formula']);
const machineKeys = new Set(['id', 'from', 'to', 'tone', 'unit']);
const signals = new Set([
  'yes', 'no', 'accept', 'reject', 'valid', 'invalid', 'fits', 'exceeded', 'propose',
  'compatible', 'incompatible', 'found', 'missing', 'pending', 'stale approval', 'approved',
  'REAL', 'TEXT', 'unchanged', 'update', 'delete', 'refresh', 'train', 'test',
  'due', 'later', 'no_evidence', 'lexical_match', 'needs_review', 'model-proposed', 'unjudged',
]);
function machineSignal(value) {
  if (signals.has(value)) return value;
  const suffix = value.match(/（([^（）]+)）$/u)?.[1];
  return suffix && signals.has(suffix) ? suffix : null;
}
// Preserve exact receipts, graph IDs, tone/unit, all numbers/Booleans, numeric
// strings and display-row enums; human prose is allowed to change language.
function structure(value, key = '') {
  if (key === 'receipt' || machineKeys.has(key)) return clone(value);
  if (Array.isArray(value)) return value.map(entry => structure(entry));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([name]) => !displayKeys.has(name)).map(([name, entry]) => [name, structure(entry, name)]));
  if (typeof value === 'string') {
    if (/^-?\d+(?:\.\d+)?(?:%| px)?$/.test(value)) return value;
    return machineSignal(value) ?? '<display-or-fixture-text>';
  }
  return value;
}
function cases(config) {
  const defaults = Object.fromEntries(config.lab.controls.map(c => [c.key, c.value]));
  const result = [defaults];
  for (const scenario of config.lab.scenarios || []) result.push({ ...defaults, ...scenario.values });
  for (const c of config.lab.controls) {
    const values = c.type === 'checkbox' ? [!c.value]
      : c.type === 'select' ? c.options.map(option => option.value)
      : ['range', 'number'].includes(c.type) ? [c.min, c.max, c.value + (c.step || 1)]
      : ['', '7', '<script>alert("中文")</script>&', c.value + ',share',
        ...Object.values(defaults).filter(value => typeof value === 'string')];
    for (const value of values) if (value !== undefined && value !== c.value) result.push({ ...defaults, [c.key]: value });
  }
  return [...new Map(result.map(value => [JSON.stringify(value), value])).values()];
}
function unchangedOutputText(current, reference, key = '') {
  if (displayKeys.has(key)) return;
  if (Array.isArray(reference)) reference.forEach((entry, i) => unchangedOutputText(current[i], entry));
  else if (reference && typeof reference === 'object') {
    for (const [name, entry] of Object.entries(reference)) unchangedOutputText(current[name], entry, name);
  } else if (typeof reference === 'string' && typeof current === 'string' && !/[\u4e00-\u9fff]/u.test(current)) {
    assert.equal(current, reference, 'untranslated fixture/enum/technical text must remain byte-identical');
  }
}
async function compute(config, values, step) {
  try { return { ok: true, value: clone(await config.lab.calculate(values, step)) }; }
  catch (error) { return { ok: false, name: error.name, message: error.message }; }
}
function visibleLabels(result, id) {
  if (result.frames) {
    for (const frame of result.frames) {
      chinese(frame.label, `${id}: frame label`);
      chinese(frame.explanation, `${id}: explanation`);
      visibleLabels(frame, id);
    }
  }
  if (result.summary) chinese(result.summary, `${id}: summary`);
  for (const metric of result.metrics || []) chinese(metric.label, `${id}: metric`);
  for (const bar of result.bars || []) chinese(bar.label, `${id}: bar`);
  for (const lane of result.lanes || []) chinese(lane.label, `${id}: lane`);
  for (const link of result.links || []) chinese(link.label, `${id}: link`);
  for (const column of result.columns || []) {
    if (!['ID', 'IDF', 'SQL'].includes(column)) chinese(column, `${id}: column`);
  }
}
let comparisons = 0, rejected = 0;
for (const slug of slugs) {
  test(`${slug}: four registered Chinese stages preserve controls, fixtures and frozen calculation`, async t => {
    const current = configs(slug), reference = configs(slug, true);
    assert.deepEqual([...current.keys()], [1, 2, 3, 4].map(n => `pj-${slug}-${n}`));
    assert.deepEqual([...current.keys()], [...reference.keys()]);
    let count = 0, invalid = 0;
    for (const [id, config] of current) {
      const original = reference.get(id);
      chinese(config.title, id); chinese(config.caption, id);
      for (const step of config.steps || []) chinese(step.label, `${id}: step`);
      for (const control of config.lab.controls) {
        chinese(control.label, `${id}: control`);
        for (const option of control.options || []) {
          // Product names stay in English per TRANSLATION.md.
          if (!['Codex', 'Claude', 'Cursor'].includes(option.label)) chinese(option.label, `${id}: option`);
        }
      }
      if (config.lab.question) chinese(config.lab.question, `${id}: question`);
      for (const scenario of config.lab.scenarios || []) chinese(scenario.label, `${id}: scenario`);
      assert.deepEqual(schema(config), schema(original), `${id}: machine control schema/default fixtures`);
      assert.deepEqual(clone((config.lab.scenarios || []).map(x => x.values)),
        clone((original.lab.scenarios || []).map(x => x.values)), `${id}: scenario fixture bytes`);
      const inputs = cases(original);
      const baseline = await compute(original, inputs[0], 0);
      assert.equal(baseline.ok, true, `${id}: valid default`);
      let changed = false;
      for (let step = 0; step < Math.max(1, config.steps?.length || 0); step++) {
        for (const values of inputs) {
          const a = await compute(original, values, step), b = await compute(config, values, step);
          count++;
          assert.equal(b.ok, a.ok, `${id}: acceptance branch for ${JSON.stringify(values)}`);
          if (!a.ok) {
            invalid++; assert.equal(b.name, a.name);
            // Native JSON.parse diagnostics are engine text, not authored prose.
            if (a.name === 'SyntaxError') assert.equal(b.message, a.message);
            else chinese(b.message, `${id}: error`);
            continue;
          }
          assert.deepEqual(structure(b.value), structure(a.value), `${id}: computed machine output`);
          unchangedOutputText(b.value, a.value);
          visibleLabels(b.value, id);
          if (JSON.stringify(structure(a.value)) !== JSON.stringify(structure(baseline.value))) changed = true;
        }
      }
      assert.ok(changed, `${id}: controls change computed numbers, Booleans, enums or exact receipts`);
    }
    comparisons += count; rejected += invalid;
    t.diagnostic(`${count} default/boundary/scenario/step comparisons; ${invalid} matched rejections`);
  });
}
test('calculation prefixes retain arithmetic, validation flow and function signatures', () => {
  const literal = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
  const prefixes = text => [...text.matchAll(/(?:const calculate = function \([^)]*\)|calculate\([^)]*\)|calculate: async values =>)\s*\{/g)]
    .map(match => text.slice(match.index, text.indexOf('return', match.index)).replace(literal, '"<literal>"'));
  for (const slug of slugs) {
    const current = prefixes(source(slug)), original = prefixes(source(slug, true));
    assert.ok(original.length > 0, slug);
    assert.deepEqual(current, original, `${slug}: computation before first result`);
  }
  const dataset = source('dataset-split-auditor'), reference = source('dataset-split-auditor', true);
  for (const name of ['foldRanges', 'foldExceptions']) {
    const declaration = text => text.slice(text.indexOf(`const ${name} =`), text.indexOf(';', text.indexOf(`const ${name} =`)));
    assert.equal(declaration(dataset), declaration(reference), `${name}: Unicode table unchanged`);
  }
  const fixture = text => {
    const start = text.indexOf('const cases = [');
    return text.slice(start, text.indexOf('];', start) + 2);
  };
  assert.equal(fixture(source('harness-bench')), fixture(source('harness-bench', true)), 'authored model cases unchanged');
});

test('lane 2 comparison coverage is explicit', t => {
  assert.ok(comparisons > 1500);
  t.diagnostic(`${comparisons} comparisons across 72 registered IDs; ${rejected} matched rejections; no skips`);
});

// Reuse the existing read-only DOM test facility, without changing its tests.
const facility = fs.readFileSync(path.join(__dirname, 'test_project_figure_runtime.js'), 'utf8');
const facilityContext = { require, __dirname, exports: {} };
vm.runInNewContext(facility.slice(0, facility.indexOf('\nconst controls =')) + '\nexports.environment = environment;', facilityContext);
const environment = facilityContext.exports.environment;
function completionBoundary(timeoutMs = 5000) {
  const pending = new Set();
  function track(result) {
    if (!result || typeof result.then !== 'function') return result;
    // Observe both outcomes without creating an orphan rejected Promise. The
    // caller still receives the original Promise and its original result/error.
    const observed = Promise.resolve(result).then(
      () => pending.delete(observed), () => pending.delete(observed));
    pending.add(observed);
    return result;
  }
  async function settle() {
    let timer;
    try {
      await Promise.race([
        (async () => {
          // A calculation can launch another digest after its previous digest.
          // Track the full calculation too, so an empty digest queue cannot be
          // mistaken for completion. Runtime's result handlers run before this
          // drain finishes, including the rejection-to-error-message handler.
          while (pending.size) await Promise.all([...pending]);
        })(),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Figure calculation did not settle within ${timeoutMs} ms`)), timeoutMs);
        }),
      ]);
    } finally { clearTimeout(timer); }
  }
  return { track, settle };
}
function runtimeFixture(slug, crypto = webcrypto, timeoutMs = 5000) {
  const env = environment(), providers = new Map(), completion = completionBoundary(timeoutMs);
  env.window.crypto = { subtle: { digest: (...args) => completion.track(crypto.subtle.digest(...args)) } };
  const register = env.window.LF.register;
  env.window.LF.register = entries => { register(entries); for (const [id, render] of Object.entries(entries)) providers.set(id, render); };
  const registerFigure = env.window.AIFSProjectFigures.register;
  env.window.AIFSProjectFigures.register = (id, config) => registerFigure(id, {
    ...config,
    lab: { ...config.lab, calculate: (...args) => completion.track(config.lab.calculate(...args)) },
  });
  vm.runInNewContext(source(slug), { window: env.window, TextEncoder });
  return { env, providers, completion };
}
for (const slug of slugs) {
  test(`${slug}: actual shared-runtime registration renders Chinese text safely`, async () => {
    const { env, providers, completion } = runtimeFixture(slug);
    assert.equal(providers.size, 4);
    for (const [id, render] of providers) {
      const host = env.el('div'); env.document.body.append(host);
      const cleanup = render(host);
      try {
        await completion.settle();
        assert.ok(host.querySelector('.pj-mechanism-lab'), id);
        chinese(host.textContent, `${id}: rendered text`);
        assert.notEqual(host.querySelector('.pj-trace-state').hidden, true, `${id}: computation rendered`);
        assert.equal(host.querySelector('script'), null, `${id}: no HTML injection`);
        const input = host.querySelectorAll('input').find(x => x.getAttribute('type') === 'text');
        if (input) {
          input.value = '<script>alert("中文")</script>&'; input.dispatch('input');
          await completion.settle();
          assert.equal(host.querySelector('script'), null);
          const message = host.querySelector('.pj-lab-message');
          if (message.textContent) chinese(message.textContent, `${id}: error/announcement`);
        }
      } finally {
        cleanup(); host.remove();
        assert.equal(env.timers.size, 0);
      }
    }
    assert.equal(env.timers.size, 0);
  });
}

test('completion boundary waits for held native digests on mount and overlapping input changes', async () => {
  let release, digestCalls = 0;
  let gate = new Promise(resolve => { release = resolve; });
  const crypto = { subtle: { digest(...args) {
    digestCalls++;
    return gate.then(() => webcrypto.subtle.digest(...args));
  } } };
  const { env, providers, completion } = runtimeFixture('dataset-split-auditor', crypto);
  const host = env.el('div'); env.document.body.append(host);
  const cleanup = providers.get('pj-dataset-split-auditor-4')(host);
  try {
    assert.equal(host.querySelector('.pj-trace-state').hidden, true);
    assert.equal(digestCalls, 1);
    const mounted = completion.settle();
    release(); await mounted;
    assert.equal(digestCalls, 2, 'test partition digest launches after train digest');
    assert.equal(host.querySelector('.pj-trace-state').hidden, false);
    assert.equal(host.querySelector('.pj-mechanism-lab').getAttribute('aria-busy'), 'false');
    gate = new Promise(resolve => { release = resolve; });
    const input = host.querySelectorAll('input').find(x => x.getAttribute('type') === 'text');
    input.value = '<script>alert("中文")</script>&'; input.dispatch('input');
    assert.equal(host.querySelector('.pj-mechanism-lab').getAttribute('aria-busy'), 'true');
    assert.equal(digestCalls, 3);
    input.value += ' updated'; input.dispatch('input');
    assert.equal(digestCalls, 4, 'both input revisions have pending calculations');
    const updated = completion.settle();
    release(); await updated;
    assert.equal(digestCalls, 6, 'both revisions complete their serial test digest');
    assert.equal(host.querySelector('.pj-trace-state').hidden, false);
    assert.equal(host.querySelector('.pj-mechanism-lab').getAttribute('aria-busy'), 'false');
    assert.ok(host.textContent.includes(input.value), 'provided text is rendered literally');
    assert.equal(host.querySelector('script'), null);
  } finally {
    release(); cleanup(); host.remove();
    assert.equal(env.timers.size, 0);
  }
});

test('completion boundary follows serial native digests and handled native rejection', async () => {
  const completion = completionBoundary();
  const bytes = new TextEncoder().encode('fixture');
  let result;
  const calculation = completion.track((async () => {
    const first = await completion.track(webcrypto.subtle.digest('SHA-256', bytes));
    return completion.track(webcrypto.subtle.digest('SHA-256', first));
  })());
  calculation.then(value => { result = value; });
  await completion.settle();
  const first = await webcrypto.subtle.digest('SHA-256', bytes);
  const expected = await webcrypto.subtle.digest('SHA-256', first);
  assert.deepEqual(new Uint8Array(result), new Uint8Array(expected));
  const rejected = completion.track(webcrypto.subtle.digest('not-a-digest', bytes));
  let observedError;
  const handled = rejected.catch(error => { observedError = error; });
  await completion.settle(); await handled;
  assert.equal(observedError.name, 'NotSupportedError');
  const crypto = { subtle: { digest: () => webcrypto.subtle.digest('not-a-digest', bytes) } };
  const fixture = runtimeFixture('dataset-split-auditor', crypto);
  const host = fixture.env.el('div'); fixture.env.document.body.append(host);
  const cleanup = fixture.providers.get('pj-dataset-split-auditor-4')(host);
  try {
    await fixture.completion.settle();
    assert.equal(host.querySelector('.pj-trace-state').hidden, true);
    assert.equal(host.querySelector('.pj-mechanism-lab').getAttribute('aria-busy'), 'false');
    chinese(host.querySelector('.pj-lab-message').textContent, 'runtime exposes the rejection');
  } finally {
    cleanup(); host.remove();
    assert.equal(fixture.env.timers.size, 0);
  }
});

test('never-settling digest fails within the explicit bound and still cleans the host', async () => {
  const crypto = { subtle: { digest: () => new Promise(() => {}) } };
  const { env, providers, completion } = runtimeFixture('dataset-split-auditor', crypto, 25);
  const host = env.el('div'); env.document.body.append(host);
  const cleanup = providers.get('pj-dataset-split-auditor-4')(host);
  try {
    await assert.rejects(completion.settle(), /Figure calculation did not settle within 25 ms/);
    assert.equal(host.querySelector('.pj-trace-state').hidden, true, 'incomplete work never counts as rendered');
    assert.equal(host.querySelector('script'), null);
  } finally {
    cleanup(); host.remove();
    assert.equal(env.timers.size, 0);
  }
});

test('display translations keep status signals and policy selections live', async () => {
  const get = (slug, stage) => configs(slug).get(`pj-${slug}-${stage}`).lab;
  const defaults = lab => Object.fromEntries(lab.controls.map(c => [c.key, c.value]));
  const harness = get('harness-bench', 3);
  const outputs = harness.controls.find(c => c.key === 'policy').options.map(option =>
    harness.calculate({ ...defaults(harness), policy: option.value }));
  assert.deepEqual(clone(outputs.map(x => x.bars[0].value)), [1, 2, 3]);
  assert.deepEqual(clone(outputs.map(x => x.bars[1].value)), [3, 4, 3]);
  const router = get('skill-router', 3);
  assert.match(router.calculate({ ...defaults(router), competitor: 0 }).summary, /就绪.*check-tests -> release-review/);
  assert.match(router.calculate({ ...defaults(router), competitor: 0, permission: false }).summary, /受阻/);
  const postmortem = get('postmortem-writer', 4);
  assert.match(postmortem.calculate({ approved: true, changed: true }).summary, /旧决策不能批准新证据/);
  const guard = get('json-schema-output-guard', 1);
  assert.match(guard.calculate({ ...defaults(guard), raw: '{"answer":"retry","confidence":1.5,"<script>":1}' }).rows.flat().join(), /未知属性/);
  const retrieval = get('retrieval-evaluation-lab', 4);
  assert.match(retrieval.calculate({ ...defaults(retrieval), order: 'c,b,a', baseline: 'a,b,c' }).summary, /退步/);
});
