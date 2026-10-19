'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-7', {
  height: 300,
  title: "同一功能，两种批次大小",
  desc: "Issue 5274 中，单张 A6000 上 Llama-3.1-8B 的两个输出吞吐面板。批次 1：无推测 42.0，EAGLE-3 为 92.5；并发 20：无推测 217.8，EAGLE-3 为 164.4。两面板共用纵轴刻度。",
}, f => {
  f.kicker(20, 18, "A · 批次 1");
  f.kicker(336, 18, "B · 并发 20");
  f.rule(320, 8, 320, 292, { dash: 'dashed' });
  const base = 240;
  const scale = 180 / 217.8;
  const panels = [
    { x: 60, off: 42.0, on: 92.5 },
    { x: 380, off: 217.8, on: 164.4 },
  ];
  for (const p of panels) {
    f.rule(p.x - 20, base, p.x + 240, base, { hue: 'ink-mute' });
    const h1 = p.off * scale;
    f.rect(p.x, base - h1, 80, h1, { hue: 'plum', dash: 'dashed' });
    f.text(p.x + 40, base - h1 - 6, `${p.off.toFixed(1)}`, { size: 11, anchor: 'middle' });
    f.text(p.x + 40, base + 18, "无推测解码", { size: 11, anchor: 'middle' });
    const h2 = p.on * scale;
    f.rect(p.x + 120, base - h2, 80, h2, { hue: 'plum' });
    f.text(p.x + 160, base - h2 - 6, `${p.on.toFixed(1)}`, { size: 11, anchor: 'middle' });
    f.text(p.x + 160, base + 18, 'EAGLE-3', { size: 11, anchor: 'middle' });
  }
  f.text(20, 284, "输出 tok/s，issue 5274，2025-04-11", { size: 11, serif: true, hue: 'ink-soft' });
});
