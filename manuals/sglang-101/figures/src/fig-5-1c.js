'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json')).load;
const series = [
  { key: 'fp8', name: 'FP8 + FP8 KV', hue: 'green' },
  { key: 'eagle3', name: 'EAGLE-3', hue: 'violet' },
  { key: 'default', name: "BF16 默认配置", hue: 'plum' },
  { key: 'no-cuda-graph', name: "无 CUDA graph", hue: 'grey', dash: 'dashed' },
];

module.exports = figure('fig-5-1c', {
  height: 340,
  title: "GB10 吞吐量与并发，每点三个种子",
  desc: "NVIDIA GB10 上 Qwen3-30B-A3B，输入 512、输出 128 token。并发 64 时 FP8 升至 441 token/s，BF16 为 235；EAGLE-3 在并发至 32 时领先 BF16，64 时达 276。关闭 CUDA graphs 与默认曲线重合。带状为三个种子的最小和最大值。",
}, f => {
  const c = chart(f, { x: 66, y: 56, w: 540, h: 230, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 500], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 100, 200, 300, 400, 500], xLabel: "最大并发（基准客户端）", yLabel: "每秒输出 token" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p.output_throughput.min]), points.map(p => [p.x, p.output_throughput.max]), { hue: s.hue });
    c.series(points.map(p => [p.x, p.output_throughput.median]), { hue: s.hue, dash: s.dash, name: s.key });
  }
  const top = point => runs[point].points.find(p => p.x === 64).output_throughput.median;
  c.note(64, top('fp8'), String(Math.round(top('fp8'))), { dx: 6, dy: 4, hue: 'green' });
  c.note(64, top('default'), String(Math.round(top('default'))), { dx: 6, dy: 4, hue: 'plum' });
  legend(f, series, 66, 22);
});
