'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-8-3', {
  height: 280,
  title: '一个包含 16-token block 的缓存池服务所有请求',
  desc: 'KV cache 是由 16-token block 组成的缓存池。每个请求都有一个 block table，将 token 位置映射到池中任意 block 编号。完整 block 会记录在哈希表中以供前缀命中。空闲 block 在队列中等待；需要腾出空间时，最久未使用的缓存 block 会先被移除。',
}, f => {
  f.kicker(20, 18, 'GPU 上的 block 缓存池');
  const used = { 2: 'blue', 3: 'blue', 7: 'blue', 5: 'violet', 6: 'violet', 10: 'violet', 11: 'green', 12: 'green' };
  for (let i = 0; i < 16; i += 1) {
    const x = 20 + (i % 8) * 76;
    const y = 30 + Math.floor(i / 8) * 46;
    const hue = used[i] || 'grey';
    f.box({ x, y, w: 68, h: 38, hue, dash: used[i] ? undefined : 'dashed', title: `#${i}`, titleSize: 11.5 });
  }
  f.kicker(20, 150, 'Block 映射表');
  f.box({ x: 20, y: 160, w: 190, h: 44, hue: 'blue', title: '请求 A', sub: '#2, #3, #7' });
  f.box({ x: 226, y: 160, w: 190, h: 44, hue: 'violet', title: '请求 B', sub: '#5, #6, #10' });
  f.box({ x: 432, y: 160, w: 188, h: 44, hue: 'green', title: '缓存前缀', sub: '#11, #12，按哈希命中' });
  f.text(20, 236, '虚线 block 表示空闲并在队列中等待。请求每累计 16 个 token 就占用一个 block。', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 258, '队列为空时，最久未使用的缓存 block 会先被移除。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
