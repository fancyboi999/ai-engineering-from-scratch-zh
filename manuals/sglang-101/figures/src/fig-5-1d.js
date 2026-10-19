'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const summary = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json'));
const runs = summary.rate;
const series = [
  { key: 'fp8', name: 'FP8', hue: 'green' },
  { key: 'default', name: 'BF16', hue: 'plum' },
];

module.exports = figure('fig-5-1d', {
  height: 350,
  title: "完成请求与达标请求，对比提供负载",
  desc: "GB10 上 Qwen3-30B-A3B，每秒 0.5 至 16 请求的泊松到达。虚线为每秒完成请求，实线为同时满足首 token 小于 1 秒、平均每 token 小于 100 ms 的请求。FP8 在提供 1 请求/秒时达标 1.03，从 4 起几乎没有；BF16 各负载几乎均无请求达标。",
}, f => {
  const c = chart(f, { x: 66, y: 56, w: 540, h: 230, xScale: 'log2', yScale: 'linear', xDomain: [0.5, 16], yDomain: [0, 9], xTicks: [0.5, 1, 2, 4, 8, 16], yTicks: [0, 3, 6, 9], xLabel: "提供的请求速率，请求/秒（泊松）", yLabel: "每秒请求数" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.series(points.map(p => [p.x, p.request_throughput.median]), { hue: s.hue, dash: 'dashed', name: `${s.key}-served` });
    c.band(points.map(p => [p.x, p.goodput_rps.min]), points.map(p => [p.x, p.goodput_rps.max]), { hue: s.hue });
    c.series(points.map(p => [p.x, p.goodput_rps.median]), { hue: s.hue, name: `${s.key}-good` });
  }
  const at = (key, x) => runs[key].points.find(p => p.x === x);
  c.note(16, at('fp8', 16).request_throughput.median, `${at('fp8', 16).request_throughput.median.toFixed(2)} 完成`, { dx: -8, dy: -8, anchor: 'end', hue: 'green' });
  c.note(16, at('default', 16).request_throughput.median, `${at('default', 16).request_throughput.median.toFixed(2)} 完成`, { dx: -8, dy: -8, anchor: 'end', hue: 'plum' });
  f.text(c.px(0.5) + 10, c.py(2.4), `FP8，提供 1 请求/秒： ${at('fp8', 1).goodput_rps.median.toFixed(2)} 达标`, { size: 11, serif: true, hue: 'green' });
  legend(f, [{ name: 'FP8', hue: 'green' }, { name: 'BF16', hue: 'plum' }, { name: "完成（虚线）", hue: 'ink-soft', dash: 'dashed' }, { name: "达标（实线）", hue: 'ink-soft' }], 66, 22);
  f.text(66, 340, `目标：首 token 低于 ${summary.slo.ttft_ms} ms，平均每 token 低于 ${summary.slo.tpot_ms} ms（每请求）`, { size: 11, serif: true, hue: 'ink-soft' });
});
