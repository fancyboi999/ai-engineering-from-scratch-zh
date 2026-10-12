'use strict';

const { socialCards, lessonCard, trackCard } = require('../lib/og-cards');
const { layout } = require('../lib/og-render');

// 由主构建器传入已中文化的数据；不读取或写入其他 lane 的构建产物。
function buildOgCards(input) {
  const cards = socialCards(input);
  validateOgCards({ cards });
  return { cards };
}

function validateOgCards(manifest, lessons = {}, tracks = {}) {
  const specs = [
    ...Object.entries(manifest.cards || {}),
    ...Object.entries(lessons).map(([id, entry]) => [`lesson/${id}`, lessonCard(entry)]),
    ...Object.entries(tracks).map(([id, entry]) => [`track/${id}`, trackCard(entry)]),
  ];
  for (const [id, spec] of specs) {
    try { layout(spec); } catch (error) { throw new Error(`${id}: ${error.message}`); }
  }
  return specs.length;
}

module.exports = { buildOgCards, validateOgCards };
