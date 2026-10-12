#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { lessonDocumentSeo } = require('../lib/lesson-document');
const { lessonCard, socialCards } = require('../lib/og-cards');
const { layout } = require('../lib/og-render');
const { validateOgCards } = require('../site/og-cards');

const at = process.argv.indexOf('--root');
const root = at >= 0 ? process.argv[at + 1] : path.join(__dirname, '..');
let checked = 0;
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (entry.name === 'zh.md' && path.basename(dir) === 'docs') {
      const lessonPath = path.relative(root, path.dirname(dir)).split(path.sep).join('/');
      if (!lessonPath.startsWith('phases/') && !lessonPath.startsWith('certifications/')) continue;
      const seo = lessonDocumentSeo(fs.readFileSync(file, 'utf8'));
      try { layout(lessonCard({ ...seo, path: lessonPath, context: { kind: lessonPath.startsWith('certifications/') ? 'certification' : 'lesson' } })); }
      catch (error) { throw Error(`${lessonPath}: ${error.message}`); }
      checked++;
    }
  }
}
for (const dir of ['phases', 'certifications']) walk(path.join(root, dir));
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'site', name), 'utf8'));
const manifestPath = path.join(root, 'site/og-cards.json');
if (fs.existsSync(manifestPath)) {
  checked += validateOgCards(read('og-cards.json'), read('lesson-seo.json').lessons, read('certification-seo.json').tracks);
} else if (process.argv.includes('--require-manifests')) {
  throw Error('Missing site/og-cards.json; run the integration build first');
} else {
  const cards = socialCards({ stats: { lessons: checked, phases: 20, skills: 0, prompts: 0, terms: 0, tracks: 4 } });
  checked += validateOgCards({ cards });
  console.warn('Built manifests absent: project/manual/term/phase/track metadata coverage is not verified; rerun after integration with --require-manifests');
}
console.log(`OG glyph/layout coverage: ${checked} Chinese cards passed`);
