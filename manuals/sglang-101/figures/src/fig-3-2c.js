'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json')).load;
const series = [
  { key: 'default', name: 'BF16, 0.7', hue: 'plum' },
  { key: 'default-kv-max', name: 'BF16, 0.82', hue: 'plum', dash: 'dashed' },
  { key: 'fp8', name: 'FP8, 0.7', hue: 'green' },
  { key: 'fp8-kv-max', name: 'FP8, 0.82', hue: 'green', dash: 'dashed' },
];

module.exports = figure('fig-3-2c', {
  height: 340,
  title: "池从未满时，增大毫无收益",
  desc: "NVIDIA GB10 上 Qwen3-30B-A3B 的输出吞吐量对并发 1 至 64，每点三个种子，比较 --mem-fraction-static 0.7 与 0.82。BF16 池从 234,600 增到 383,065 token，FP8 从 1,084,458 增到 1,378,545，但每对曲线重合：并发 64 时 BF16 为 235 对 239 tok/s，FP8 为 441 对 443。",
}, f => {
  const c = chart(f, { x: 66, y: 64, w: 540, h: 222, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 500], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 100, 200, 300, 400, 500], xLabel: "最大并发", yLabel: "每秒输出 token" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.series(points.map(p => [p.x, p.output_throughput.median]), { hue: s.hue, dash: s.dash, name: s.key, dots: !s.dash });
  }
  legend(f, series, 66, 22);
});
