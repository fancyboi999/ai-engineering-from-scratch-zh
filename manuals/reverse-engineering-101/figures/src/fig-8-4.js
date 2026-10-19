'use strict';

const { figure } = require('../../../_shared/figkit.js');

const observed = [
  { title: "_grade 位于 0x100000518，60 字节", sub: 'ev_41e8ca1c, procedure.body' },
  { title: "通过 0x66666667 除以 10", sub: "ev_2c883c7b 与 ev_41e8ca1c，assembly" },
  { title: "0x1000007d0 的五个四字节条目", sub: 'ev_41e8ca1c, cmp #0x4, ldr UXTW #0x2' },
  { title: "一个 DATA 引用，无调用边", sub: "ev_41e8ca1c 与 ev_644b3495，0x10000811a" },
  { title: "0x100000770 至 778 的 F D C B A", sub: "ev_ad37f574，39 字符串" },
];
const open = [
  { title: "五个表值", sub: "read_bytes 0x1000007d0，length 20" },
  { title: "0x1000007e8 的五个八字节条目", sub: "read_bytes 0x1000007e8，length 40" },
  { title: "95 分对应的字母", sub: "两个表，再看 0x100004030 的 _labels" },
  { title: "谁给 _grade_label 传入分数", sub: 'analyze_function entry' },
];

module.exports = figure('fig-8-4', {
  height: 290,
  title: "会话观察到了什么，哪些仍未知",
  desc: "两列。左列五项已观察主张及 Evidence ID：ev_41e8ca1c 中 0x100000518 的 _grade 为 60 字节；ev_2c883c7b 与 ev_41e8ca1c 用 0x66666667 除十；cmp #0x4、ldr UXTW #0x2 表明 0x1000007d0 有五个四字节条目；ev_41e8ca1c 与 ev_644b3495 仅有来自 0x10000811a 的一个 DATA 引用，无调用边；ev_ad37f574 显示 0x100000770 至 0x100000778 的 F D C B A 字符串。右列四项未结论及关闭它的调用：五个表值需 read_bytes 0x1000007d0、length 20；0x1000007e8 的五个八字节条目需该处 length 40；95 分的字母需两表，再看 0x100004030 的 _labels；谁传分数给 _grade_label，需 analyze_function entry。",
}, f => {
  f.kicker(20, 18, "已观察，附记录", { hue: 'teal' });
  f.kicker(336, 18, "未解决，附关闭它的调用", { hue: 'rose' });
  f.rule(320, 8, 320, 282, { dash: 'dashed' });
  observed.forEach((item, index) => {
    f.box({ x: 20, y: 30 + index * 50, w: 284, h: 42, hue: 'teal', title: item.title, sub: item.sub, titleSize: 12 });
  });
  open.forEach((item, index) => {
    f.box({ x: 336, y: 30 + index * 50, w: 284, h: 42, hue: 'rose', dash: 'dashed', title: item.title, sub: item.sub, titleSize: 12 });
  });
});
