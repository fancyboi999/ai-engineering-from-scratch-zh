'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json')).load;
const series = [
  { key: 'vllm', name: 'vLLM 0.31.0', hue: 'blue' },
  { key: 'sglang', name: 'SGLang 0.5.22', hue: 'olive', dash: 'dashed' },
];

module.exports = figure('fig-5-3b', {
  height: 330,
  title: 'GB10 上从 32 个用户起，vLLM 最差 token 间隔增至 SGLang 的两倍',
  desc: 'DGX Spark 使用 Qwen3-30B-A3B、每点三个随机种子时，token 间隔的 99 百分位数随并发用户数变化。并发不超过 8 个用户时，两种 engine 相当。32 个用户时，vLLM 为 478 ms，SGLang 为 220 ms；64 个用户时分别为 528 ms 和 271 ms。',
}, f => {
  const c = chart(f, { x: 66, y: 60, w: 540, h: 210, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 600], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 200, 400, 600], xLabel: '并发用户', yLabel: 'P99 token 间隔，ms' });
  for (const s of series) {
    const pts = runs[s.key].points;
    c.band(pts.map(p => [p.x, p.p99_itl_ms.min]), pts.map(p => [p.x, p.p99_itl_ms.max]), { hue: s.hue });
    c.series(pts.map(p => [p.x, p.p99_itl_ms.median]), { hue: s.hue, dash: s.dash });
  }
  c.note(32, 477.92, '478', { dx: -8, dy: -8, anchor: 'end', hue: 'blue', serif: false });
  c.note(32, 219.54, '220', { dx: 8, dy: 16, hue: 'olive', serif: false });
  legend(f, series, 66, 22);
});
