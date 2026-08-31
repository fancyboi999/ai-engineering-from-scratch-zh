#!/usr/bin/env node
'use strict';

/*
 * Reproducible audit for the lazy lesson-figure loader. It intentionally has
 * no npm dependency: run `node scripts/check_figure_loader.js` from the repo.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const manifestPath = path.join(site, 'figures-manifest.js');
const lessonPath = path.join(site, 'lesson.html');
const MCP_OVERRIDES = new Map([
  ['mcp-tool-call', 'figures-llms-systems.js'],
  ['t3-dispatch-loop', 'figures-tools3.js'],
  ['t3-gateway-funnel', 'figures-tools3.js'],
  ['t3-jwks-rotate', 'figures-tools3.js'],
  ['t3-primitive-sort', 'figures-tools3.js'],
  ['t3-roots-boundary', 'figures-tools3.js'],
  ['t3-sampling-flip', 'figures-tools3.js'],
  ['t3-scope-stepup', 'figures-tools3.js'],
  ['t3-ui-sandbox', 'figures-tools3.js'],
  ['tp-client-merge', 'figures-tools2.js'],
  ['tp-task-lifecycle', 'figures-tools2.js'],
  ['tp-tool-poisoning', 'figures-tools2.js'],
  ['tp-transport-handshake', 'figures-tools2.js'],
]);

function createLoader(failingSource, failuresBeforeSuccess) {
  const requests = [];
  const warnings = [];
  const mounts = [];
  let failures = 0;
  const document = {
    currentScript: { src: 'https://course.example/figures-manifest.js?v=test' },
    createElement() {
      return {
        setAttribute() {},
        onload: null,
        onerror: null,
        src: '',
      };
    },
    head: {
      appendChild(node) {
        requests.push(node.src);
        queueMicrotask(function () {
          if (node.src.includes(failingSource || '__never_fail__') &&
              failures < (failuresBeforeSuccess === undefined ? Infinity : failuresBeforeSuccess)) {
            failures++;
            node.onerror();
          }
          else node.onload();
        });
      },
    },
  };
  const window = {
    mountLessonFigures(scope) { mounts.push(scope); },
  };
  const context = {
    Promise,
    console: { warn(message) { warnings.push(message); } },
    document,
    window,
  };
  vm.runInNewContext(fs.readFileSync(manifestPath, 'utf8'), context, { filename: manifestPath });
  return { window, requests, warnings, mounts };
}

function host(name) {
  return {
    getAttribute(attr) { return attr === 'data-figure' ? name : null; },
  };
}

function scope(names) {
  const hosts = names.map(host);
  return {
    matches() { return false; },
    querySelectorAll(selector) {
      assert.equal(selector, '.lesson-figure[data-figure]');
      return hosts;
    },
  };
}

function registeredFigures(source) {
  const start = source.indexOf('LF.register({');
  if (start === -1 && source.includes('LF.register(figures)')) {
    return objectFigures(source, 'var figures = {');
  }
  const end = source.indexOf('\n  });', start);
  assert.notEqual(start, -1, 'missing LF.register block');
  assert.notEqual(end, -1, 'unterminated LF.register block');
  return [...source.slice(start, end).matchAll(/(?:^|\n)\s*['\"]([^'\"]+)['\"]\s*:/g)].map(function (match) {
    return match[1];
  });
}

function objectFigures(source, declaration) {
  const start = source.indexOf(declaration);
  const end = source.indexOf('\n  };', start);
  assert.notEqual(start, -1, 'missing figure object: ' + declaration);
  assert.notEqual(end, -1, 'unterminated figure object: ' + declaration);
  return [...source.slice(start, end).matchAll(/(?:^|\n)\s*['\"]([^'\"]+)['\"]\s*:/g)].map(function (match) {
    return match[1];
  });
}

function certificationFigures(source, filename) {
  let registered = null;
  const LF = {
    el() { return {}; },
    slider() { return {}; },
    select() { return {}; },
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    register(figures) { registered = figures; },
  };
  vm.runInNewContext(source, {
    window: { LF },
    document: {},
    console,
  }, { filename });
  assert.ok(registered && typeof registered === 'object', 'certification renderer must register a figure map');
  return Object.keys(registered);
}

function allZhDocs(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...allZhDocs(full));
    else if (full.endsWith('/docs/zh.md')) files.push(full);
  }
  return files;
}

function figureFences(files) {
  const names = [];
  for (const file of files) {
    const markdown = fs.readFileSync(file, 'utf8');
    for (const match of markdown.matchAll(/```figure\s*\n([\s\S]*?)\n```/g)) {
      names.push(match[1].trim().split(/\s+/, 1)[0]);
    }
  }
  return names;
}

function staticRegistry() {
  const lesson = fs.readFileSync(lessonPath, 'utf8');
  const entries = [];
  entries.push(['figures.js', objectFigures(fs.readFileSync(path.join(site, 'figures.js'), 'utf8'), 'const FIGURES = {')]);
  entries.push(['lesson-figures.js', objectFigures(fs.readFileSync(path.join(site, 'lesson-figures.js'), 'utf8'), 'var FIGS = {')]);
  for (const match of lesson.matchAll(/<script src="(figures-[^"]+\.js\?[^" ]+)"/g)) {
    const source = match[1].split('?')[0];
    if (source === 'figures-manifest.js') continue;
    const sourceText = fs.readFileSync(path.join(site, source), 'utf8');
    entries.push([source, source === 'figures-claude-certifications.js'
      ? certificationFigures(sourceText, path.join(site, source))
      : registeredFigures(sourceText)]);
  }
  return entries;
}

function assertUnique(entries, label) {
  const owners = new Map();
  for (const [source, figures] of entries) {
    for (const figure of figures) {
      assert.ok(!owners.has(figure), label + ' duplicate: ' + figure + ' in ' + owners.get(figure) + ' and ' + source);
      owners.set(figure, source);
    }
  }
  return owners;
}

function overlayRegistry(entries, label, allowedOverrides) {
  const owners = new Map();
  for (const [source, figures] of entries) {
    for (const figure of figures) {
      if (owners.has(figure)) {
        const previous = owners.get(figure);
        const expectedBase = allowedOverrides.get(figure);
        if (previous === 'figures-mcp.js' && expectedBase === source) continue;
        if (source !== 'figures-mcp.js' || expectedBase !== previous) {
          assert.fail(label + ' duplicate: ' + figure + ' in ' + previous + ' and ' + source);
        }
      }
      owners.set(figure, source);
    }
  }
  return owners;
}

async function main() {
  const loader = createLoader();
  const mapping = loader.window.AIFS_FIGURE_TO_MODULE;
  const names = Object.keys(mapping);
  assert.ok(names.length > 0, 'manifest must map at least one figure');

  // Derive the lazy set from repository state so this audit remains valid on
  // main and in later PRs, where the renderer files are no longer Git additions.
  const staticEntries = staticRegistry();
  const staticModules = new Set(staticEntries.map(function (entry) { return entry[0]; }));
  const lazyModules = fs.readdirSync(site)
    .filter(function (file) { return /^figures-.*\.js$/.test(file); })
    .filter(function (file) {
      return !staticModules.has(file) &&
        fs.readFileSync(path.join(site, file), 'utf8').includes('LF.register(');
    })
    .sort();

  const lazyEntries = lazyModules.map(function (source) {
    return [source, registeredFigures(fs.readFileSync(path.join(site, source), 'utf8'))];
  });
  const lazyRegistry = overlayRegistry(lazyEntries, 'lazy registry', MCP_OVERRIDES);

  // Each manifest entry must name one source file, and exactly mirror the
  // independently parsed registrations from those 41 files.
  const byModule = new Map();
  for (const name of names) {
    const source = mapping[name].split('?')[0];
    assert.ok(fs.existsSync(path.join(site, source)), 'missing renderer: ' + source);
    const figures = byModule.get(source) || [];
    figures.push(name);
    byModule.set(source, figures);
  }
  for (const [source, figures] of byModule) {
    const actual = registeredFigures(fs.readFileSync(path.join(site, source), 'utf8'))
      .filter(function (name) { return lazyRegistry.get(name) === source; })
      .sort();
    assert.deepEqual([...figures].sort(), actual, 'manifest drift for ' + source);
  }
  assert.deepEqual([...byModule.keys()].sort(), [...lazyRegistry.keys()].map(function (name) {
    return lazyRegistry.get(name);
  }).filter(function (value, index, all) { return all.indexOf(value) === index; }).sort(),
  'manifest module set must equal the repository lazy renderer modules');

  const lesson = fs.readFileSync(lessonPath, 'utf8');
  assert.match(lesson, /window\.AIFS_mountLessonFigures\(el\)/);
  assert.ok((lesson.match(/enhanceLesson\(\);/g) || []).length >= 2,
    'both prerender and runtime paths must retain the shared enhancement hook');

  const legacyRegistry = assertUnique(staticEntries, 'legacy registry');
  const completeRegistry = overlayRegistry([
    ...staticEntries,
    ...lazyEntries,
  ], 'complete registry', MCP_OVERRIDES);
  const fenceNames = figureFences(allZhDocs(path.join(root, 'phases')));
  assert.equal(new Set(fenceNames).size, fenceNames.length, 'figure fence names must be unique');
  const missing = fenceNames.filter(function (name) { return !completeRegistry.has(name); });
  assert.deepEqual(missing, [], 'every zh figure fence must have a renderer');
  const certFenceNames = figureFences(allZhDocs(path.join(root, 'certifications', 'claude', 'lessons')));
  assert.equal(certFenceNames.length, 33, 'all certification figure fences must be counted');
  assert.equal(new Set(certFenceNames).size, 33, 'certification figure fence names must be unique');
  const missingCert = certFenceNames.filter(function (name) { return !completeRegistry.has(name); });
  assert.deepEqual(missingCert, [], 'every certification figure fence must have a renderer');
  assert.ok(legacyRegistry.size > 0, 'legacy static renderers must remain registered');

  const noFigure = createLoader();
  assert.equal(await noFigure.window.AIFS_mountLessonFigures(scope([])), false);
  assert.deepEqual(noFigure.requests, []);
  assert.deepEqual(noFigure.mounts, []);

  const single = createLoader();
  assert.equal(await single.window.AIFS_mountLessonFigures(scope(['few-shot-curve'])), true);
  assert.deepEqual(single.requests, [
    'https://course.example/figures-llmeng.js?v=20260801a',
    'https://course.example/figures-i18n-zh.js?v=20260804a',
  ]);
  assert.equal(single.mounts.length, 1);

  const multi = createLoader();
  await Promise.all([
    multi.window.AIFS_mountLessonFigures(scope(['few-shot-curve', 'al-instruct-pipeline'])),
    multi.window.AIFS_mountLessonFigures(scope(['al-instruct-pipeline', 'few-shot-curve'])),
  ]);
  assert.deepEqual(multi.requests, [
    'https://course.example/figures-llmeng.js?v=20260801a',
    'https://course.example/figures-alignment3.js?v=20260801a',
    'https://course.example/figures-i18n-zh.js?v=20260804a',
  ]);
  assert.equal(multi.mounts.length, 2, 'mount may be retried; renderer-level markers make it idempotent');

  const spa = createLoader();
  await spa.window.AIFS_mountLessonFigures(scope(['few-shot-curve']));
  await spa.window.AIFS_mountLessonFigures(scope(['al-instruct-pipeline']));
  assert.deepEqual(spa.requests, [
    'https://course.example/figures-llmeng.js?v=20260801a',
    'https://course.example/figures-i18n-zh.js?v=20260804a',
    'https://course.example/figures-alignment3.js?v=20260801a',
  ], 'a SPA remount loads only its new module; i18n stays loaded before each mount');
  assert.equal(spa.mounts.length, 2);

  const failed = createLoader('figures-llmeng.js');
  assert.equal(await failed.window.AIFS_mountLessonFigures(scope(['few-shot-curve'])), true);
  assert.deepEqual(failed.requests, [
    'https://course.example/figures-llmeng.js?v=20260801a',
    'https://course.example/figures-i18n-zh.js?v=20260804a',
  ]);
  assert.equal(failed.mounts.length, 1, 'a failed module must not block mounting the lesson body');
  assert.equal(failed.warnings.length, 1);

  const retry = createLoader('figures-llmeng.js', 1);
  await retry.window.AIFS_mountLessonFigures(scope(['few-shot-curve']));
  await retry.window.AIFS_mountLessonFigures(scope(['few-shot-curve']));
  assert.deepEqual(retry.requests, [
    'https://course.example/figures-llmeng.js?v=20260801a',
    'https://course.example/figures-i18n-zh.js?v=20260804a',
    'https://course.example/figures-llmeng.js?v=20260801a',
  ], 'a later mount must retry a previously failed module without reloading i18n');
  assert.equal(retry.mounts.length, 2);

  console.log('figure loader audit passed: ' + names.length + ' lazy figures across ' + byModule.size +
    ' modules; ' + fenceNames.length + '/' + fenceNames.length + ' core fences and 33/33 certification fences covered');
}

main().catch(function (error) {
  console.error(error.stack || error);
  process.exitCode = 1;
});
