'use strict';

const { figure } = require('../../../_shared/figkit.js');

const SCALE = 600 / 50;

module.exports = figure('fig-3-2', {
  height: 300,
  title: "同一 Mac，两种内存划分",
  desc: "两条使用 0 至 50 GB 相同刻度。探索运行 2 见到 38.29 GB 空闲，以 mem_fraction_static 0.872 分 33.39 GB 给池，剩 4.90 GB，并发 32 时因 Insufficient Memory 崩溃。工具运行见到 48.49 GB 空闲，以 0.4 分 19.39 GB 给池，余 29.10 GB，并发 32 完成 128 请求。",
}, f => {
  const bars = [
    { y: 40, label: "探索运行 2 · 比例 0.872（自动）", free: 38.29, kv: 33.39, result: "并发 32 内存不足，服务终止", fail: true },
    { y: 170, label: "捕获工具 · --mem-fraction-static 0.4", free: 48.49, kv: 19.39, result: "并发 32，128 个请求全部完成", fail: false },
  ];
  for (const bar of bars) {
    f.kicker(20, bar.y - 12, bar.label);
    const kvWidth = bar.kv * SCALE;
    const restWidth = (bar.free - bar.kv) * SCALE;
    f.rect(20, bar.y, kvWidth, 44, { hue: 'green' });
    f.text(30, bar.y + 27, `KV 池 ${bar.kv.toFixed(2)} GB`, { size: 12, hue: 'green', weight: 700 });
    f.rect(20 + kvWidth, bar.y, restWidth, 44, { hue: bar.fail ? 'rose' : 'grey', dash: bar.fail ? 'dashed' : undefined });
    if (restWidth > 160) f.text(30 + kvWidth, bar.y + 27, `留给激活 ${(bar.free - bar.kv).toFixed(2)} GB`, { size: 11.5, serif: true });
    else f.text(20, bar.y + 64, `留给激活与其他程序： ${(bar.free - bar.kv).toFixed(2)} GB`, { size: 11.5, serif: true, hue: 'rose' });
    f.text(20, bar.y + (bar.fail ? 84 : 64), bar.result, { size: 11.5, hue: bar.fail ? 'rose' : 'ink-soft', serif: true });
  }
  f.rule(20, 276, 620, 276, { hue: 'ink-mute' });
  [0, 10, 20, 30, 40, 50].forEach(gb => {
    const x = 20 + gb * SCALE;
    f.rule(x, 272, x, 280, { hue: 'ink-mute' });
    f.text(x, 294, `${gb} GB`, { size: 11, anchor: gb === 0 ? 'start' : gb === 50 ? 'end' : 'middle', hue: 'ink-mute' });
  });
});
