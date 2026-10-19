'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-4', {
  height: 230,
  title: "从 0x100000518 到文件偏移 1304",
  desc: "三行。__TEXT 段的 vmaddr 为 0x100000000，fileoff 为 0，因此 address 减 vmaddr 加 fileoff 为 0x518，即 1304。__text 节的 address 为 0x100000500，file_offset 为 1280，因此 1280 加 24 为 1304。rea 工具 address_to_file_offset 向 Ghidra 查询唯一来源映射，返回 file_offset 1304；该处字节 e8 cc 8c 52 编码 mov w8, #0x6667。",
}, f => {
  f.kicker(20, 18, "文件提供的事实");
  f.kicker(340, 18, "偏移");
  const rows = [
    [{ hue: 'green', title: "__TEXT 段", sub: 'vmaddr 0x100000000 · fileoff 0' }, { hue: 'grey', title: 'address - vmaddr + fileoff', sub: '0x100000518 - 0x100000000 + 0 = 0x518' }],
    [{ hue: 'green', title: "__text 节", sub: 'address 0x100000500 · file_offset 1280' }, { hue: 'grey', title: 'file_offset + (address - addr)', sub: '1280 + (0x518 - 0x500) = 1280 + 24' }],
    [{ hue: 'violet', title: 'address_to_file_offset', sub: "Ghidra 来源映射，恰好一个" }, { hue: 'teal', title: 'file_offset 1304', sub: "字节 e8 cc 8c 52 · mov w8, #0x6667" }],
  ];
  rows.forEach(([left, right], index) => {
    const y = 30 + index * 68;
    const a = f.box({ x: 20, y, w: 280, h: 50, ...left });
    const b = f.box({ x: 340, y, w: 280, h: 50, ...right });
    f.arrow(a.right(), [b.x - 1, a.cy], { style: index === 2 ? 'reply' : 'call', packet: false });
    if (index < 2) f.arrow([480, y + 50], [480, y + 67], { style: 'call', packet: false });
  });
});
