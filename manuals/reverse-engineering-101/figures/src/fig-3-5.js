'use strict';

const { figure } = require('../../../_shared/figkit.js');

const left = [
  '__TEXT 0x100000000 · 1280 B',
  '__text 0x100000500 · 576 B',
  '__stubs 0x100000740 · 48 B',
  '__cstring 0x100000770 · 96 B',
  '__const 0x1000007d0 · 64 B',
  '__unwind_info 0x100000810 · 14320 B',
  '__got 0x100004000 · 48 B',
  '__const 0x100004030 · 40 B',
  '__DATA_CONST 0x100004058 · 16296 B',
  '__LINKEDIT 0x100008000 · 1104 B',
  '__LINKEDIT 0x100008450 · 15280 B',
  'EXTERNAL 0x10000c000 · 512 B',
];
const right = [
  '.text 0x100000 · 159 B',
  '.rodata 0x1000a0 · 80 B',
  '.rodata.str1.1 0x1000f0 · 10 B',
  '.comment:0x0 · 47 B',
  '.rela.rodata:0x0 · 120 B',
  '.rela.text:0x0 · 72 B',
  '.strtab:0x0 · 190 B',
  '.symtab:0x0 · 312 B',
  '_elfHeader:0x0 · 64 B',
  '_elfSectionHeaders:0x0 · 704 B',
];

module.exports = figure('fig-3-5', {
  height: 346,
  title: "并排比较两份概览",
  desc: "两列。左侧为 arm64 Mach-O 可执行文件：Ghidra 文档 target-01b5d08b08fb.bin，有 12 内存块、13 过程、39 字符串，列出从 0x100000000 的 __TEXT 到 0x10000c000 的 EXTERNAL 的全部块。右侧为 x86-64 ELF 可重定位目标：文档 target-9a4a8082ba5e.o，有 10 块、4 过程、20 字符串，从 0x100000 的 .text 到独立地址空间中的 _elfSectionHeaders。两记录均来自 rea-workflow provider，置信度 derived。",
}, f => {
  f.kicker(20, 18, 'A · ledger-arm64-O1 · mach-o arm64');
  f.kicker(336, 18, 'B · ledger-x86_64-O1.o · elf x86_64');
  f.rule(320, 8, 320, 338, { dash: 'dashed' });
  f.box({ x: 20, y: 28, w: 284, h: 46, hue: 'green', title: 'target-01b5d08b08fb.bin', sub: "12 段 · 13 过程 · 39 字符串" });
  f.box({ x: 336, y: 28, w: 284, h: 46, hue: 'green', title: 'target-9a4a8082ba5e.o', sub: "10 段 · 4 过程 · 20 字符串" });
  left.forEach((line, index) => f.text(20, 100 + index * 16, line, { size: 11 }));
  right.forEach((line, index) => f.text(336, 100 + index * 16, line, { size: 11 }));
  f.box({ x: 20, y: 296, w: 284, h: 40, hue: 'violet', title: "rea-workflow · 置信度 derived", titleSize: 12 });
  f.box({ x: 336, y: 296, w: 284, h: 40, hue: 'violet', title: "rea-workflow · 置信度 derived", titleSize: 12 });
});
