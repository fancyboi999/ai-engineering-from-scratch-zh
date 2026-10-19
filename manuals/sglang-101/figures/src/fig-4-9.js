'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-9', {
  height: 340,
  title: "同一行在两个批次中归约",
  desc: "两列对比。左侧默认矩阵乘内核在批次 1 时用两个 tile 归约同一请求行，在批次 37 时用四个 tile，部分和的相加顺序不同，结果末位可能变化。右侧批次不变内核在两批次都使用同样固定切分，结果比特相同。",
}, f => {
  f.kicker(20, 18, "A · 默认内核");
  f.kicker(336, 18, "B · 批次不变内核");
  f.rule(320, 8, 320, 332, { dash: 'dashed' });
  const column = (x, rows) => {
    rows.forEach((row, index) => {
      const y = 34 + index * 140;
      f.text(x, y + 10, row.label, { size: 11, hue: 'ink-soft' });
      const tileW = (284 - (row.tiles - 1) * 6) / row.tiles;
      for (let t = 0; t < row.tiles; t += 1) f.rect(x + t * (tileW + 6), y + 20, tileW, 26, { hue: 'violet' });
      f.text(x, y + 66, `${row.tiles} 个部分和，按序相加`, { size: 11, serif: true, hue: 'ink-soft' });
      f.box({ x, y: y + 76, w: 284, h: 36, hue: row.hue, title: row.result, titleSize: 12, dash: row.dash });
    });
  };
  column(20, [
    { label: "批次含 1 请求", tiles: 2, result: 'logit x', hue: 'plum' },
    { label: "批次含 37 请求", tiles: 4, result: "logit x，末位可能不同", hue: 'rose', dash: 'dashed' },
  ]);
  column(336, [
    { label: "批次含 1 请求", tiles: 4, result: 'logit x', hue: 'plum' },
    { label: "批次含 37 请求", tiles: 4, result: "logit x，比特相同", hue: 'plum' },
  ]);
});
