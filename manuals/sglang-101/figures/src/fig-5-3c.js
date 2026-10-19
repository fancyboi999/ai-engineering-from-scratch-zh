'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load;
const series = [
  { key: 'sglang-h2h', metric: 'median_ttft_ms', name: "SGLang TTFT 中位数", hue: 'blue' },
  { key: 'vllm', metric: 'median_ttft_ms', name: "vLLM TTFT 中位数", hue: 'amber' },
  { key: 'sglang-h2h', metric: 'p99_itl_ms', name: 'SGLang P99 ITL', hue: 'blue', dash: 'dashed' },
  { key: 'vllm', metric: 'p99_itl_ms', name: 'vLLM P99 ITL', hue: 'amber', dash: 'dashed' },
];

module.exports = figure('fig-5-3c', {
  height: 370,
  title: "相同吞吐量，满池时的不同选择",
  desc: "单 NVIDIA L4、Qwen3-8B，比较 SGLang 0.5.22 与 vLLM 0.31.0，并发 1 至 64 的 TTFT 中位数和 P99 ITL。KV 池分别 24,094、24,096 token，每点三个种子，对数刻度。至并发 16，ITL 曲线重合，SGLang 首 token 更早。32、64 时 vLLM 首 token 更早，分别 1,813 对 2,871 ms、10,953 对 18,356 ms，但其 P99 ITL 升到 619、1,363 ms，SGLang 为 102、114 ms。",
}, f => {
  const c = chart(f, { x: 70, y: 84, w: 536, h: 222, xScale: 'log2', xDomain: [1, 64], yScale: 'log10', yDomain: [50, 30000], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [50, 100, 300, 1000, 3000, 10000, 30000], xLabel: "最大并发", yLabel: "ms（对数刻度）" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p[s.metric].min]), points.map(p => [p.x, p[s.metric].max]), { hue: s.hue, opacity: 0.1 });
    c.series(points.map(p => [p.x, p[s.metric].median]), { hue: s.hue, dash: s.dash, name: `${s.key}-${s.metric}` });
  }
  legend(f, series.slice(0, 2), 70, 22);
  legend(f, series.slice(2), 70, 44);
});
