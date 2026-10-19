'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const rows = [
  ['EXTERNAL:0x1', '___stack_chk_fail', '', "外部 · libSystem.B.dylib", 'grey'],
  ['EXTERNAL:0x2', '_atoi', '', "外部 · libSystem.B.dylib", 'grey'],
  ['EXTERNAL:0x3', '_fwrite', '', "外部 · libSystem.B.dylib", 'grey'],
  ['EXTERNAL:0x4', '_printf', '', "外部 · libSystem.B.dylib", 'grey'],
  ['0x100000500', '_percent_change', '24 B', "函数体 0x500 至 0x517，ledger.c", 'green'],
  ['0x100000518', '_grade', '60 B', "函数体 0x518 至 0x553，ledger.c", 'green'],
  ['0x100000554', '_total', '52 B', "函数体 0x554 至 0x587，ledger.c", 'green'],
  ['0x100000588', '_grade_label', '72 B', "函数体 0x588 至 0x5cf，ledger.c", 'green'],
  ['0x1000005d0', 'entry', '368 B', "函数体 0x5d0 至 0x73f · LC_MAIN", 'green'],
  ['0x100000740', '___stack_chk_fail', '12 B', "__stubs 桩 → EXTERNAL:0x1", 'violet'],
  ['0x10000074c', '_atoi', '12 B', "__stubs 桩 → EXTERNAL:0x2", 'violet'],
  ['0x100000758', '_fwrite', '12 B', "__stubs 桩 → EXTERNAL:0x3", 'violet'],
  ['0x100000764', '_printf', '12 B', "__stubs 桩 → EXTERNAL:0x4", 'violet'],
];

module.exports = figure('fig-4-3', {
  height: 400,
  title: "ledger-arm64-O1 的十三个过程",
  desc: "按地址排序的十三行。libSystem 提供 EXTERNAL:0x1 至 0x4 四个外部函数。__text 内有五个内部函数：0x100000500 的 _percent_change，24 字节；0x100000518 的 _grade，60 字节；0x100000554 的 _total，52 字节；0x100000588 的 _grade_label，72 字节；0x1000005d0 的 entry，368 字节。__stubs 从 0x100000740 起有四个各 12 字节的 thunk，各解析到一个外部函数。内部函数体共 576 字节，等于 __text 大小。",
}, f => {
  f.kicker(20, 18, "地址");
  f.kicker(150, 18, "名称");
  f.kicker(330, 18, "函数体");
  f.kicker(410, 18, "分类");
  rows.forEach(([address, name, body, kind, hue], index) => {
    const y = 28 + index * 26;
    f.rect(20, y, 600, 26, { fill: color(`${hue}-fill`), stroke: color('panel-edge') });
    f.text(28, y + 17, address, { size: 11 });
    f.text(150, y + 17, name, { size: 11, weight: 700 });
    if (body) f.text(330, y + 17, body, { size: 11 });
    f.text(410, y + 17, kind, { size: 11, serif: true, hue: 'ink-soft' });
  });
  f.text(20, 390, "内部函数体 24 + 60 + 52 + 72 + 368 = 576 字节，等于 __text · stubs 4 × 12 = 48 字节", { size: 11, serif: true, hue: 'ink-soft' });
});
