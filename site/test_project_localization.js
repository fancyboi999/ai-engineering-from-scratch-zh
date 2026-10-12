'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const MDRender = require('./md-render');

const localizedProjects = [
  'api-tutorial-runner', 'bookmark-path-organizer', 'catalog-record-linker',
  'chart-storyboard-builder', 'community-learning-path-finder', 'configuration-drift-explainer',
  'csv-repair-workbench', 'database-migration-rehearsal', 'dataset-contract-gate',
  'decision-tradeoff-explorer', 'diagram-reading-companion', 'download-folder-sort-desk',
  'field-notes-map-builder', 'glossary-hovercard-publisher', 'hedged-request-lab',
  'infrastructure-plan-explainer', 'kubernetes-event-storyboard', 'log-volume-reduction-lab',
  'plain-language-rewrite-desk', 'retry-storm-lab', 'sensitive-text-redaction-gate',
  'service-ownership-navigator', 'signed-webhook-inbox', 'streaming-answer-recovery',
  'subtitle-localization-desk', 'ui-string-localization-workbench',
  'vocabulary-autocomplete-pad', 'workshop-materials-planner',
];
function chinese(value) { assert.match(value, /[\u4e00-\u9fff]/); }
function configs(slug) {
  const registry = new Map();
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'figures/projects', slug + '.js'), 'utf8'), {
    window: { AIFSProjectFigures: { register(id, config) { registry.set(id, config); } } },
    URL, TextEncoder,
  });
  return registry;
}
for (const slug of localizedProjects) {
  test(`${slug}: Chinese mechanism labels retain four calculated stages`, async () => {
    const registry = configs(slug);
    assert.equal(registry.size, 4);
    for (let stage = 1; stage <= 4; stage++) {
      const config = registry.get(`pj-${slug}-${stage}`);
      assert.ok(config);
      chinese(config.title); chinese(config.caption);
      for (const step of config.steps) chinese(step.label);
      for (const control of config.lab.controls) {
        if (control.label !== 'SVG ID') chinese(control.label);
        for (const option of control.options || []) chinese(option.label);
      }
      const defaults = Object.fromEntries(config.lab.controls.map(control => [control.key, control.value]));
      const baseline = JSON.stringify(await config.lab.calculate(defaults, 0));
      let changed = false;
      for (const control of config.lab.controls) {
        const variants = control.type === 'checkbox' ? [!control.value]
          : control.type === 'range' || control.type === 'number' ? [control.min, control.max, control.max === undefined ? control.value + 1 : control.max]
          : control.type === 'select' ? control.options.map(option => option.value)
          : ['7', control.value + ',share', ...Object.values(defaults).filter(value => typeof value === 'string')];
        for (const value of variants) {
          if (value === undefined || value === control.value) continue;
          try {
            const result = await config.lab.calculate({ ...defaults, [control.key]: value }, 0);
            if (JSON.stringify(result) !== baseline) changed = true;
          } catch (_) { /* Invalid text is not evidence of a changed calculation. */ }
        }
      }
      assert.ok(changed, `stage ${stage}: controls must update actual calculated output`);
    }
  });
}

test('projects.js delegates all Markdown rendering to MDRender and resolves source links without changing code', () => {
  const root = { setAttribute() {} };
  const context = {
    window: { MDRender, matchMedia: () => ({ matches: false }) },
    document: {
      documentElement: root, currentScript: null,
      body: { getAttribute: () => '' },
      querySelectorAll: () => [], addEventListener() {},
      getElementById: id => id === 'main' ? { addEventListener() {} } : null,
    },
    localStorage: { getItem: () => null }, URL,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'projects.js'), 'utf8'), context);
  const md = '# 中文项目\n\n> 实际计算。\n\n```figure\npj-test-1\n```\n\n[参考解](../solution/main.py)\n\n```python\nprint("[示例](../raw)")\n```';
  const source = md.replace('[参考解](../solution/main.py)', '[参考解](https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/projects/test/stages/01/solution/main.py)');
  const result = context.window.AIFSProjectsMarkdown(md, 'projects/test/stages/01/docs');
  assert.equal(result.title, MDRender.extractTitle(source));
  assert.equal(result.html, MDRender.parseMd(source));
  assert.match(result.html, /data-figure="pj-test-1"/);
  assert.match(result.html, /参考解/);
  assert.match(result.html, /\.\.\/raw/);
  assert.ok(!fs.readFileSync(path.join(__dirname, 'projects.js'), 'utf8').includes('function inline('));
});

test('project Markdown keeps root-relative course links on the Chinese lesson route', () => {
  const source = fs.readFileSync(path.join(__dirname, 'projects.js'), 'utf8');
  const renderSource = source.slice(source.indexOf('  function renderMarkdown('), source.indexOf('  function sourceBadge('));
  const context = { window: { MDRender }, repoFileUrl: value => 'https://github.com/fancyboi999/ai-engineering-from-scratch-zh/blob/main/' + value };
  vm.runInNewContext(renderSource + '\nresult = renderMarkdown("[agent 循环](phases/14-agent-engineering/01-the-agent-loop/)", "projects/test/stages/01/docs");', context);
  assert.match(context.result.html, /href="lesson\.html\?path=phases\/14-agent-engineering\/01-the-agent-loop"/);
});
