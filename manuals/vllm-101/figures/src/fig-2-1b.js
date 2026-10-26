'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-1b', {
  height: 236,
  title: '缓存池 token 容量决定可容纳的用户数',
  desc: 'L4 的缓存池可容纳 24,096 个 token。启动日志报告并发量 2.94，因为它假设每个用户都使用满 8,192-token 上下文。提示词为 512 token、输出为 128 token 时，每个用户占 640 token，因此可容纳 37 个用户。',
}, f => {
  f.kicker(20, 18, 'L4 上的 Qwen3-8B KV 缓存池');
  f.rect(20, 28, 600, 34, { hue: 'green' });
  f.text(320, 50, '24,096 个 token；每个 144 KiB，共 3.31 GiB', { size: 12, weight: 700, anchor: 'middle', hue: 'green' });
  f.kicker(20, 92, '每个用户都使用 8,192 个 token 时');
  const full = 600 * 8192 / 24096;
  for (let i = 0; i < 2; i += 1) f.rect(20 + i * full, 100, full - 3, 30, { hue: 'blue' });
  f.rect(20 + 2 * full, 100, 600 - 2 * full, 30, { hue: 'grey', dash: 'dashed' });
  f.text(20, 148, '最大并发量为 2.94，即启动日志中的数值', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.kicker(20, 176, '每个用户使用 640 个 token 时');
  const small = 600 * 640 / 24096;
  for (let i = 0; i < 37; i += 1) f.rect(20 + i * small, 184, small - 2, 22, { hue: 'blue' });
  f.text(20, 226, '可容纳 37 个用户，每人 512 个提示词 token、128 个输出 token', { size: 11.5, serif: true, hue: 'ink-soft' });
});
