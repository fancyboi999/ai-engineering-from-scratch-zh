'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  ['0x1000006a0', '_percent_change', '0x100000500 · 24 B', '0x100008118', 'delta 0x500'],
  [null, '_grade', '0x100000518 · 60 B', '0x10000811a', 'delta 0x18'],
  ['0x1000006bc', '_total', '0x100000554 · 52 B', '0x10000811b', 'delta 0x3c'],
  ['0x1000006ec', '_grade_label', '0x100000588 · 72 B', '0x10000811c', 'delta 0x34'],
];

module.exports = figure('fig-4-6', {
  height: 310,
  title: "四个 ledger 函数的全部引用",
  desc: "每函数一行。中间为函数、入口和函数体大小。左侧为 entry 内到达它的调用位置：_percent_change 为 0x1000006a0，_total 为 0x1000006bc，_grade_label 为 0x1000006ec；_grade 没有调用位置，因为已内联进 _grade_label。右侧为把它作为数据引用的 LC_FUNCTION_STARTS 条目：0x100008118、0x10000811a、0x10000811b、0x10000811c，对应 ULEB128 增量 0x500、0x18、0x3c、0x34。",
}, f => {
  f.kicker(20, 18, "entry 中的调用位置");
  f.kicker(230, 18, "函数");
  f.kicker(420, 18, "LC_FUNCTION_STARTS 条目");
  rows.forEach(([call, name, sub, start, delta], index) => {
    const y = 36 + index * 66;
    const fn = f.box({ x: 230, y, w: 180, h: 50, hue: 'violet', title: name, sub });
    if (call) {
      const site = f.box({ x: 20, y, w: 180, h: 50, hue: 'green', title: `entry ${call}`, sub: 'UNCONDITIONAL_CALL' });
      f.arrow(site.right(), [fn.x - 1, fn.cy], { style: 'call', packet: false });
    } else {
      f.box({ x: 20, y, w: 180, h: 50, hue: 'grey', dash: 'dashed', title: "无调用位置", sub: "已内联至 _grade_label" });
    }
    const entry = f.box({ x: 440, y, w: 180, h: 50, hue: 'green', title: start, sub: `${delta} · DATA` });
    f.arrow(entry.left(), [fn.x + fn.w + 1, fn.cy], { style: 'call', packet: false });
  });
});
