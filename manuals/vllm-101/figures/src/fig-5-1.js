'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const pts = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load['vllm-b'].points;

module.exports = figure('fig-5-1', {
  height: 330,
  title: '并发 sweep 定位延迟拐点：L4 在 32 个用户时吞吐最高',
  desc: 'NVIDIA L4 上使用 vLLM 0.31.0 和 Qwen3-8B 时，并发用户数与输出 token/s 的关系。每个数据点来自三个随机种子。吞吐从单用户时的 13.5 升至 32 个用户时的 275.1，再在 64 个用户时降至 242.3；此时请求开始等待 KV cache 空间。',
}, f => {
  const c = chart(f, { x: 66, y: 60, w: 540, h: 210, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 300], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 100, 200, 300], xLabel: '并发用户数', yLabel: '输出 token/s' });
  c.band(pts.map(p => [p.x, p.output_throughput.min]), pts.map(p => [p.x, p.output_throughput.max]), { hue: 'plum' });
  c.series(pts.map(p => [p.x, p.output_throughput.median]), { hue: 'plum' });
  c.note(32, 275.14, '拐点，275', { dx: -8, dy: -10, anchor: 'end', hue: 'plum', serif: false });
  c.note(64, 242.32, '242', { dx: -4, dy: 18, anchor: 'end', hue: 'plum', serif: false });
  legend(f, [{ name: '三个种子的中位数，色带表示最低到最高值', hue: 'plum' }], 66, 22);
});
