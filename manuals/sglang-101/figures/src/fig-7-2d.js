'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10.json'));
const steps = runs['plain-48'].rollouts;
const seed2 = runs['plain-48-s2'].rollouts;
const seed3 = runs['plain-48-s3'].rollouts;
const series = [
  { key: 'rollout/raw_reward_unfiltered', name: '原始奖励', hue: 'green' },
  { key: 'rollout/truncated_ratio', name: '在 1,024 token 截断的样本比例', hue: 'rose' },
];
const legendRows = [...series, { name: 'seed 2 和 3', hue: 'green', dash: 'dashed' }];

module.exports = figure('fig-7-2d', {
  height: 330,
  title: 'GB10 上的 48 步 GRPO',
  desc: '单 NVIDIA GB10 上 Miles、Qwen3-0.6B、GSM8K、默认 seed 的 48 步普通 GRPO 各步原始奖励与 1,024 token 上限截断比例。前八步平均奖励为 0.636，后八步为 0.758；相应截断比例均值从 0.33 降至 0.08。虚线为 seed 2 和 3 的原始奖励，均值分别从 0.653 升至 0.736、从 0.614 升至 0.766。',
}, f => {
  const c = chart(f, { x: 66, y: 62, w: 540, h: 206, xDomain: [0, 47], yDomain: [0, 1], xTicks: [0, 8, 16, 24, 32, 40, 47], yTicks: [0, 0.25, 0.5, 0.75, 1], xLabel: 'GRPO 步数', yLabel: '比例' });
  for (const s of series) c.series(steps.map(step => [step.rollout, step[s.key]]), { hue: s.hue, name: s.name, r: 2.2 });
  c.series(seed2.map(step => [step.rollout, step['rollout/raw_reward_unfiltered']]), { hue: 'green', dash: 'dashed', name: 'seed 2 原始奖励' });
  c.series(seed3.map(step => [step.rollout, step['rollout/raw_reward_unfiltered']]), { hue: 'green', dash: 'dashed', name: 'seed 3 原始奖励' });
  legend(f, legendRows, 66, 22);
});
