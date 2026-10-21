'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { checkEvidence } = require('./cheatsheet-evidence');

const REVISION = '45fa4084de6ba2f88fa96a41e69efa2166f868b3';
const SOURCE = 'phases/demo/01-lesson';

function fixture(t, { revision = REVISION, ref = 'L01/d:2-3', heading = '启动服务', frozen = true, marker = REVISION, oracle = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cheatsheet-frozen-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const local = path.join(dir, 'local');
  const upstream = path.join(dir, 'upstream');
  const write = (root, file, text) => {
    const full = path.join(root, file);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, text);
  };
  write(local, `${SOURCE}/docs/zh.md`, '本地译文只有一行。\n');
  write(upstream, `${SOURCE}/docs/en.md`, 'one\ntwo\nthree\n');
  if (marker !== null) write(upstream, '.aifs-upstream-revision', `${marker}\n`);
  write(local, 'cheatsheets/evidence/demo.md', [
    '# Evidence: cheatsheets/demo.md',
    ...(frozen ? [`upstream_revision: ${revision}`] : []),
    '',
    `Abbreviations: L01 = ${SOURCE}, d = docs/${frozen ? 'en' : 'zh'}.md.`,
    '',
    `## ${heading}`,
    `- Original source claim: ${ref}`,
    '',
  ].join('\n'));
  const old = process.env.AIFS_CHEATSHEET_EVIDENCE_ROOT;
  if (oracle) process.env.AIFS_CHEATSHEET_EVIDENCE_ROOT = upstream;
  else delete process.env.AIFS_CHEATSHEET_EVIDENCE_ROOT;
  t.after(() => {
    if (old === undefined) delete process.env.AIFS_CHEATSHEET_EVIDENCE_ROOT;
    else process.env.AIFS_CHEATSHEET_EVIDENCE_ROOT = old;
  });
  const map = { topics: [{ id: 'demo', sources: [SOURCE] }] };
  const topics = [{ id: 'demo', blocks: [{ title: '启动服务', rows: [['Start', 'serve']] }] }];
  return { run: () => checkEvidence(map, topics, local), local, upstream };
}

test('frozen evidence resolves English line numbers against the pinned source root', t => {
  const { run } = fixture(t);
  assert.deepEqual(run(), { problems: [], refs: 1 });
});

test('frozen evidence requires an explicit source root', t => {
  const { run } = fixture(t, { oracle: false });
  assert.match(run().problems.join('\n'), /AIFS_CHEATSHEET_EVIDENCE_ROOT is required/);
});

test('frozen evidence rejects an unsupported revision', t => {
  const { run } = fixture(t, { revision: 'f'.repeat(40) });
  assert.match(run().problems.join('\n'), /upstream_revision must be exactly/);
});

test('frozen evidence rejects a missing revision marker', t => {
  const { run } = fixture(t, { marker: null });
  assert.match(run().problems.join('\n'), /must contain .aifs-upstream-revision matching/);
});

test('frozen evidence rejects a source root for another revision', t => {
  const { run } = fixture(t, { marker: 'f'.repeat(40) });
  assert.match(run().problems.join('\n'), /must contain .aifs-upstream-revision matching/);
});

test('frozen evidence rejects an out-of-bounds upstream line', t => {
  const { run } = fixture(t, { ref: 'L01/d:4' });
  assert.match(run().problems.join('\n'), /outside phases\/demo\/01-lesson\/docs\/en.md \(3 lines\)/);
});

test('frozen evidence rejects a reference outside the topic sources', t => {
  const { run } = fixture(t, { ref: 'phases/demo/other/docs/en.md:1' });
  assert.match(run().problems.join('\n'), /not in a source of this topic/);
});

test('frozen evidence rejects traversal paths', t => {
  const { run } = fixture(t, { ref: 'L01/../other/docs/en.md:1' });
  assert.match(run().problems.join('\n'), /not a plain repository path/);
});

test('distinct Chinese block headings cannot match through an empty normalized key', t => {
  const { run } = fixture(t, { heading: '停止服务' });
  assert.match(run().problems.join('\n'), /no section for the block "启动服务"/);
});

test('Chinese heading punctuation still normalizes for matching', t => {
  const { run } = fixture(t, { heading: '启动：服务 (task-table)' });
  assert.deepEqual(run().problems, []);
});

test('ordinary evidence still validates local translated sources without an oracle', t => {
  const { run } = fixture(t, { frozen: false, oracle: false, ref: 'L01/d:1' });
  assert.deepEqual(run(), { problems: [], refs: 1 });
});

test('ordinary evidence still rejects lines outside the local source', t => {
  const { run } = fixture(t, { frozen: false, ref: 'L01/d:2' });
  assert.match(run().problems.join('\n'), /outside phases\/demo\/01-lesson\/docs\/zh.md \(1 lines\)/);
});


test('an exact Chinese block title wins over an earlier section containing the same words', t => {
  const data = fixture(t, { frozen: false, oracle: false, ref: 'L01/d:1' });
  const evidence = path.join(data.local, 'cheatsheets/evidence/demo.md');
  fs.writeFileSync(evidence, [
    '# Evidence: cheatsheets/demo.md',
    `Abbreviations: L01 = ${SOURCE}, d = docs/zh.md.`,
    '',
    '## DPO 损失与冻结参考模型 (annotated-code)',
    ...Array.from({ length: 4 }, (_, i) => `- Code ${i}: L01/d:1`),
    '## 损失 (concepts)',
    ...Array.from({ length: 6 }, (_, i) => `- Loss ${i}: L01/d:1`),
    '',
  ].join('\n'));
  const map = { topics: [{ id: 'demo', sources: [SOURCE] }] };
  const topics = [{ id: 'demo', blocks: [{ title: '损失', items: Array.from({ length: 6 }, () => ({})) }] }];
  assert.deepEqual(checkEvidence(map, topics, data.local).problems, []);
});
