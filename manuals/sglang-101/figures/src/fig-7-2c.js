'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const run = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10.json')).plain;
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const t = run.timers_s;
const items = [
  { name: 'rollout', value: median(run.rollouts.map(r => r['perf/rollout_time'])), hue: 'green' },
  { name: "对数概率", value: t.log_probs.median, hue: 'violet' },
  { name: "训练", value: t.actor_train.median, hue: 'violet' },
  { name: "权重", value: t.update_weights.median, hue: 'amber' },
  { name: "休眠、唤醒", value: t.sleep.median + t.wake_up.median, hue: 'amber' },
];

module.exports = figure('fig-7-2c', {
  height: 330,
  title: "GB10 上 GRPO 一步的阶段耗时",
  desc: "单 NVIDIA GB10 上 Miles、Qwen3-0.6B 的 12 步普通 GRPO，各阶段秒数中位数，SGLang 与 FSDP 同卡部署。SGLang rollout 57.2 s，训练器重算对数概率 25.2 s，训练 80.3 s，权重更新 0.65 s，休眠与唤醒 1.7 s。",
}, f => {
  const c = chart(f, { x: 66, y: 40, w: 540, h: 230, xDomain: [0, 1], yDomain: [0, 100], yTicks: [0, 25, 50, 75, 100], yLabel: "每步秒数中位数", yFormat: v => `${v}` });
  c.bars(items.map(i => ({ ...i, label: `${i.value < 10 ? i.value.toFixed(2) : i.value.toFixed(1)} s` })));
});
