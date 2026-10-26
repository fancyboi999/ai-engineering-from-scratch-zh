'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const run = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs['plain-48'];
const m = run.median_unpaused;
const s = key => `${m[key].median.toFixed(1)} s`;
const diffs = run.per_step.map(p => p.train_time_s - p.log_probs_time_s).sort((a, b) => a - b);
const gradient = `${((diffs[diffs.length / 2 - 1] + diffs[diffs.length / 2]) / 2).toFixed(1)} s`;

module.exports = figure('fig-1-1', {
  height: 360,
  title: '一张 GPU 上的一个 GRPO 步骤',
  desc: `在搭载 GB10 的 DGX Spark 上使用 Qwen3-0.6B，每一步都会重复六个阶段。prompt 发送到 SGLang engine，生成 256 个答案，耗时 ${s('rollout_time_s')}。随后 math reward 为每个答案评分。FSDP trainer 用 ${s('log_probs_time_s')} 计算 log probability，再用 ${gradient} 执行梯度步骤。两者组成耗时 ${s('train_time_s')} 的训练阶段。权重更新耗时 ${m.update_weights_time_s.median.toFixed(2)} s，并将新权重传给 engine。耗时取自启用 heat guard 前的一次 ${m.step_time_s.steps} 步运行，因此没有暂停影响。`,
}, f => {
  const prompts = f.box({ x: 20, y: 36, w: 160, h: 64, hue: 'green', title: 'GSM8K prompt', sub: ['每步 32 个 prompt'] });
  const engine = f.box({ x: 240, y: 36, w: 170, h: 64, hue: 'violet', title: "SGLang 引擎", sub: ['sglang::scheduler', `256 个答案，${s('rollout_time_s')}`] });
  const reward = f.box({ x: 470, y: 36, w: 150, h: 64, hue: 'green', title: "数学奖励", sub: ['每个答案计 1 或 0'] });
  const logp = f.box({ x: 470, y: 176, w: 150, h: 64, hue: 'blue', title: "对数概率", titleSize: 12, sub: ['FSDPTrainRayActor', s('log_probs_time_s')] });
  const train = f.box({ x: 240, y: 176, w: 170, h: 64, hue: 'blue', title: 'GRPO 更新', sub: ['Adam，一步', gradient] });
  const sync = f.box({ x: 20, y: 176, w: 160, h: 64, hue: 'amber', title: '权重更新', sub: ['GPU 句柄，GPU 内复制', `${m.update_weights_time_s.median.toFixed(2)} s`] });

  f.arrow([prompts.x + prompts.w, 68], [engine.x - 1, 68], { style: 'call' });
  f.step(210, 56, 1);
  f.arrow([engine.x + engine.w, 68], [reward.x - 1, 68], { style: 'model' });
  f.step(440, 56, 2);
  f.arrow([545, reward.y + reward.h], [545, logp.y - 1], { style: 'event' });
  f.step(563, 138, 3);
  f.arrow([logp.x, 208], [train.x + train.w + 1, 208], { style: 'model' });
  f.step(440, 196, 4);
  f.arrow([train.x, 208], [sync.x + sync.w + 1, 208], { style: 'write' });
  f.step(210, 196, 5);
  f.path(`M100 ${sync.y} V138 H325 V${engine.y + engine.h + 1}`, { style: 'state' });
  f.step(118, 126, 6);

  f.kicker(20, 290, `一个步骤，${m.step_time_s.steps} 步的中位数，运行于启用过热保护之前`);
  f.text(20, 314, `共计 ${s('step_time_s')}。训练阶段耗时最长，权重更新最短。`, { size: 12, serif: true });
  f.text(20, 336, 'engine 和 trainer 轮流使用同一块 GPU 内存。', { size: 12, serif: true, hue: 'ink-soft' });
});
