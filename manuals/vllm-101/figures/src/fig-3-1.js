'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load;
const series = [
  { key: 'vllm-b', name: '默认值', hue: 'violet' },
  { key: 'vllm-seqs-16', name: '--max-num-seqs 16', hue: 'rose', dash: 'dashed' },
];

module.exports = figure('fig-3-1', {
  height: 340,
  title: '用户增加时，将序列数限制为 16 与默认值进行比较',
  desc: '2026-10-21，NVIDIA L4 使用 Qwen3-8B、每点三个随机种子时，输出 token/s 和首 token 中位延迟随并发用户数变化。并发不超过 16 个用户时两种配置相当。32 个用户时，默认配置输出 275.1 token/s，首 token 用时 1.8 s；序列数限制为 16 时输出 171.8 token/s，首 token 用时 12.3 s。',
}, f => {
  legend(f, series, 66, 22);
  const a = chart(f, { x: 66, y: 60, w: 230, h: 200, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 300], xTicks: [1, 4, 16, 64], yTicks: [0, 100, 200, 300], xLabel: '并发用户', yLabel: '输出 token/s' });
  const b = chart(f, { x: 376, y: 60, w: 230, h: 200, xScale: 'log2', xDomain: [1, 64], yScale: 'log10', yDomain: [0.1, 100], xTicks: [1, 4, 16, 64], yTicks: [0.1, 1, 10, 100], xLabel: '并发用户', yLabel: '首 token 延迟中位数，秒' });
  for (const s of series) {
    const pts = runs[s.key].points;
    a.band(pts.map(p => [p.x, p.output_throughput.min]), pts.map(p => [p.x, p.output_throughput.max]), { hue: s.hue });
    a.series(pts.map(p => [p.x, p.output_throughput.median]), { hue: s.hue, dash: s.dash });
    b.series(pts.map(p => [p.x, p.median_ttft_ms.median / 1000]), { hue: s.hue, dash: s.dash });
  }
});
