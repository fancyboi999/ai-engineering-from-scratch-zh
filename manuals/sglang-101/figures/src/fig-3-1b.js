'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-1b', {
  height: 300,
  title: "请求行指向同一个槽位池",
  desc: "ReqToTokenPool 的请求 A、B 两行各列 KV 槽位索引。两行都以共享 system prompt 的槽 1 至 4 开头，再指向各自问题的槽。下方 KV 池条带显示槽 1 至 4 只存一份，由两行共享；空闲列表分配新槽位。",
}, f => {
  f.kicker(20, 20, "ReqToTokenPool 行");
  const rows = [
    { y: 34, name: "请求 A", cells: ['1', '2', '3', '4', '5', '6'] },
    { y: 80, name: "请求 B", cells: ['1', '2', '3', '4', '7', '8'] },
  ];
  for (const row of rows) {
    f.text(20, row.y + 22, row.name, { size: 12 });
    row.cells.forEach((cell, index) => {
      const shared = index < 4;
      f.box({ x: 120 + index * 52, y: row.y, w: 46, h: 34, hue: shared ? 'green' : 'blue', title: cell, titleSize: 12 });
    });
  }
  f.text(440, 56, "单元格保存槽位索引", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(440, 102, "位置 0 至 5", { size: 11, serif: true, hue: 'ink-soft' });
  f.kicker(20, 150, "KV 池槽位");
  const slots = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  slots.forEach((slot, index) => {
    const x = 20 + index * 60;
    const shared = index >= 1 && index <= 4;
    const used = index >= 5 && index <= 8;
    const hue = index === 0 ? 'grey' : shared ? 'green' : used ? 'blue' : 'grey';
    f.box({ x, y: 160, w: 54, h: 40, hue, dash: index === 0 || index === 9 ? 'dashed' : undefined, title: slot, titleSize: 12 });
  });
  f.text(20, 222, "槽 0：填充，永不分配", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 242, "槽 1 至 4：共享 system prompt，存一份，两行共读", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 262, "槽 5 至 8：各请求自己的问题 token", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 282, "槽 9：位于 TokenToKVPoolAllocator 空闲表", { size: 11, serif: true, hue: 'ink-soft' });
});
