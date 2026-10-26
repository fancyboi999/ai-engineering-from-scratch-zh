'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  { model: 'Qwen/Qwen3-8B', layers: '36', heads: '8', dim: '128', total: '144 KiB' },
  { model: 'Qwen3-30B-A3B', layers: '48', heads: '4', dim: '128', total: '96 KiB' },
];

module.exports = figure('fig-2-1', {
  height: 230,
  title: 'KV cache 中每个 token 的内存占用',
  desc: '每个 token 的字节数等于层数乘 KV 头数、头维度和 2（key 与 value），再乘 BF16 每个值的 2 字节。Qwen3-8B 有 36 层、8 个 KV 头、头维度 128，占 144 KiB。Qwen3-30B-A3B 有 48 层、4 个 KV 头，占 96 KiB。',
}, f => {
  const cols = [['层数', 170], ['KV 头数', 260], ['头维度', 350], ['K 与 V', 440], ['BF16 字节数', 530]];
  cols.forEach(([name, x]) => f.kicker(x, 30, name, { anchor: 'middle' }));
  f.kicker(20, 30, '模型');
  rows.forEach((r, index) => {
    const y = 48 + index * 70;
    f.box({ x: 20, y, w: 116, h: 44, hue: 'violet', title: r.model.replace('Qwen/', ''), titleSize: 11.5 });
    [[r.layers, 170], [r.heads, 260], [r.dim, 350], ['2', 440], ['2', 530]].forEach(([v, x], i) => {
      f.box({ x: x - 30, y, w: 60, h: 44, hue: 'green', title: v });
      if (i < 4) f.text(x + 45, y + 27, 'x', { size: 12, anchor: 'middle', hue: 'ink-soft' });
    });
    f.text(20, y + 62, `${r.total}，每个用户的每个 token 均如此`, { size: 11.5, weight: 700, hue: 'green' });
  });
});
