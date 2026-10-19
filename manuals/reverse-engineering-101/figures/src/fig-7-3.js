'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  { y: 30, check: 'size', hue: 'grey', fails: [['percent_change_wide', "16 对 26 字节", 210, 30], ['percent_change_div_first', "16 对 18 字节", 420, 30], ['grade_thresholds', "46 对 39 字节，0 重定位", 210, 72]] },
  { y: 110, check: "掩码后字节", hue: 'grey', fails: [] },
  { y: 180, check: "重定位记录", hue: 'grey', fails: [] },
  { y: 250, check: "引用常量", hue: 'grey', fails: [['grade_case10_wrong', "1, 2, 3, 4, 4 对 1, 2, 3, 4, 3", 210, 250]] },
];
const passed = [
  ['percent_change_mul_first', "16 字节，无重定位", 210, 320],
  ['percent_change_split', "16 字节，无重定位", 420, 320],
  ['grade_switch', "46 字节，表 1, 2, 3, 4, 4", 210, 362],
  ['grade_table', "46 字节，表 1, 2, 3, 4, 4", 420, 362],
];

module.exports = figure('fig-7-3', {
  height: 412,
  title: "八个候选各在哪里停止",
  desc: "左侧从上到下检查 size、masked bytes、relocation records、referenced constants，最后 pass。大小检查右侧三个候选停止：percent_change_wide 为 16 对 26 字节，percent_change_div_first 为 16 对 18，grade_thresholds 为 46 对 39 字节、1 对 0 重定位。没有候选在掩码字节或重定位记录处停止。在引用常量处，grade_case10_wrong 的表为 1、2、3、4、4 对 1、2、3、4、3，因此停止。四个候选通过：percent_change_mul_first 与 percent_change_split 为 16 字节、无重定位，grade_switch 与 grade_table 为 46 字节、表 1、2、3、4、4。",
}, f => {
  rows.forEach((row, index) => {
    f.box({ x: 20, y: row.y, w: 170, h: 40, hue: row.hue, title: row.check, titleSize: 12 });
    const next = index + 1 < rows.length ? rows[index + 1].y : 320;
    f.arrow([105, row.y + 40], [105, next - 1], { style: 'call', label: "相同", labelSize: 11 });
    if (row.fails.length === 0) {
      f.box({ x: 210, y: row.y + 2, w: 200, h: 36, hue: 'grey', dash: 'dashed', title: "无候选在此停止", titleSize: 11 });
    }
    for (const [title, sub, x, y] of row.fails) {
      f.box({ x, y, w: 200, h: 36, hue: 'rose', dash: 'dashed', title, sub, titleSize: 11, pad: 8 });
    }
    f.arrow([190, row.y + 20], [209, row.y + 20], { style: row.fails.length ? 'fail' : 'reply' });
  });
  f.box({ x: 20, y: 320, w: 170, h: 40, hue: 'teal', title: 'pass', titleSize: 12 });
  f.arrow([190, 340], [209, 340], { style: 'reply' });
  for (const [title, sub, x, y] of passed) {
    f.box({ x, y, w: 200, h: 36, hue: 'teal', title, sub, titleSize: 11, pad: 8 });
  }
});
