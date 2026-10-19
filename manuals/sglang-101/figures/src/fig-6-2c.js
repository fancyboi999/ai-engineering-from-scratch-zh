'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json')).load;
const series = [
  { key: 'default', name: 'BF16', hue: 'plum' },
  { key: 'fp8', name: 'FP8', hue: 'green' },
];

module.exports = figure('fig-6-2c', {
  height: 330,
  title: "MoE 模型每输出 token 时间随批次增长",
  desc: "GB10 上 Qwen3-30B-A3B 的每输出 token 时间中位数。BF16 从并发 1 的 32.5 ms 增至 64 的 254，约八倍；FP8 从 18.4 增到 132。新增请求将 token 路由到其他专家，因此每个 decode 步读取更多专家权重。",
}, f => {
  const c = chart(f, { x: 66, y: 56, w: 540, h: 220, xScale: 'log2', xDomain: [1, 64], yDomain: [0, 300], xTicks: [1, 2, 4, 8, 16, 32, 64], yTicks: [0, 50, 100, 150, 200, 250, 300], xLabel: "最大并发（基准客户端）", yLabel: "TPOT 中位数，ms" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p.median_tpot_ms.min]), points.map(p => [p.x, p.median_tpot_ms.max]), { hue: s.hue });
    c.series(points.map(p => [p.x, p.median_tpot_ms.median]), { hue: s.hue, name: s.key });
  }
  const at = (key, x) => runs[key].points.find(p => p.x === x).median_tpot_ms.median;
  c.note(64, at('default', 64), `${at('default', 64).toFixed(0)}`, { dx: -8, dy: -10, anchor: 'end', hue: 'plum' });
  c.note(64, at('fp8', 64), `${at('fp8', 64).toFixed(0)}`, { dx: -8, dy: 18, anchor: 'end', hue: 'green' });
  legend(f, series, 66, 22);
});
