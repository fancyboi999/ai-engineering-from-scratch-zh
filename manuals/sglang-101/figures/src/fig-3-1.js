'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-1', {
  height: 250,
  title: "Qwen3-0.6B 每 token 成本",
  desc: "Qwen3-0.6B 配置的五个因子相乘，得到每 token 114,688 字节：key/value 的 2、28 层、8 KV head、head dimension 128，以及 bfloat16 的 2 字节。启动日志 bytes_per_slot 打印同样数字。181,574 个这种槽位组成 20.82 GB，即 19.39 GiB 的池。",
}, f => {
  f.kicker(20, 20, "一个 token，五个因子");
  const factors = [
    ['2', "K 与 V"],
    ['28', 'layers'],
    ['8', "KV head"],
    ['128', "head 维度"],
    ['2 B', 'bfloat16'],
  ];
  factors.forEach(([value, label], index) => {
    const x = 20 + index * 94;
    f.box({ x, y: 34, w: 80, h: 56, hue: index === 4 ? 'violet' : 'green', title: value, sub: [label], titleSize: 16 });
    if (index < factors.length - 1) f.text(x + 87, 68, '×', { size: 14, anchor: 'middle', hue: 'ink-soft' });
  });
  f.text(484, 68, '=', { size: 16, anchor: 'middle', hue: 'ink-soft' });
  f.box({ x: 500, y: 34, w: 120, h: 56, hue: 'green', title: '114,688 B', sub: ['112 KiB'], titleSize: 13 });
  f.kicker(20, 124, "启动日志中相同的数字");
  f.box({ x: 20, y: 134, w: 600, h: 44, hue: 'blue', title: 'Auto-sized attention KV pool', sub: ['kv_budget=19.39 GB · bytes_per_slot=114688 · pool_size=181574'], align: 'left' });
  f.kicker(20, 206, "池容量");
  f.text(20, 228, "181,574 槽 × 114,688 字节 = 20.82 GB，即 19.39 GiB KV", { size: 12, serif: true });
});
