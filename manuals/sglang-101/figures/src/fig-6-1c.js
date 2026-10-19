'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load;
const series = [
  { key: 'default', name: "一张 L4，24,094-token 池", hue: 'plum' },
  { key: 'dp2', name: "--dp-size 2，池 24,094 和 2,925", hue: 'rose' },
];

module.exports = figure('fig-6-1c', {
  height: 340,
  title: "两个模型副本服务量反而少于一个",
  desc: "Qwen3-8B 输出吞吐量对并发 1 至 64，每点三个种子，带状为最小至最大运行值。一张 L4 在并发 32 达 270 token/s，64 为 251。两张 L4 使用 --dp-size 2，第二张为共享卡，此时并发 8 峰值仅 64 token/s，并发 64 降到 42。",
}, f => {
  const c = chart(f, { x: 66, y: 64, w: 540, h: 222, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 300], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 100, 200, 300], xLabel: "最大并发", yLabel: "每秒输出 token" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p.output_throughput.min]), points.map(p => [p.x, p.output_throughput.max]), { hue: s.hue });
    c.series(points.map(p => [p.x, p.output_throughput.median]), { hue: s.hue, name: s.key });
    const last = points[points.length - 1];
    c.note(last.x, last.output_throughput.median, String(Math.round(last.output_throughput.median)), { dx: -10, dy: -10, anchor: 'end', hue: s.hue });
  }
  legend(f, series, 66, 22);
});
