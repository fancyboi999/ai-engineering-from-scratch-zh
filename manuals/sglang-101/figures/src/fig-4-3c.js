'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load;
const series = [
  { key: 'default', name: "BF16，24,094-token 池", hue: 'plum' },
  { key: 'fp8', name: "FP8 权重与 KV，142,369-token 池", hue: 'green' },
];

module.exports = figure('fig-4-3c', {
  height: 340,
  title: "24 GB 卡的 BF16 池满后，吞吐量不再上升",
  desc: "NVIDIA L4 上 Qwen3-8B 的输出吞吐量对并发 1 至 64，每点三个种子，带状区域为最小至最大运行值。BF16 曲线在并发 32 升至 270 token/s，64 时降至 251；FP8 持续上升，64 时达 736。",
}, f => {
  const c = chart(f, { x: 66, y: 64, w: 540, h: 222, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 800], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 200, 400, 600, 800], xLabel: "最大并发", yLabel: "每秒输出 token" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p.output_throughput.min]), points.map(p => [p.x, p.output_throughput.max]), { hue: s.hue });
    c.series(points.map(p => [p.x, p.output_throughput.median]), { hue: s.hue, name: s.key });
    const last = points[points.length - 1];
    c.note(last.x, last.output_throughput.median, String(Math.round(last.output_throughput.median)), { dx: -10, dy: -10, anchor: 'end', hue: s.hue });
  }
  legend(f, series, 66, 22);
});
