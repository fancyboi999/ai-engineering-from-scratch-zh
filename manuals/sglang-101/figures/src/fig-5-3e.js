'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).rate;
const series = [
  { key: 'sglang-h2h', metric: 'median_ttft_ms', name: "SGLang TTFT 中位数", hue: 'blue' },
  { key: 'vllm', metric: 'median_ttft_ms', name: "vLLM TTFT 中位数", hue: 'amber' },
  { key: 'sglang-h2h', metric: 'p99_tpot_ms', name: 'SGLang P99 TPOT', hue: 'blue', dash: 'dashed' },
  { key: 'vllm', metric: 'p99_tpot_ms', name: 'vLLM P99 TPOT', hue: 'amber', dash: 'dashed' },
];

module.exports = figure('fig-5-3e', {
  height: 370,
  title: "固定到达率下的同一选择",
  desc: "单 NVIDIA L4、Qwen3-8B，比较 SGLang 0.5.22 与 vLLM 0.31.0 在每秒 0.5 至 16 泊松到达下的 TTFT 中位数和 P99 TPOT。KV 池 24,094、24,096 token，输入 512、输出 128，每点三个种子，对数刻度。至每秒 2 请求，四线均低于 1,000 ms；从 4 起首 token 曲线上升到数秒，vLLM 更低，但其 P99 TPOT 高于 SGLang，4 时为 187 对 127 ms。",
}, f => {
  const c = chart(f, { x: 70, y: 84, w: 536, h: 222, xScale: 'log2', xDomain: [0.5, 16], yScale: 'log10', yDomain: [50, 300000], xTicks: [0.5, 1, 2, 4, 8, 16], yTicks: [50, 100, 300, 1000, 10000, 100000], xLabel: "提供的请求速率，请求/秒（泊松）", yLabel: "ms（对数刻度）" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p[s.metric].min]), points.map(p => [p.x, p[s.metric].max]), { hue: s.hue, opacity: 0.1 });
    c.series(points.map(p => [p.x, p[s.metric].median]), { hue: s.hue, dash: s.dash, name: `${s.key}-${s.metric}` });
  }
  legend(f, series.slice(0, 2), 70, 22);
  legend(f, series.slice(2), 70, 44);
});
