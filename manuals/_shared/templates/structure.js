'use strict';

const { figure, color } = require('../figkit.js');

const rows = [
  ['id', '22', '所有记录共用 ID 空间'],
  ['kind', '"tool"', null],
  ['status', '"running"', 'pending, running, waiting, done'],
  ['checkpoint', '{ phase: "execute" }', '重启后的恢复位置'],
  ['owner', 'conversation 1', null],
  ['updated', 'seq 27', '写入此行的提交'],
];

module.exports = figure('tpl-structure', {
  height: 226,
  title: '一条已存记录的组成',
  desc: '任务记录用六行表格展示 id、kind、status、checkpoint、owner 和 updated。右侧说明其中四个字段的用途，包括记录标识、状态、恢复位置和写入该行的提交序号。',
}, f => {
  f.kicker(20, 18, '一条已存记录');
  f.kicker(380, 18, '字段用途');
  f.box({ x: 20, y: 26, w: 330, h: 28, hue: 'amber', title: 'task 22', align: 'left' });
  rows.forEach(([field, value, note], index) => {
    const y = 54 + index * 28;
    f.rect(20, y, 330, 28, { fill: color('paper'), stroke: color('panel-edge') });
    f.text(32, y + 18, field, { size: 12, hue: 'ink-soft' });
    f.text(150, y + 18, value, { size: 12 });
    if (note) {
      f.rule(350, y + 14, 372, y + 14, { hue: 'amber' });
      f.text(380, y + 18, note, { size: 11, serif: true, hue: 'ink-soft' });
    }
  });
});
