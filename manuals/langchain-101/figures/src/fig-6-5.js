'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  [['暂停'], ['一次中断', '含全部调用的 action_requests', 'blue'], ['每个调用一次中断', 'type tool_approval，带 schema', 'blue']],
  [['恢复'], ['一个决定列表', '按调用顺序排列', 'blue'], ['id 到决定的映射', '由 response_schema 校验', 'blue']],
  [['编辑成', '另一个工具'], ['delete_file 已运行', 'B3，3 次运行全部如此', 'rose'], ['ValidationError', 'P3，没有工具运行，3 次全部', 'blue']],
  [['中间件', '跳到工具'], ['工具仍然运行', 'J1、J2、J3，3 次运行全部如此', 'rose'], ['审批生效', 'J4、J5，没有工具运行', 'blue']],
];

module.exports = figure('fig-6-5', {
  height: 318,
  title: '批量模式与逐个调用模式',
  desc: '一张四行两列的表，左列是批量模式，右列是逐个调用模式。暂停：一次中断带有全部调用的 action_requests，对比每个调用一次中断，类型为 tool_approval 并带 schema。恢复：按调用顺序排列的决定列表，对比由 response_schema 校验的、从中断 id 到决定的映射。编辑成另一个工具：批量情形 B3 中 delete_file 在 3 次运行中全部运行，逐个调用情形 P3 中出现 ValidationError，没有任何工具运行。跳到工具的中间件：批量情形 J1 至 J3 中工具照常运行，逐个调用情形 J4 和 J5 中审批生效。',
}, f => {
  f.kicker(188, 20, '批量');
  f.kicker(408, 20, '逐个调用');
  rows.forEach(([label, left, right], i) => {
    const y = 34 + i * 70;
    label.forEach((line, k) => f.text(20, y + 22 + k * 15 - (label.length - 1) * 7, line, { size: 11.5, weight: 700, max: 160 }));
    f.box({ x: 188, y, w: 208, h: 50, hue: left[2], title: left[0], sub: left[1], align: 'left', titleSize: 12 });
    f.box({ x: 408, y, w: 212, h: 50, hue: right[2], title: right[0], sub: right[1], align: 'left', titleSize: 12 });
  });
  f.text(20, 312, '第 1、2 行来自录制工具包。第 3、4 行是 x86 服务器虚拟机上的实验记录运行。', { size: 11, serif: true, hue: 'ink-soft' });
});
