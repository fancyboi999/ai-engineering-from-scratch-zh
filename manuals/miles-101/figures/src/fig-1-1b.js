'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const run = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs['plain-48'];
const m = run.median_unpaused;
const diffs = run.per_step.map(p => p.train_time_s - p.log_probs_time_s).sort((a, b) => a - b);
const gradient = (diffs[diffs.length / 2 - 1] + diffs[diffs.length / 2]) / 2;
const value = key => (key === 'gradient' ? gradient : m[key].median);
const parts = [
  { key: 'rollout_time_s', name: "轨迹采样", hue: 'violet' },
  { key: 'log_probs_time_s', name: "对数概率", hue: 'blue' },
  { key: 'gradient', name: '梯度步骤', hue: 'blue' },
  { key: 'sleep_time_s', name: "卸载", hue: 'amber' },
  { key: 'wake_up_time_s', name: "加载", hue: 'amber' },
  { key: 'update_weights_time_s', name: '权重更新', hue: 'amber' },
];

module.exports = figure('fig-1-1b', {
  height: 330,
  title: '一个训练步骤的耗时分布',
  desc: `启用 heat guard 前，在一张 GB10 上使用 Qwen3-0.6B 运行 48 步。图中为各阶段中位耗时：rollout ${m.rollout_time_s.median.toFixed(1)} s，log probability ${m.log_probs_time_s.median.toFixed(1)} s，梯度步骤 ${gradient.toFixed(1)} s。后两项组成耗时 ${m.train_time_s.median.toFixed(1)} s 的训练阶段。trainer offload 耗时 ${m.sleep_time_s.median.toFixed(2)} s，onload 耗时 ${m.wake_up_time_s.median.toFixed(2)} s，权重更新耗时 ${m.update_weights_time_s.median.toFixed(2)} s。`,
}, f => {
  const c = chart(f, { x: 60, y: 40, w: 560, h: 220, xDomain: [0, 1], yDomain: [0, 100], yTicks: [0, 30, 60, 90], yLabel: "每步耗时（秒），中位数" });
  c.bars(parts.map(p => ({ name: p.name, value: value(p.key), hue: p.hue, label: value(p.key) >= 10 ? `${value(p.key).toFixed(1)} s` : `${value(p.key).toFixed(2)} s` })));
  f.text(60, 312, '先调优训练和 rollout。三个琥珀色阶段合计约 2 s。', { size: 12, serif: true });
});
