'use strict';

const { figure } = require('../../../_shared/figkit.js');

const legOne = [
  { hue: 'green', title: 'ledger.c', sub: "原始代码，本机 -O1 编译" },
  { hue: 'grey', title: 'percent_change_wide.c', sub: "候选，重命名 cand_percent_change" },
  { hue: 'grey', title: 'differential', sub: "driver.c 将两者链接为一个程序" },
  { hue: 'grey', title: "输入网格", sub: "九类危险情况，共 92 格" },
];
const legTwo = [
  { hue: 'green', title: 'ledger-x86_64-O1.o', sub: "grade：46 字节，一个 R_X86_64_PC32" },
  { hue: 'grey', title: 'grade_switch.c', sub: 'clang -target x86_64-unknown-linux-gnu -O1' },
  { hue: 'grey', title: 'mask_relocations', sub: "双方偏移 38 的四字节清零" },
  { hue: 'grey', title: "重定位记录", sub: ".rodata+0x10 与 .rodata-0x4，形状相同" },
];

module.exports = figure('fig-7-2', {
  height: 324,
  title: "一个证明的两条路径",
  desc: "两列自上而下。路径一执行并比较：ledger.c 是原始代码，以本机 -O1 编译；percent_change_wide.c 为候选，重命名 cand_percent_change；driver.c 将两者链接为 differential；输入网格含九类危险情况的 92 格，貌似合理的一对有 28 次不匹配，等价一对为零。路径二重编译并比较：ledger-x86_64-O1.o 的 grade 为 46 字节，含一个 R_X86_64_PC32 重定位；grade_switch.c 以 clang、x86_64-unknown-linux-gnu、-O1 编译；mask_relocations 将双方偏移 38 的四字节清零；.rodata+0x10 与 .rodata-0x4 重定位形状相同；双方 read_table 均得 1、2、3、4、4，grade_case10_wrong 得 1、2、3、4、3。",
}, f => {
  f.kicker(20, 18, "路径一：执行并比较");
  f.kicker(340, 18, "路径二：重编译并比较");
  [[legOne, 20], [legTwo, 340]].forEach(([column, x]) => {
    const cx = x + 140;
    column.forEach((item, index) => {
      const y = 30 + index * 60;
      f.box({ x, y, w: 280, h: 40, hue: item.hue, title: item.title, sub: item.sub, titleSize: 12 });
      if (index < column.length - 1) f.arrow([cx, y + 40], [cx, y + 59], { style: 'call' });
    });
  });
  f.arrow([160, 250], [87, 269], { style: 'fail' });
  f.arrow([160, 250], [232, 269], { style: 'call' });
  f.box({ x: 20, y: 270, w: 135, h: 40, hue: 'rose', dash: 'dashed', title: "貌似合理的一对", sub: "28 次不匹配", titleSize: 12 });
  f.box({ x: 165, y: 270, w: 135, h: 40, hue: 'teal', title: "等价的一对", sub: "0 次不匹配", titleSize: 12 });
  f.arrow([480, 250], [403, 269], { style: 'call' });
  f.arrow([480, 250], [545, 269], { style: 'fail' });
  f.box({ x: 340, y: 270, w: 126, h: 40, hue: 'teal', title: 'read_table', sub: '1, 2, 3, 4, 4', titleSize: 12 });
  f.box({ x: 470, y: 270, w: 150, h: 40, hue: 'rose', dash: 'dashed', title: 'grade_case10_wrong', sub: '1, 2, 3, 4, 3', titleSize: 11 });
});
