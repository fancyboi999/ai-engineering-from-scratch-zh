#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const builder = require('../site/build-manuals.js');

// 原两本保留 2026-10-12 冻结计数；新增手册按本次同步的固定源检验。
const EXPECTED = {
  'a2a-101': { sections: 28, references: 7, figures: 31 },
  'docker-sandboxes-101': { sections: 33, references: 8, figures: 34 },
  'reverse-engineering-101': { sections: 26, references: 6, figures: 37 },
  'sglang-101': { sections: 28, references: 6, figures: 63 },
};

function checkManualOutputs(root) {
  const manuals = builder.loadAll({ root });
  assert.deepEqual(manuals.map(manual => manual.id).sort(), Object.keys(EXPECTED).sort(), 'the frozen pair and both new manual sources must be present');
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-output-check-'));
  try {
    assert.equal(builder.writeWeb(manuals, out), 3, 'only the three ready manuals must be listed');
    for (const manual of manuals) {
      const expected = EXPECTED[manual.id];
      assert.equal(manual.status, manual.id === 'sglang-101' ? 'draft' : 'ready', `${manual.id} status`);
      const sections = manual.parts.reduce((sum, part) => sum + part.sections.length, 0);
      assert.equal(sections, expected.sections, `${manual.id} sections`);
      assert.equal(manual.reference.sections.length, expected.references, `${manual.id} references`);
      assert.equal(manual.figures.size, expected.figures, `${manual.id} figures`);
      const web = fs.readFileSync(path.join(out, `manual-${manual.id}.html`), 'utf8');
      const print = fs.readFileSync(path.join(out, `manual-${manual.id}-print.html`), 'utf8');
      for (const [mode, html] of [['web', web], ['print', print]]) {
        assert.match(html, /<html lang="zh-CN"/);
        assert.match(html, new RegExp(`https://aieng-zh\\.cn/manual-${manual.id}\\.html`));
        assert.doesNotMatch(html, /aiengineeringfromscratch\.com|github\.com\/rohitg00|sponsors\.html/);
        assert.equal(/<meta name="robots" content="noindex">/.test(html), mode === 'print' || manual.status === 'draft', `${manual.id} ${mode} indexing status`);

        assert.equal((html.match(/class="m-section"/g) || []).length, expected.sections + expected.references, `${manual.id} ${mode} rendered sections`);
        assert.equal((html.match(/class="m-fig" id=/g) || []).length, expected.figures, `${manual.id} ${mode} rendered figures`);
        const anchors = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
        for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(anchors.has(match[1]), `${manual.id} ${mode} missing #${match[1]}`);
        for (const doc of manual.documents) {
          for (const block of doc.blocks.filter(block => block.type === 'listing')) {
            assert.ok(html.includes(`data-source="${block.source}"`), `${manual.id} listing source ${block.source}`);
          }
          // 文内外部来源链接也属于内容；新增手册不能靠删除引用通过域名保护检查。
          for (const block of doc.blocks.filter(block => typeof block.text === 'string')) {
            for (const [, url] of block.text.matchAll(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/g)) {
              const escaped = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
              assert.ok(html.includes(`href="${escaped}"`), `${manual.id} ${mode} source link ${url}`);
            }
          }
        }
      }
      assert.doesNotMatch(print, /<script|<animate|class="m-packet"|fonts\.googleapis\.com/);
      assert.match(web, /<script src="header\.js\?v=[a-z0-9]+" defer>/);
      assert.ok(web.includes(`href="manual-${manual.id}-print.html"`));
      console.log(`${manual.id}: ${sections} sections, ${expected.references} references, ${expected.figures} figures; web/print/URLs/provenance OK`);
    }
    const data = fs.readFileSync(path.join(out, 'manuals-data.js'), 'utf8');
    assert.doesNotMatch(data, /"pdf"/);
    assert.match(data, /"print"/);
    const listed = vm.runInNewContext(data + '\nwindow.AIFS_MANUALS', { window: {} });
    assert.deepEqual(Array.from(listed, manual => manual.id).sort(), ['a2a-101', 'docker-sandboxes-101', 'reverse-engineering-101']);
    const index = fs.readFileSync(path.join(out, 'manuals.html'), 'utf8');
    for (const manual of manuals) {
      assert.equal(index.includes(`href="manual-${manual.id}.html"`), manual.status === 'ready', `${manual.id} index listing`);
    }

    return manuals.length;
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const root = args.includes('--root') ? path.resolve(args[args.indexOf('--root') + 1]) : undefined;
  try { checkManualOutputs(root); } catch (error) { console.error(`check-manual-outputs: ${error.message}`); process.exit(1); }
}

module.exports = { checkManualOutputs };
