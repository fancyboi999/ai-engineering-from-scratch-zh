'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json')).load;
const ratio = runs.eagle3.points.map(p => [p.x, runs.default.points.find(q => q.x === p.x).median_tpot_ms.median / p.median_tpot_ms.median]);

module.exports = figure('fig-4-4b', {
  height: 350,
  title: "MoE 模型批次增大时，EAGLE-3 仍保持收益",
  desc: "GB10 上 Qwen3-30B-A3B 使用 EAGLE-3 相对 BF16 默认配置的每输出 token 时间中位数加速比。并发 1 为 1.60 倍，2 为 1.56 倍，32 达到峰值 1.89 倍，64 为 1.84 倍；每步接受长度保持约 2.7 token。",
}, f => {
  const c = chart(f, { x: 66, y: 56, w: 540, h: 220, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 3], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 1, 2, 3], xLabel: "最大并发（基准客户端）", yLabel: "默认 TPOT 除以 EAGLE-3 TPOT", yFormat: v => `x${v}` });
  f.rule(c.px(1), c.py(1), c.px(64), c.py(1), { hue: 'rose', dash: 'dashed' });
  c.note(64, 1, "无收益", { dx: -4, dy: 16, anchor: 'end', hue: 'rose' });
  c.series(ratio, { hue: 'violet', name: 'speedup' });
  for (const [x, y] of ratio) c.note(x, y, `x${y.toFixed(2)}`, { dx: x === 1 ? 6 : x === 64 ? -4 : 0, dy: 20, anchor: x === 1 ? 'start' : x === 64 ? 'end' : 'middle', hue: 'violet' });
  const acc = runs.eagle3.points.map(p => p.accept_length.median);
  f.text(66, 340, `接受长度 ${Math.min(...acc).toFixed(2)} 至 ${Math.max(...acc).toFixed(2)} token/步，各并发均如此`, { size: 11, serif: true, hue: 'ink-soft' });
  legend(f, [{ name: "EAGLE-3 加速比", hue: 'violet' }], 66, 22);
});
