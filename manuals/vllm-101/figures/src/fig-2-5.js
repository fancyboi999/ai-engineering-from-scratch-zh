'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load;
const at = (key, field) => runs[key].points.find(p => p.x === 32)[field].median;

module.exports = figure('fig-2-5', {
  height: 330,
  title: '锁定时钟为 900 MHz 时，32 用户下的 FP8 权重',
  desc: '在 NVIDIA L4 上以 32 个用户运行 Qwen3-8B 的 BF16 和 FP8 checkpoint，SM 时钟锁定为 900 MHz，KV 缓存池固定为 24,096 个 token，每种设置使用两个随机种子。BF16 每秒输出 208.8 个 token，FP8 为 284.7 个。每个 token 的耗时中位数分别为 119.9 ms 和 83.8 ms。',
}, f => {
  f.text(66, 30, '输出 token/s，越高越好', { size: 12, hue: 'ink' });
  const a = chart(f, { x: 66, y: 50, w: 220, h: 210, yDomain: [0, 400], xDomain: [0, 1], yTicks: [0, 200, 400], yLabel: '' });
  a.bars([
    { name: 'BF16', value: at('vllm-lock-b', 'output_throughput'), hue: 'grey', label: at('vllm-lock-b', 'output_throughput').toFixed(1) },
    { name: 'FP8', value: at('vllm-lock-fp8', 'output_throughput'), hue: 'green', label: at('vllm-lock-fp8', 'output_throughput').toFixed(1) },
  ], { width: 60 });
  f.text(366, 30, '单 token 中位耗时 ms，越低越好', { size: 12, hue: 'ink' });
  const b = chart(f, { x: 366, y: 50, w: 220, h: 210, yDomain: [0, 150], xDomain: [0, 1], yTicks: [0, 50, 100, 150], yLabel: '' });
  b.bars([
    { name: 'BF16', value: at('vllm-lock-b', 'median_tpot_ms'), hue: 'grey', label: at('vllm-lock-b', 'median_tpot_ms').toFixed(1) },
    { name: 'FP8', value: at('vllm-lock-fp8', 'median_tpot_ms'), hue: 'green', label: at('vllm-lock-fp8', 'median_tpot_ms').toFixed(1) },
  ], { width: 60 });
  f.text(66, 312, '两次运行均为 32 用户，使用相同 KV 缓存池。数值是两个随机种子的中位数。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
