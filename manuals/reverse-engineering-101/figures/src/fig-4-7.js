'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const rows = [
  ["头部加载命令", '0x100000404, 0x100000490', '2', '/usr/lib/dyld', false],
  ['__TEXT,__cstring', "0x100000770 至 0x1000007cf", '10', 'score %d grade %s', true],
  ["Chained fixups 导入", "0x100008069 至 0x1000080a7", '6', '___stack_chk_fail', false],
  ["导出 trie 边", "0x1000080b2 至 0x100008111", '7', '_label', false],
  ["LC_SYMTAB 字符串表", "0x10000821a 至 0x1000082a5", '13', '_grade_label', false],
  ["代码签名", '0x10000831c', '1', 'ledger-arm64-O1', false],
];

module.exports = figure('fig-4-7', {
  height: 276,
  title: "按加载命令分类的 ledger-arm64-O1 共 39 个字符串",
  desc: "六行按地址排序。头部两个加载命令字符串为 dyld 和 libSystem 路径。__TEXT,__cstring 从 0x100000770 起有十个字符串，包括标签、格式串和一个空填充。Chained fixups 从 0x100008069 起有六个导入名；exports trie 从 0x1000080b2 起有七个边标签；LC_SYMTAB 字符串表从 0x10000821a 起有十三个名称；0x10000831c 有一个代码签名标识 ledger-arm64-O1。总计 39，等于 overview 的 string_count。",
}, f => {
  f.kicker(20, 18, "位置");
  f.kicker(250, 18, "地址");
  f.kicker(450, 18, "数量");
  f.kicker(500, 18, "示例");
  rows.forEach(([where, addresses, count, example, program], index) => {
    const y = 28 + index * 34;
    f.rect(20, y, 600, 34, { fill: program ? color('green-fill') : color('paper'), stroke: color('green-ink') });
    f.text(28, y + 21, where, { size: 11, weight: 700 });
    f.text(250, y + 21, addresses, { size: 11 });
    f.text(450, y + 21, count, { size: 11 });
    f.text(500, y + 21, example, { size: 11, serif: true, hue: 'ink-soft' });
  });
  f.text(20, 262, "string_count 39 · 各项 encoding 均 US-ASCII · 10 个程序字符串、29 个名称与路径", { size: 11, serif: true, hue: 'ink-soft' });
});
