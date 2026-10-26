'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const pts = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json')).load.vllm.points;

module.exports = figure('fig-1-3b', {
  height: 330,
  title: '用户增多，总输出上升，单用户输出变慢',
  desc: 'DGX Spark 使用 vLLM 0.31.0 服务 Qwen3-30B-A3B，每个数据点使用三个随机种子。左图：并发用户从 1 增至 64 时，总输出由每秒 29.5 个 token 增至 239.3 个。右图：单用户每个输出 token 的耗时中位数由 32.3 ms 增至 243.8 ms。',
}, f => {
  const ticks = [1, 4, 16, 64];
  const left = chart(f, { x: 56, y: 60, w: 228, h: 196, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 300], xTicks: ticks, yTicks: [0, 100, 200, 300], xLabel: '并发用户', yLabel: '总输出 token/s' });
  left.band(pts.map(p => [p.x, p.output_throughput.min]), pts.map(p => [p.x, p.output_throughput.max]), { hue: 'plum' });
  left.series(pts.map(p => [p.x, p.output_throughput.median]), { hue: 'plum' });
  const right = chart(f, { x: 384, y: 60, w: 228, h: 196, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 300], xTicks: ticks, yTicks: [0, 100, 200, 300], xLabel: '并发用户', yLabel: '单用户每个 token 的中位 ms' });
  right.band(pts.map(p => [p.x, p.median_tpot_ms.min]), pts.map(p => [p.x, p.median_tpot_ms.max]), { hue: 'amber' });
  right.series(pts.map(p => [p.x, p.median_tpot_ms.median]), { hue: 'amber' });
  legend(f, [{ name: '三次运行的中位数；带状区间表示最小值到最大值', hue: 'ink-soft' }], 56, 22);
});
