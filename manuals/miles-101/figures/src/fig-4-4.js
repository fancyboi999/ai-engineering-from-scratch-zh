'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs;
const series = [
  { key: 'e6a-base', name: '完整词表', hue: 'grey', dash: 'dashed' },
  { key: 'e11-topp-topk', name: 'top-p 0.95，top-k 64，启用 replay', hue: 'green', dash: 'solid' },
];
const med = key => { const v = runs[key].per_step.map(r => r.logprob_abs_diff).sort((a, b) => a - b); return (v[5] + v[6]) / 2; };

module.exports = figure('fig-4-4', {
  height: 330,
  title: '回放采样 token 可缩小差距',
  desc: `随机种子 1 的 12 步训练中，engine 和 trainer 每步 log probability 的绝对差值均值。完整词表的中位数为 ${med('e6a-base').toFixed(4)}；启用 top-p 和 top-k replay 后为 ${med('e11-topp-topk').toFixed(4)}。`,
}, f => {
  const c = chart(f, { x: 70, y: 56, w: 550, h: 200, xDomain: [0, 11], yDomain: [0.012, 0.0165], xTicks: [0, 3, 6, 9, 11], yTicks: [0.012, 0.013, 0.014, 0.015, 0.016], yFormat: v => v.toFixed(3), xLabel: '步骤', yLabel: '对数概率差距，平均绝对差' });
  for (const s of series) c.series(runs[s.key].per_step.map(r => [r.step, r.logprob_abs_diff]), { hue: s.hue, dash: s.dash, name: s.name });
  legend(f, series, 70, 22);
  f.text(70, 316, `差距中位数从 ${med('e6a-base').toFixed(4)} 降至 ${med('e11-topp-topk').toFixed(4)}，约下降 ${Math.round((1 - med('e11-topp-topk') / med('e6a-base')) * 100)}%。一个随机种子。`, { size: 12, serif: true });
});
