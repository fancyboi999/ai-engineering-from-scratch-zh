'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-3b', {
  height: 330,
  title: "共享前缀基准的两组存入一棵树",
  desc: "基数树的根锁计数永久为 1。下方第 1 组 system prompt 节点有 2,048 token，两运行请求使用它，因此锁为 2。它分出两个 128-token 问题叶子，各锁为 1。第二分支保存第 2 组 system prompt，锁为 0，可缓存且可淘汰。淘汰先从锁为 0 的叶子开始，由枝端向根推进。",
}, f => {
  f.beat(1);
  const root = f.box({ x: 250, y: 20, w: 140, h: 44, hue: 'grey', title: "根", sub: ["锁 1，永久"] });
  f.beat(2);
  const g1 = f.box({ x: 60, y: 110, w: 240, h: 52, hue: 'green', title: "第 1 组 system prompt", sub: ["2,048 token · 锁 2"] });
  f.line(root.cx - 30, root.y + root.h, g1.cx, g1.y, { style: 'call', head: false });
  f.beat(3);
  const qa = f.box({ x: 20, y: 216, w: 150, h: 52, hue: 'blue', title: "问题 A", sub: ["128 token · 锁 1"] });
  const qb = f.box({ x: 190, y: 216, w: 150, h: 52, hue: 'blue', title: "问题 B", sub: ["128 token · 锁 1"] });
  f.line(g1.cx - 40, g1.y + g1.h, qa.cx, qa.y, { style: 'call', head: false });
  f.line(g1.cx + 40, g1.y + g1.h, qb.cx, qb.y, { style: 'call', head: false });
  f.text(372, 236, "match_prefix 在 token 段", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(372, 252, "首次不同时拆分节点。", { size: 11, serif: true, hue: 'ink-soft' });
  f.beat(4);
  const g2 = f.box({ x: 360, y: 110, w: 240, h: 52, hue: 'green', dash: 'dashed', title: "第 2 组 system prompt", sub: ["2,048 token · 锁 0 · 可淘汰"] });
  f.line(root.cx + 30, root.y + root.h, g2.cx, g2.y, { style: 'call', head: false });
  f.beat(5);
  f.text(20, 300, "锁计数大于 0 就保护到根的整条路径。evict 释放锁为 0 的叶子，", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 318, "按最老访问时间优先，再沿分支向上。", { size: 11, serif: true, hue: 'ink-soft' });
});
