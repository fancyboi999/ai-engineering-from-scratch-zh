'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs;
const seeds = [
  { key: 'plain-48', name: '随机种子 1234', hue: 'green', dash: 'solid' },
  { key: 'plain-48-s2', name: '随机种子 2', hue: 'teal', dash: 'dashed' },
  { key: 'plain-48-s3', name: '随机种子 3', hue: 'olive', dash: 'dotted' },
];
const mean = (rows, a, b) => rows.slice(a, b).reduce((sum, r) => sum + r.reward, 0) / (b - a);

module.exports = figure('fig-1-3', {
  height: 340,
  title: '三个随机种子的 48 步 reward',
  desc: '使用三个随机种子，对 Qwen3-0.6B 和 GSM8K 运行相同 GRPO 配置时的每步平均 reward。单步数值会波动，但三个种子的整体趋势都在上升。',
}, f => {
  const c = chart(f, { x: 60, y: 56, w: 560, h: 210, xDomain: [0, 47], yDomain: [0.5, 0.9], xTicks: [0, 12, 24, 36, 47], yTicks: [0.5, 0.6, 0.7, 0.8, 0.9], xLabel: '步骤', yLabel: '该步的平均奖励' });
  for (const s of seeds) {
    const rows = runs[s.key].per_step;
    c.series(rows.map(r => [r.step, r.reward]), { hue: s.hue, dash: s.dash, name: s.name, dots: false, width: 1.6 });
  }
  legend(f, seeds, 60, 22);
  const gains = seeds.map(s => { const rows = runs[s.key].per_step; return (mean(rows, rows.length - 8, rows.length) - mean(rows, 0, 8)).toFixed(3); });
  f.text(60, 326, `最后 8 步相对前 8 步的增幅：+${gains.join('、+')}`, { size: 12, serif: true });
});
