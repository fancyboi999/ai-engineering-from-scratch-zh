'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-1', {
  height: 236,
  title: "并发上限 8 后吞吐量停止增长，延迟继续增加",
  desc: "基准扫描的两个条形图。左侧并发上限 1、8、32 的输出吞吐量为 175.15、255.63、252.74 token/s；右侧同样上限的 TTFT 中位数为 162.98、785.79、3917.54 ms。",
}, f => {
  f.kicker(20, 18, "输出 tok/s");
  f.kicker(340, 18, "TTFT 中位数，ms");
  f.rule(320, 8, 320, 228, { dash: 'dashed' });
  const rows = [
    { cap: "上限 1", tok: 175.15, ttft: 162.98, past: false },
    { cap: "上限 8", tok: 255.63, ttft: 785.79, past: false },
    { cap: "上限 32", tok: 252.74, ttft: 3917.54, past: true },
  ];
  rows.forEach((row, index) => {
    const y = 40 + index * 56;
    f.text(20, y + 16, row.cap, { size: 11.5 });
    const left = row.tok * 0.6;
    f.rect(80, y, left, 22, { fill: color(row.past ? 'rose-ink' : 'olive-ink'), stroke: 'none' });
    f.text(86 + left, y + 16, row.tok.toFixed(2), { size: 11.5 });
    f.text(340, y + 16, row.cap, { size: 11.5 });
    const right = row.ttft * 0.0425;
    f.rect(400, y, right, 22, { fill: color(row.past ? 'rose-ink' : 'olive-ink'), stroke: 'none' });
    f.text(406 + right, y + 16, row.ttft.toFixed(0), { size: 11.5 });
  });
  f.text(20, 214, "1 至 8：+46%，8 至 32：-1%", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(340, 214, "1 至 8：4.8 倍，8 至 32：5.0 倍", { size: 11, serif: true, hue: 'ink-soft' });
});
