'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-3', {
  height: 456,
  title: "ledger-arm64-O1 的加载映像",
  desc: "四条 LC_SEGMENT_64 按地址从低到高排列。0x0 的 __PAGEZERO 跨 4 GiB，不含文件字节。0x100000000 的 __TEXT 映射文件字节 0 到 16384，含 __text、__stubs、__cstring、__const、__unwind_info，LC_MAIN 指向内部 entryoff 1488。0x100004000 的 __DATA_CONST 映射 16384 到 32768，含 __got、__const。0x100008000 的 __LINKEDIT 映射 32768 到 33872，含链式修正、导出 trie、函数入口、符号表、字符串表及代码签名。",
}, f => {
  f.kicker(20, 18, 'address');
  f.kicker(140, 18, "段与节");
  f.kicker(540, 18, "文件偏移");
  const rows = [
    { y: 30, h: 44, addr: '0x0', file: 'none', hue: 'grey', dash: 'dashed', title: "__PAGEZERO · 预留 4 GiB", sub: ['vmsize 4294967296 · filesize 0 · prot 0'] },
    { y: 86, h: 138, addr: '0x100000000', file: "0 到 16384", hue: 'green', title: '__TEXT · r-x', sub: ['__text 0x100000500 · 576 B · file 1280', '__stubs 0x100000740 · 48 B · file 1856', '__cstring 0x100000770 · 95 B · file 1904', '__const 0x1000007d0 · 64 B · file 2000', '__unwind_info 0x100000810 · 96 B · file 2064', "LC_MAIN entryoff 1488 · 入口 0x1000005d0"] },
    { y: 236, h: 76, addr: '0x100004000', file: "16384 到 32768", hue: 'green', title: '__DATA_CONST · rw-', sub: ['__got 0x100004000 · 48 B · file 16384', '__const 0x100004030 · 40 B · file 16432'] },
    { y: 324, h: 122, addr: '0x100008000', file: "32768 到 33872", hue: 'green', title: "__LINKEDIT · r-- · 无节", sub: ["链式修正，文件 32768 · 176 B", "导出 trie，文件 32944 · 104 B", "函数入口，文件 33048 · 8 B", "symtab 文件 33056 · 13 符号 · strtab 文件 33304", "代码签名，文件 33456 · 416 B"] },
  ];
  for (const row of rows) {
    f.text(20, row.y + 16, row.addr, { size: 11 });
    f.box({ x: 140, y: row.y, w: 380, h: row.h, hue: row.hue, dash: row.dash, title: row.title, sub: row.sub, align: 'left' });
    f.text(540, row.y + 16, row.file, { size: 11, serif: true, hue: 'ink-soft' });
  }
});
