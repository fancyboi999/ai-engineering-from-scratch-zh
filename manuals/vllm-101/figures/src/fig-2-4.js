'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const bytesPerToken = 36 * 8 * 128 * 2;
const perGiB = bytes => Math.floor(2 ** 30 / bytes);

module.exports = figure('fig-2-4', {
  height: 320,
  title: 'FP8 KV cache 每 GiB 可容纳双倍 token',
  desc: '按公式计算 Qwen3-8B 每 GiB 可容纳的 KV cache token 数。模型有 36 层、8 个 KV 头，头维度为 128。BF16 每个值占 2 字节，每 token 占 144 KiB，每 GiB 可容纳 7,281 个 token。FP8 每个值占 1 字节，每 token 占 72 KiB，每 GiB 可容纳 14,563 个 token。该数值来自公式，不是实测结果。',
}, f => {
  const c = chart(f, { x: 66, y: 50, w: 540, h: 200, yDomain: [0, 18000], xDomain: [0, 1], yTicks: [0, 6000, 12000, 18000], yFormat: v => v.toLocaleString('en-US'), yLabel: '每 GiB 的 KV token 数' });
  c.bars([
    { name: 'BF16，每 token 144 KiB', value: perGiB(bytesPerToken * 2), hue: 'grey', label: perGiB(bytesPerToken * 2).toLocaleString('en-US') },
    { name: 'FP8，每 token 72 KiB', value: perGiB(bytesPerToken), hue: 'green', label: perGiB(bytesPerToken).toLocaleString('en-US') },
  ], { width: 110 });
  f.text(66, 306, '根据每个 token 的内存计算。测试期间固定了 block 数量。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
