'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).prefix;
const series = [
  { key: 'sglang-h2h', name: "SGLang，基数缓存", hue: 'blue' },
  { key: 'vllm', name: "vLLM，前缀缓存", hue: 'amber' },
  { key: 'no-radix-cache', name: "SGLang，无缓存", hue: 'rose', dash: 'dashed' },
];

module.exports = figure('fig-5-3d', {
  height: 350,
  title: "两个前缀缓存，相同结果",
  desc: "单 NVIDIA L4、Qwen3-8B、八用户，比较开启基数缓存的 SGLang 0.5.22、开启前缀缓存的 vLLM 0.31.0，以及关闭缓存的 SGLang，TTFT 中位数对共享 prompt 长度 0 至 4,096，每点三个种子，对数刻度。两条缓存曲线始终在 354 至 488 ms；无缓存时共享 4,096 token 的中位数升到 14,706 ms。",
}, f => {
  const c = chart(f, { x: 70, y: 70, w: 536, h: 216, xDomain: [0, 4096], yScale: 'log10', yDomain: [200, 20000], xTicks: [0, 256, 1024, 2048, 4096], yTicks: [200, 500, 1000, 2000, 5000, 10000, 20000], xLabel: "共享 prompt token 数", yLabel: "TTFT 中位数，ms（对数刻度）" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p.median_ttft_ms.min]), points.map(p => [p.x, p.median_ttft_ms.max]), { hue: s.hue, opacity: 0.1 });
    c.series(points.map(p => [p.x, p.median_ttft_ms.median]), { hue: s.hue, dash: s.dash, name: s.key });
  }
  legend(f, series, 70, 24);
});
