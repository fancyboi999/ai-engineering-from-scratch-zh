'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs;
const base = runs['e6a-base'].per_step;
const dapo = runs['e2b-dapo-filter'].per_step;
const mean = v => v.reduce((a, b) => a + b, 0) / v.length;

module.exports = figure('fig-3-2b', {
  height: 340,
  title: 'filter 前统计的 reward 更高',
  desc: `随机种子 1 的 12 步训练中，engine 已完成的所有答案每步平均 reward。不启用 filter 时为 ${mean(base.map(r => r.reward)).toFixed(3)}。启用 filter 后，在丢弃任何组之前统计的平均值为 ${mean(dapo.map(r => r.reward_all_samples)).toFixed(3)}。`,
}, f => {
  const c = chart(f, { x: 60, y: 56, w: 560, h: 200, xDomain: [0, 11], yDomain: [0.5, 0.8], xTicks: [0, 3, 6, 9, 11], yTicks: [0.5, 0.6, 0.7, 0.8], xLabel: '步骤', yLabel: '全部已完成答案的平均奖励' });
  c.series(base.map(r => [r.step, r.reward]), { hue: 'grey', name: '不启用 filter' });
  c.series(dapo.map(r => [r.step, r.reward_all_samples]), { hue: 'violet', name: '启用 filter' });
  legend(f, [{ name: '不启用 filter', hue: 'grey' }, { name: 'DAPO 过滤器，过滤前', hue: 'violet' }], 60, 22);
  f.text(60, 326, `12 步均值：未启用 filter 为 ${mean(base.map(r => r.reward)).toFixed(3)}；启用 filter、丢弃组前统计为 ${mean(dapo.map(r => r.reward_all_samples)).toFixed(3)}。一个随机种子。`, { size: 12, serif: true });
});
