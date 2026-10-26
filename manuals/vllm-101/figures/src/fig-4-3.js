'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load;
const series = [
  { key: 'vllm-b', name: '默认值，-O2', hue: 'violet' },
  { key: 'vllm-eager', name: '--enforce-eager', hue: 'rose', dash: 'dashed' },
];

module.exports = figure('fig-4-3', {
  height: 330,
  title: 'L4 上 eager mode 让每个 token 耗时增加 1.2% 至 2.3%',
  desc: '2026-10-21，NVIDIA L4 使用 Qwen3-8B、每点三个随机种子时，每个输出 token 的耗时中位数随并发用户数变化。所有并发数下 eager mode 都慢 1.2% 至 2.3%，例如单用户时为 61.1 对 60.4 ms，64 用户时为 131.4 对 129.2 ms。',
}, f => {
  const c = chart(f, { x: 66, y: 60, w: 540, h: 210, xScale: 'log2', xDomain: [1, 64], yDomain: [50, 140], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [50, 80, 110, 140], xLabel: '并发用户', yLabel: '每 token 耗时中位数，ms' });
  for (const s of series) {
    const pts = runs[s.key].points;
    c.band(pts.map(p => [p.x, p.median_tpot_ms.min]), pts.map(p => [p.x, p.median_tpot_ms.max]), { hue: s.hue });
    c.series(pts.map(p => [p.x, p.median_tpot_ms.median]), { hue: s.hue, dash: s.dash });
  }
  legend(f, series, 66, 22);
});
