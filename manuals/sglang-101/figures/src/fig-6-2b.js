'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-2b', {
  height: 262,
  title: "两种批次大小下的 EP16 与 EP32",
  desc: "Ant Group 在 H20 上 DeepSeek-R1 decode 吞吐量的二乘二比较。批次 8：EP16 为 278、EP32 为 293 token/s；批次 32：EP16 为 675、EP32 为 585。EP16 约一半 MoE 流量留在 NVLink，EP32 约四分之一。",
}, f => {
  const cols = [
    { x: 180, title: '--ep-size 16', nv: "约 50% 经 NVLink" },
    { x: 410, title: '--ep-size 32', nv: "约 25% 经 NVLink" },
  ];
  const rows = [
    { y: 70, label: "批次 8", values: ['278 tokens/s', '293 tokens/s'], win: 1 },
    { y: 138, label: "批次 32", values: ['675 tokens/s', '585 tokens/s'], win: 0 },
  ];
  f.kicker(20, 22, "H20 上的 DeepSeek-R1 decode");
  for (const col of cols) f.box({ x: col.x, y: 32, w: 210, h: 30, hue: 'violet', title: col.title });
  for (const row of rows) {
    f.text(20, row.y + 34, row.label, { size: 12, weight: 700 });
    cols.forEach((col, index) => {
      const winner = index === row.win;
      f.box({ x: col.x, y: row.y, w: 210, h: 56, hue: winner ? 'plum' : 'grey', double: winner, title: row.values[index], sub: [winner ? "此批次更快" : "此批次更慢"] });
    });
  }
  f.text(20, 228, "MoE 流量", { size: 12, weight: 700 });
  for (const col of cols) f.text(col.x + 105, 228, col.nv, { size: 11, serif: true, hue: 'indigo', anchor: 'middle' });
  f.text(20, 252, "Ant Group 实测，LMSYS 博客，2025-09-26。", { size: 11, serif: true, hue: 'ink-soft' });
});
