'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const source = [
  'int percent_change(int before, int after) {',
  '    if (before == 0) return 0;',
  '    return (after - before) * 100 / before;',
  '}',
];
const pseudo = [
  'ulong _percent_change(ulong param_1,int param_2)',
  '{',
  '  uint uVar1;',
  '  int iVar2;',
  '  iVar2 = (int)param_1;',
  '  if (iVar2 != 0) {',
  '    uVar1 = 0;',
  '    if (iVar2 != 0) {',
  '      uVar1 = ((param_2 - iVar2) * 100) / iVar2;',
  '    }',
  '    param_1 = (ulong)uVar1;',
  '  }',
  '  return param_1;',
  '}',
];

module.exports = figure('fig-4-9', {
  height: 356,
  title: "percent_change 的源代码与反编译结果",
  desc: "上下两块。上方是 ledger.c 中四行 percent_change C 源码，下方是 analyze_function 记录中十四行 Ghidra _percent_change 伪代码。玫红标记三行：ABI 返回四字节，返回类型却是 ulong；第二次测试已测试过的 iVar2；返回整个 param_1 寄存器，而源代码返回 int。",
}, f => {
  f.kicker(20, 18, "ledger.c · 原始编写内容");
  f.rect(20, 26, 600, 72, { fill: color('green-fill'), stroke: color('green-ink') });
  source.forEach((line, index) => f.text(32, 44 + index * 14, line, { size: 11 }));
  f.kicker(20, 122, "Ghidra 12.1.4 伪代码 · _percent_change");
  f.rect(20, 130, 600, 216, { fill: color('paper'), stroke: color('violet-ink') });
  pseudo.forEach((line, index) => f.text(32, 148 + index * 14, line, { size: 11 }));
  const mark = (lineIndex, text) => {
    const y = 148 + lineIndex * 14;
    f.rule(360, y - 4, 384, y - 4, { hue: 'rose' });
    f.text(392, y, text, { size: 11, serif: true, hue: 'rose' });
  };
  mark(0, "返回 ulong，ABI 却是 4 字节");
  mark(7, "对已测试值做第二次测试");
  mark(12, "返回 param_1，源码返回 int");
});
