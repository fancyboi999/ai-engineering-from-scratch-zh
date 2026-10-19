'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const entry = [
  '0x100000518: mov w8, #0x6667',
  '0x10000051c: movk w8, #0x6666, LSL #16',
  '0x100000520: smull x8, w0, w8',
  '0x100000524: lsr x9, x8, #0x3f',
  '0x100000528: asr x8, x8, #0x22',
  '0x10000052c: add w8, w8, w9',
  '0x100000530: sub w8, w8, #0x6',
  '0x100000534: cmp w8, #0x4',
  '0x100000538: b.hi 0x10000054c',
];
const table = [
  '0x10000053c: adrp x9, 0x100000000',
  '0x100000540: add x9, x9, #0x7d0',
  '0x100000544: ldr w0, [x9, w8, UXTW #0x2]',
  '0x100000548: ret',
];
const fallback = [
  '0x10000054c: mov w0, #0x0',
  '0x100000550: ret',
];

module.exports = figure('fig-4-4', {
  height: 350,
  title: "_grade 的三个基本块",
  desc: "来自 basic_blocks 侧面的三块控制流图。入口块 0x100000518 至 0x10000053c 含九条指令：常量 0x66666667、有符号乘法和移位实现除十、减 6、与 4 比较后 b.hi。一条后继是 0x10000053c 的查表块，构造 0x1000007d0 地址，读取一个 32 位字并返回；另一条是 0x10000054c 的默认块，返回零。两个叶块均无后继。",
}, f => {
  const block = (x, y, w, lines, kicker) => {
    f.rect(x, y, w, lines.length * 14 + 34, { fill: color('paper'), stroke: color('violet-ink') });
    f.kicker(x + 12, y + 16, kicker);
    lines.forEach((line, index) => f.text(x + 12, y + 32 + index * 14, line, { size: 11 }));
  };
  block(120, 20, 400, entry, "基本块 0x100000518 至 0x10000053c");
  f.arrow([170, 180], [170, 239], { style: 'call', label: "b.hi 不跳转", note: "索引 0 至 4", packet: false });
  f.arrow([470, 180], [470, 239], { style: 'call', label: "b.hi 跳转", note: "索引大于 4", packet: false });
  block(20, 240, 300, table, "块 0x10000053c · 查表");
  block(340, 240, 280, fallback, "块 0x10000054c · 默认");
  f.text(20, 342, "basic_blocks 的后继：0x518 → 0x53c 与 0x54c · 0x53c → 无 · 0x54c → 无", { size: 11, serif: true, hue: 'ink-soft' });
});
