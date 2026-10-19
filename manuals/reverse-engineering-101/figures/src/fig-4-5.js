'use strict';

const { figure } = require('../../../_shared/figkit.js');

const left = [
  '5d: subl $0x4, %eax',
  '60: ja 0x9a',
  '66: leaq (%rip), %rcx',
  '    R_X86_64_PC32 .rodata-0x4',
  '6d: movslq (%rcx,%rax,4), %rax',
  '71: addq %rcx, %rax',
  '74: jmpq *%rax',
];
const right = [
  '0x534: cmp w8, #0x4',
  '0x538: b.hi 0x10000054c',
  '0x53c: adrp x9, 0x100000000',
  '0x540: add x9, x9, #0x7d0',
  '0x544: ldr w0, [x9, w8, UXTW #0x2]',
  '0x548: ret',
  '0x54c: mov w0, #0x0',
];

module.exports = figure('fig-4-5', {
  height: 322,
  title: "-O0 的跳转表与 -O1 的值表",
  desc: "两列对比。左侧为第 33 课夹具 ledger-x86_64-O0.o 的 grade：边界检查、带 .rodata 重定位的 leaq、缩放读取、加法，再经 rax 执行 jmpq；.rela.rodata 的五个重定位目标为 0x91、0x88、0x7f、0x76、0x76，因此图有八块十一边。右侧为 arm64 -O1 捕获中的 _grade：比较与 b.hi、构造 0x1000007d0 的 adrp 和 add，再用一次 ldr 返回五个值 1、2、3、4、4 中的一个；档案含三块两边，jump_tables 列表为空。",
}, f => {
  f.kicker(20, 18, "A · -O0 的 grade，x86-64 对象文件");
  f.kicker(336, 18, "B · -O1 的 _grade，arm64 可执行文件");
  f.rule(320, 8, 320, 314, { dash: 'dashed' });
  f.box({ x: 20, y: 28, w: 284, h: 40, hue: 'green', title: "第 33 课夹具 ledger-x86_64-O0.o", titleSize: 11.5, weight: 400 });
  f.box({ x: 336, y: 28, w: 284, h: 40, hue: 'green', title: "捕获 06-function-grade.json", titleSize: 11.5, weight: 400 });
  left.forEach((line, index) => f.text(20, 90 + index * 14, line, { size: 11 }));
  right.forEach((line, index) => f.text(336, 90 + index * 14, line, { size: 11 }));
  f.box({ x: 20, y: 200, w: 284, h: 50, hue: 'green', title: ".rela.rodata：五个重定位", sub: "目标 0x91 0x88 0x7f 0x76 0x76" });
  f.box({ x: 336, y: 200, w: 284, h: 50, hue: 'green', title: "0x1000007d0 的 __const", sub: "u32 值 1 2 3 4 4 · 文件偏移 2000" });
  f.box({ x: 20, y: 262, w: 284, h: 50, hue: 'violet', title: "jmpq *%rax 到达五个块", sub: "计入表后八块十一边" });
  f.box({ x: 336, y: 262, w: 284, h: 50, hue: 'violet', title: "ldr 返回一个值", sub: "三块 · 两边 · jump_tables []" });
});
