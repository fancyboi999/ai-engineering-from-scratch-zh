'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const run = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs['plain-48'];
const m = run.median_unpaused;
const v = key => m[key].median;
const phases = ['rollout_time_s', 'wake_up_time_s', 'train_time_s', 'sleep_time_s', 'update_weights_time_s'];
const total = phases.reduce((sum, key) => sum + v(key), 0);
const residuals = run.per_step
  .filter(row => row.step_paused_s === 0 && ['step_time_s', ...phases].every(key => typeof row[key] === 'number'))
  .map(row => row.step_time_s - phases.reduce((sum, key) => sum + row[key], 0))
  .sort((a, b) => a - b);
const middle = Math.floor(residuals.length / 2);
const untimed = residuals.length % 2 ? residuals[middle] : (residuals[middle - 1] + residuals[middle]) / 2;

module.exports = figure('fig-8-4', {
  height: 330,
  title: 'engine 和 trainer 轮流使用同一内存',
  desc: `按启用 heat guard 前一次 48 步运行的阶段中位耗时，按比例绘制一个 colocated 训练步骤。rollout 期间 engine 保留权重和 KV cache，耗时 ${v('rollout_time_s').toFixed(1)} s，随后释放内存。trainer 用 ${v('wake_up_time_s').toFixed(2)} s 将状态加载到 GPU，训练耗时 ${v('train_time_s').toFixed(1)} s，其中 ${v('log_probs_time_s').toFixed(1)} s 用于计算 log probability，之后用 ${v('sleep_time_s').toFixed(2)} s 释放状态。engine 再次加载，并在 ${v('update_weights_time_s').toFixed(2)} s 内获取新权重。在相同的 ${residuals.length} 步中，每个 ${v('step_time_s').toFixed(1)} s 步骤有 ${untimed.toFixed(1)} s 没有计时器覆盖。`,
}, f => {
  const x0 = 160;
  const w = 460;
  const px = t => x0 + (t / total) * w;
  const t1 = v('rollout_time_s');
  const t2 = t1 + v('wake_up_time_s');
  const t3 = t2 + v('train_time_s');
  const t4 = t3 + v('sleep_time_s');
  const t5 = t4 + v('update_weights_time_s');

  f.kicker(20, 28, '48 步各阶段中位数，按比例显示');
  f.text(20, 74, '引擎', { size: 12, weight: 700, hue: 'violet' });
  f.text(20, 92, '权重、KV cache', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(px(0), 58, px(t1) - px(0), 40, { hue: 'violet' });
  f.text((px(0) + px(t1)) / 2, 83, `采样 ${t1.toFixed(1)} s`, { size: 11.5, anchor: 'middle', hue: 'violet' });
  f.rect(px(t4), 58, px(t5) - px(t4) + 2, 40, { hue: 'violet' });

  f.text(20, 144, '训练器', { size: 12, weight: 700, hue: 'blue' });
  f.text(20, 162, '权重、optimizer', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(px(t1), 128, px(t4) - px(t1), 40, { hue: 'blue' });
  f.text((px(t2) + px(t3)) / 2, 153, `训练 ${(t3 - t2).toFixed(1)} s，其中 log probability ${v('log_probs_time_s').toFixed(1)} s`, { size: 11.5, anchor: 'middle', hue: 'blue' });

  f.line(px(t1), 50, px(t1), 176, { style: 'state', head: false, packet: false });
  f.line(px(t4), 50, px(t4), 176, { style: 'state', head: false, packet: false });
  f.text(px(t1) + 4, 196, `trainer 加载 ${v('wake_up_time_s').toFixed(2)} s`, { size: 11, hue: 'amber' });
  f.text(px(t4) - 4, 196, `trainer 卸载 ${v('sleep_time_s').toFixed(2)} s`, { size: 11, anchor: 'end', hue: 'amber' });
  f.text(px(t4) - 4, 214, `随后更新权重 ${v('update_weights_time_s').toFixed(2)} s`, { size: 11, anchor: 'end', hue: 'amber' });

  f.text(20, 252, '同一时刻只有一端占用 GPU 内存。', { size: 12, serif: true });
  f.text(20, 274, '约 2.5 分钟的训练步骤中，可见的交接耗时约 2 s。', { size: 12, serif: true });
  f.text(20, 304, `每一步有 ${untimed.toFixed(1)} s 没有计时器覆盖，例如 engine 释放阶段。`, { size: 11.5, serif: true, hue: 'ink-soft' });
});
