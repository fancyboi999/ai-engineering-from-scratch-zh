'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json')).load;
const series = [
  { key: 'default', name: "BF16 权重、BF16 KV", hue: 'plum' },
  { key: 'fp8', name: "FP8 权重、FP8 KV", hue: 'green' },
];

module.exports = figure('fig-4-3b', {
  height: 340,
  title: "FP8 改变整条延迟与吞吐量曲线",
  desc: "GB10 上 Qwen3-30B-A3B 的每个点代表并发 1 至 64 中的一级，以输出吞吐量对每输出 token 时间中位数绘制。每级并发下 FP8 点都更靠右且更低：每秒更多 token，每 token 更少时间。",
}, f => {
  const c = chart(f, { x: 66, y: 56, w: 540, h: 230, xDomain: [0, 500], yDomain: [0, 300], xTicks: [0, 100, 200, 300, 400, 500], yTicks: [0, 50, 100, 150, 200, 250, 300], xLabel: "每秒输出 token", yLabel: "TPOT 中位数，ms" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.series(points.map(p => [p.output_throughput.median, p.median_tpot_ms.median]), { hue: s.hue, name: s.key });
    for (const p of points) if (p.x === 1 || p.x === 64) c.note(p.output_throughput.median, p.median_tpot_ms.median, `c${p.x}`, p.x === 1 ? { dx: -8, dy: 4, anchor: 'end', hue: s.hue } : { dx: 8, dy: s.key === 'fp8' ? 16 : -8, hue: s.hue });
  }
  legend(f, series, 66, 22);
});
