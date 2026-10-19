'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-4', {
  height: 336,
  title: "cache_aware 如何选择服务器",
  desc: "决策流程先检查负载失衡：最高减最低大于 64，且最高大于最低 1.5 倍。是则发往最低负载服务器；否则根据字符树计算匹配率。大于 0.3 发往最长匹配服务器，0.3 及以下发往最低负载。每条分支都把请求文本插入树。",
}, f => {
  const request = f.box({ x: 230, y: 12, w: 180, h: 32, hue: 'olive', title: "请求文本" });
  const balance = f.box({ x: 150, y: 74, w: 290, h: 50, hue: 'amber', title: "负载失衡？", sub: ["max - min > 64 且 max > 1.5 x min"] });
  const match = f.box({ x: 150, y: 168, w: 340, h: 50, hue: 'amber', title: "匹配率 > 0.3？", sub: ["匹配字符 / 请求字符"] });
  const leastA = f.box({ x: 500, y: 74, w: 130, h: 50, hue: 'blue', title: "最低负载", sub: ["服务器"] });
  const longest = f.box({ x: 150, y: 262, w: 200, h: 50, hue: 'blue', title: "最长匹配", sub: ["树中的服务器"] });
  const leastB = f.box({ x: 410, y: 262, w: 220, h: 50, hue: 'blue', title: "最低负载", sub: ["相同时随机选择"] });
  f.arrow([320, request.y + request.h], [320, balance.y - 1], { style: 'call' });
  f.arrow(balance.right(), [leastA.x - 1, balance.cy], { style: 'call', label: "是", labelX: 470 });
  f.arrow([320, balance.y + balance.h], [320, match.y - 1], { style: 'call', label: "否" });
  f.arrow([250, match.y + match.h], [250, longest.y - 1], { style: 'call', label: "是" });
  f.arrow([470, match.y + match.h], [470, leastB.y - 1], { style: 'call', label: "否" });
  f.text(20, 98, "步骤 1", { size: 11, hue: 'ink-mute' });
  f.text(20, 192, "步骤 2", { size: 11, hue: 'ink-mute' });
  f.text(20, 286, "步骤 3", { size: 11, hue: 'ink-mute' });
  f.text(20, 330, "各分支都将请求文本插入所选服务器的树", { size: 11, serif: true, hue: 'ink-soft' });
});
