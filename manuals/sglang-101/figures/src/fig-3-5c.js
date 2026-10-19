'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json'))['working-set'];
const series = [
  { key: 'default', name: "仅 GPU 池", hue: 'rose' },
  { key: 'hicache', name: "HiCache，主机池 96,377 token", hue: 'green' },
];

module.exports = figure('fig-3-5c', {
  height: 340,
  title: "HiCache 保存 GPU 池淘汰的 prompt",
  desc: "NVIDIA L4 上 Qwen3-8B 的 TTFT 中位数对不同 2,048-token system prompt 数，每点三个种子，对数刻度。GPU 池容纳 24,094 token。四份 prompt 时双方约 360 ms；16、32 份时默认 3,259、5,449 ms，HiCache 553、817 ms；64 份超过 GPU 与主机池合计容量，默认 6,821 ms，HiCache 3,610 ms。",
}, f => {
  const c = chart(f, { x: 70, y: 64, w: 536, h: 222, xScale: 'log2', xDomain: [4, 64], yScale: 'log10', yDomain: [100, 10000], xTicks: [4, 8, 16, 32, 64], yTicks: [100, 300, 1000, 3000, 10000], xLabel: "不同的 2,048-token system prompt 数", yLabel: "TTFT 中位数，ms（对数刻度）" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p.median_ttft_ms.min]), points.map(p => [p.x, p.median_ttft_ms.max]), { hue: s.hue });
    c.series(points.map(p => [p.x, p.median_ttft_ms.median]), { hue: s.hue, name: s.key });
  }
  legend(f, series, 70, 22);
});
