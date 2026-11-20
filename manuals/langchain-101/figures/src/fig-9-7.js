'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/prodapp-mac/summary/load-mac.json'));
const cells = data.cells;
const users = [...new Set(cells.map(c => c.users))].sort((a, b) => a - b);
const hues = { [users[0]]: 'violet', [users[users.length - 1]]: 'indigo' };
const dashes = { [users[0]]: 'solid', [users[users.length - 1]]: 'dashed' };
const top = v => Math.ceil(v * 1.15);
const baseRate = data.baseline.reduce((sum, b) => sum + b.ok / b.wall_s, 0) / data.baseline.length;
const rateMax = Math.ceil(Math.max(baseRate, ...cells.map(c => c.runs_per_s_exact)) * 13) / 10;
const secMax = Math.ceil(Math.max(...cells.map(c => c.p95_s)) * 1.1 / 50) * 50;
const probe = data.ollama_parallel.levels;
const levels = [...new Set(probe.map(p => p.concurrent))];
const tokMax = Math.ceil(Math.max(...probe.map(p => p.tokens_per_s)) * 1.1 / 20) * 20;
const base = data.baseline.flatMap(b => b.run_seconds);
const baseMedian = base.slice().sort((a, b) => a - b)[Math.floor(base.length / 2)];
const median = list => list.slice().sort((a, b) => a - b)[Math.floor(list.length / 2)];

module.exports = figure('fig-9-7', {
  height: 340,
  title: 'worker 数与模型服务器：Mac 上的 Qwen3 4B',
  desc: `三个面板。左：每秒完成的运行数，${cells.map(c => `${c.workers} 个 worker、${c.users} 个用户为 ${c.runs_per_s_exact}`).join('，')}。中：各格中每次运行的中位秒数与第 95 百分位秒数，对照单个用户独自运行时的中位数 ${baseMedian.toFixed(2)} s，该用户每秒完成 ${baseRate.toFixed(3)} 次运行。右：Ollama 在同时处理 1 到 ${Math.max(...levels)} 个请求时每秒输出的 token 数，依次为 ${levels.map(l => median(probe.filter(p => p.concurrent === l).map(p => p.tokens_per_s)).toFixed(0)).join('、')}。`,
}, f => {
  users.forEach((u, i) => {
    f.path(`M${16 + i * 160} 18 H${40 + i * 160}`, { hue: hues[u], dash: dashes[u], head: false, width: 2, packet: false });
    f.text(46 + i * 160, 22, `${u} 个用户同时`, { size: 11, hue: hues[u] });
  });
  f.rule(350, 18, 374, 18, { hue: 'ink-soft', dash: 'dotted', width: 1.5 });
  f.text(380, 22, '单个用户', { size: 11, hue: 'ink-soft' });

  const a = chart(f, { x: 44, y: 70, w: 150, h: 210, xDomain: [0.5, 4.5], yDomain: [0, rateMax], xTicks: [1, 2, 4], yTicks: Array.from({ length: Math.round(rateMax * 10) + 1 }, (_, i) => i / 10), yLabel: '每秒完成的运行数' });
  f.rule(a.px(0.5), a.py(baseRate), a.px(4.5), a.py(baseRate), { hue: 'ink-soft', dash: 'dotted', width: 1.5 });
  users.forEach(u => a.series(cells.filter(c => c.users === u).map(c => [c.workers, c.runs_per_s_exact]), { hue: hues[u], dash: dashes[u] }));
  f.text(44 + 75, 318, 'uvicorn worker 数', { size: 11, anchor: 'middle', serif: true, hue: 'ink-soft' });

  const b = chart(f, { x: 250, y: 70, w: 160, h: 210, xDomain: [0.5, 4.5], yDomain: [0, secMax], xTicks: [1, 2, 4], yTicks: Array.from({ length: secMax / 50 + 1 }, (_, i) => i * 50), yLabel: '每次运行的秒数' });
  f.rule(b.px(0.5), b.py(baseMedian), b.px(4.5), b.py(baseMedian), { hue: 'ink-soft', dash: 'dotted', width: 1.5 });
  users.forEach((u, side) => {
    for (const c of cells.filter(c => c.users === u)) {
      const x = b.px(c.workers) + (side ? 6 : -6);
      f.rule(x, b.py(c.p50_s), x, b.py(c.p95_s), { hue: hues[u], width: 1.6, dash: dashes[u] === 'dashed' ? 'dashed' : undefined });
      f.dot(x, b.py(c.p50_s), { hue: hues[u], r: 3 });
    }
  });
  f.text(250 + 80, 318, '点为中位数，条到 p95', { size: 11, anchor: 'middle', serif: true, hue: 'ink-soft' });

  const c = chart(f, { x: 462, y: 70, w: 150, h: 210, xScale: 'log2', xDomain: [0.8, Math.max(...levels) * 1.25], yDomain: [0, tokMax], xTicks: levels, yTicks: Array.from({ length: tokMax / 20 + 1 }, (_, i) => i * 20), yLabel: 'Ollama 每秒 token 数' });
  for (const p of probe) f.dot(c.px(p.concurrent), c.py(p.tokens_per_s), { hue: 'olive', r: 2.4 });
  c.series(levels.map(l => [l, median(probe.filter(p => p.concurrent === l).map(p => p.tokens_per_s))]), { hue: 'olive', dots: false });
  f.text(466 + 75, 318, '同时请求数', { size: 11, anchor: 'middle', serif: true, hue: 'ink-soft' });
});
