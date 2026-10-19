'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const source = [
  "你编写 · ledger.c",
  'int percent_change(',
  '  int before, int after) {',
  '  if (before == 0)',
  '    return 0;',
  '  return (after - before)',
  '    * 100 / before;',
  '}',
];
const listing = [
  "clang -O1 生成 · 24 字节",
  '500  cbz w0, 0x100000514',
  '504  sub w8, w1, w0',
  '508  mov w9, #0x64',
  '50c  mul w8, w8, w9',
  '510  sdiv w0, w8, w0',
  '514  ret',
];
const pseudocode = [
  "Ghidra 反编译",
  'ulong _percent_change(',
  '  ulong param_1,int param_2)',
  'iVar2 = (int)param_1;',
  'if (iVar2 != 0) {',
  '  uVar1 = 0;',
  '  if (iVar2 != 0) {',
  '  uVar1 = ((param_2 - iVar2)',
  '    * 100) / iVar2;',
  '  param_1 = (ulong)uVar1;',
  'return param_1;',
];

const column = (f, x, w, hue, lines) => {
  const h = lines.length * 15 + 14;
  f.rect(x, 166, w, h, { fill: color('paper'), stroke: color(`${hue}-ink`) });
  lines.forEach((line, index) => f.text(x + 6, 184 + index * 15, line, { size: 11, hue: index === 0 ? 'ink-soft' : undefined }));
  return 166 + h;
};

module.exports = figure('plate-rea-investigation', {
  height: 472,
  title: "一个函数，四个视角",
  desc: "使用 Ghidra provider 对 ledger-arm64-O1 的 _percent_change 运行 rea function 的记录。顶部，你调用 rea 6.7.0，将问题交给已绑定 ghidra 的 BinarySession；会话通过 bridge.sock 调用 GhidraClient，后者启动无界面 Ghidra 12.1.4 JVM，导入分析 33872 字节的 mach-o arm64 可执行文件 ledger-arm64-O1。三列展示同一函数：你在 ledger.c 写的 C；clang -O1 生成的六条指令，从 0x100000500 的 cbz w0 到 0x100000514 的 ret；Ghidra 反编译伪代码，含源码没有的第二次零值检查。底部 Evidence ev_b492c85e 标明操作 analyze_function、provider ghidra 12.1.4、配置摘要、confidence observed、静态读取的权威来源、十条限制、对象 sha256。",
}, f => {
  f.kicker(20, 18, "四个视角");
  f.text(620, 18, 'rea function ledger-arm64-O1 _percent_change --provider ghidra', { size: 11, anchor: 'end', hue: 'ink-soft' });

  const you = f.box({ x: 20, y: 30, w: 70, h: 40, hue: 'grey', title: "你", sub: 'ledger.c', titleSize: 11.5, pad: 6 });
  const rea = f.box({ x: 150, y: 30, w: 100, h: 40, hue: 'blue', title: 'rea 6.7.0', sub: "CLI", titleSize: 11.5 });
  const session = f.box({ x: 310, y: 30, w: 115, h: 40, hue: 'blue', title: 'BinarySession', sub: "已绑定 ghidra", titleSize: 11.5, pad: 8 });
  const client = f.box({ x: 500, y: 30, w: 120, h: 40, hue: 'violet', title: 'GhidraClient', sub: 'bridge.sock', titleSize: 11.5, pad: 8 });
  f.arrow(you.right(), [rea.x - 1, you.cy], { style: 'call', label: 'function' });
  f.arrow(rea.right(), [session.x - 1, rea.cy], { style: 'call', label: '执行' });
  f.arrow(session.right(), [client.x - 1, session.cy], { style: 'call', label: '调用' });

  const jvm = f.box({ x: 500, y: 92, w: 120, h: 44, hue: 'violet', title: 'Ghidra 12.1.4', sub: "导入、分析", titleSize: 11.5, pad: 8 });
  f.arrow(client.bottom(), [client.cx, jvm.y - 1], { style: 'effect', label: '启动' });
  const art = f.box({ x: 220, y: 92, w: 185, h: 44, hue: 'green', title: 'ledger-arm64-O1', sub: "mach-o arm64，33872 字节", titleSize: 11.5, pad: 8 });
  f.arrow(session.bottom(), [session.cx, art.y - 1], { style: 'call', label: "读取、计算 hash" });

  f.arrow(you.bottom(), [you.cx, 165], { style: 'call', label: "编写" });
  f.arrow(jvm.bottom(), [jvm.cx, 165], { style: 'reply', label: '反编译' });
  column(f, 20, 190, 'green', source);
  column(f, 220, 185, 'green', listing);
  const bottom = column(f, 415, 205, 'violet', pseudocode);

  f.arrow([517, bottom], [517, 365], { style: 'write', label: "记录" });
  f.box({
    x: 20, y: 366, w: 600, h: 92, hue: 'teal', titleSize: 12,
    title: "_percent_change 的 Evidence ev_b492c85e",
    sub: [
      "操作 analyze_function · provider ghidra 12.1.4",
      "confidence observed · 十条限制",
      "对象 ledger-arm64-O1 · mach-o arm64",
    ],
  });
});
