'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).waves;
const series = [
  { key: 'default', metric: 'median_ttft_ms', name: "BF16 TTFT 中位数", hue: 'plum' },
  { key: 'fp8', metric: 'median_ttft_ms', name: "FP8 TTFT 中位数", hue: 'green' },
  { key: 'default', metric: 'p99_itl_ms', name: 'BF16 P99 ITL', hue: 'plum', dash: 'dashed' },
  { key: 'fp8', metric: 'p99_itl_ms', name: 'FP8 P99 ITL', hue: 'green', dash: 'dashed' },
];

module.exports = figure('fig-5-1h', {
  height: 360,
  title: "固定长度：较慢首 token，较平滑 decode",
  desc: "NVIDIA L4 上 Qwen3-8B 的 TTFT 中位数和 P99 ITL 对 --random-range-ratio，并发上限 16、64 个 prompt，每点三个种子，对数刻度。比例 1.0 时各请求输入 512、输出 128 token，BF16/FP8 的 TTFT 为 1,996/1,526 ms，P99 ITL 为 82/55 ms。比例 0.0 长度变化时，TTFT 为 291/129 ms，P99 ITL 为 300/95 ms。",
}, f => {
  const c = chart(f, { x: 70, y: 84, w: 536, h: 210, xDomain: [0, 1], yScale: 'log10', yDomain: [30, 3000], xTicks: [0, 0.5, 1], yTicks: [30, 100, 300, 1000, 3000], xLabel: "--random-range-ratio（1.0 表示所有请求等长）", yLabel: "ms（对数刻度）" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p[s.metric].min]), points.map(p => [p.x, p[s.metric].max]), { hue: s.hue, opacity: 0.1 });
    c.series(points.map(p => [p.x, p[s.metric].median]), { hue: s.hue, dash: s.dash, name: `${s.key}-${s.metric}` });
  }
  legend(f, series.slice(0, 2), 70, 22);
  legend(f, series.slice(2), 70, 44);
});
