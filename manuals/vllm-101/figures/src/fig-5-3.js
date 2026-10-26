'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load;
const series = [
  { key: 'vllm', name: 'vLLM 0.31.0', hue: 'blue' },
  { key: 'sglang', name: 'SGLang 0.5.22', hue: 'olive', dash: 'dashed' },
];

module.exports = figure('fig-5-3', {
  height: 330,
  title: 'L4 上并发不超过 32 个用户时，两种 engine 的输出 token/s 相当',
  desc: 'NVIDIA L4 使用 Qwen3-8B、相同的 24,096-token KV 缓存池、每点三个随机种子时，输出 token/s 随并发用户数变化。并发不超过 32 个用户时，两条线相差不超过 3%。64 个用户时，SGLang 为 256.6 token/s，vLLM 为 241.4 token/s。',
}, f => {
  const c = chart(f, { x: 66, y: 60, w: 540, h: 210, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 300], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 100, 200, 300], xLabel: '并发用户', yLabel: '输出 token/s' });
  for (const s of series) {
    const pts = runs[s.key].points;
    c.band(pts.map(p => [p.x, p.output_throughput.min]), pts.map(p => [p.x, p.output_throughput.max]), { hue: s.hue });
    c.series(pts.map(p => [p.x, p.output_throughput.median]), { hue: s.hue, dash: s.dash });
  }
  legend(f, series, 66, 22);
});
