'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const summary = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json'));
const at16 = key => summary.load[key].points.find(p => p.x === 16);
const series = [
  { key: 'fp8', name: 'FP8', hue: 'green' },
  { key: 'default', name: 'BF16', hue: 'plum' },
  { key: 'eagle3', name: 'EAGLE-3', hue: 'violet' },
];

module.exports = figure('fig-5-1e', {
  height: 340,
  title: "并发上限 16，三次运行的 TTFT 分位数",
  desc: "GB10 上并发上限 16，汇总三个种子请求的 TTFT 分位曲线，使用 0 至 100% 的 51 个分位数。BF16 和 FP8 在 140 至 240 ms 附近陡升，随后变平，分别在约 1.2 和 1.7 秒结束。EAGLE-3 起步更晚，中位数约 580 ms，但尾部最短。",
}, f => {
  const c = chart(f, { x: 66, y: 56, w: 540, h: 230, xScale: 'log10', xDomain: [30, 3000], yDomain: [0, 1], xTicks: [30, 100, 300, 1000, 3000], yTicks: [0, 0.25, 0.5, 0.75, 1], xLabel: "首 token 时间，ms（对数刻度）", yLabel: "请求比例", yFormat: v => `${Math.round(v * 100)}%` });
  f.rule(c.px(30), c.py(0.9), c.px(3000), c.py(0.9), { hue: 'rose', dash: 'dashed' });
  c.note(3000, 0.9, 'P90', { dx: -4, dy: -6, anchor: 'end', hue: 'rose' });
  for (const s of series) {
    const t = at16(s.key).ttft_quantiles_ms;
    c.series(t.map((ms, i) => [ms, summary.quantiles[i]]), { hue: s.hue, dots: false, name: s.key });
  }
  legend(f, series, 66, 22);
});
