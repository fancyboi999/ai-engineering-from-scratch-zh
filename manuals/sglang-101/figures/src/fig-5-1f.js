'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const hot = load(path.join(__dirname, '../../capture/gpu/summary/l4-throttled.json')).load.default.points;
const cool = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load.default.points;

module.exports = figure('fig-5-1f', {
  height: 340,
  title: "同一 L4、同一服务，高温与冷却后测量",
  desc: "NVIDIA L4 上 Qwen3-8B 的输出吞吐量对并发，两次扫描命令相同。首次卡温约 87 C，无遥测；第二次每轮等待 72 C，并记录时钟。冷却组每点更高，并发 32 最多高 39%；64 时因 KV 池满而下降。",
}, f => {
  const c = chart(f, { x: 66, y: 56, w: 540, h: 230, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 300], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 100, 200, 300], xLabel: "最大并发（基准客户端）", yLabel: "每秒输出 token" });
  c.band(cool.map(p => [p.x, p.output_throughput.min]), cool.map(p => [p.x, p.output_throughput.max]), { hue: 'blue' });
  c.series(cool.map(p => [p.x, p.output_throughput.median]), { hue: 'blue', name: 'cooled' });
  c.band(hot.map(p => [p.x, p.output_throughput.min]), hot.map(p => [p.x, p.output_throughput.max]), { hue: 'rose' });
  c.series(hot.map(p => [p.x, p.output_throughput.median]), { hue: 'rose', dash: 'dashed', name: 'hot' });
  const at = (points, x) => points.find(p => p.x === x).output_throughput.median;
  c.note(32, at(cool, 32), String(Math.round(at(cool, 32))), { dx: 0, dy: -12, anchor: 'middle', hue: 'blue' });
  c.note(32, at(hot, 32), String(Math.round(at(hot, 32))), { dx: 0, dy: 20, anchor: 'middle', hue: 'rose' });
  legend(f, [{ name: "冷却到 72 C，记录时钟", hue: 'blue' }, { name: "高温，无遥测", hue: 'rose', dash: 'dashed' }], 66, 22);
});
