'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const columns = [
  { x: 160, name: 'planner', sub: "首条消息", hue: 'violet' },
  { x: 256, name: 'code-reviewer', sub: "它的问题", hue: 'blue' },
  { x: 352, name: 'planner', sub: "回答", hue: 'violet' },
];
const width = 96;
const rows = [
  ['messageId', true, ['14a03569', '46494a30', '096d3737'], ["发送者生成", "每条消息各一个"]],
  ['contextId', false, [null, '49c5a238', '49c5a238'], ["服务器生成，", "客户端回传"]],
  ['taskId', false, [null, 'e5c95b09', 'e5c95b09'], ["服务器生成，", "回传以继续任务"]],
  ['role', true, ['ROLE_USER', 'ROLE_AGENT', 'ROLE_USER'], ["方向：", "客户端到服务器为 USER"]],
  ['parts', true, ['text, raw', 'text', 'text "main"'], ["发送者，至少", "一个 part"]],
];
const optional = [
  ['metadata', "发送者：JSON 对象"],
  ['extensions', "发送者：扩展 URI"],
  ['referenceTaskIds', "发送者：相关任务"],
];
const ROW = 34;
const TOP = 48;

module.exports = figure('fig-message-fields', {
  height: 384,
  title: "消息各字段由谁设置",
  desc: "表格展示 06-input-required.http 审查三条消息的八个 Message 字段，按发送顺序逐列出现。planner 首条消息 14a03569 没有 contextId 和 taskId。code-reviewer 问题 46494a30 带 contextId 49c5a238、taskId e5c95b09。planner 回答 096d3737 回传两个 ID。角色为 ROLE_USER、ROLE_AGENT、ROLE_USER。三条均未设置 metadata、extensions、referenceTaskIds。右列说明谁设置各字段，最后注释说明服务器将两个 ID 写入保存的首条消息副本。",
}, f => {
  f.kicker(28, 34, '字段');
  f.kicker(452, 34, "设置者");
  let y = TOP;
  for (const [field, required, , who] of rows) {
    f.rect(20, y, 600, ROW, { fill: color('paper'), stroke: color('panel-edge') });
    if (required) f.dot(30, y + 17, { r: 3, hue: 'blue' });
    f.text(40, y + 21, field, { size: 12, weight: required ? 700 : undefined });
    who.forEach((line, index) => f.text(452, y + 14 + index * 14, line, { size: 11, serif: true, hue: 'ink-soft' }));
    y += ROW;
  }
  const requiredEnd = y;
  for (const [field, who] of optional) {
    f.rect(20, y, 600, 28, { fill: color('paper'), stroke: color('ink-mute'), dash: 'dashed' });
    f.text(40, y + 18, field, { size: 12, hue: 'ink-mute' });
    f.text(304, y + 18, "套件采集均未设置", { size: 11, serif: true, hue: 'ink-mute', anchor: 'middle' });
    f.text(452, y + 18, who, { size: 11, serif: true, hue: 'ink-soft' });
    y += 28;
  }
  for (const column of columns) f.rule(column.x, TOP, column.x, requiredEnd, { hue: 'panel-edge' });
  f.rule(448, TOP, 448, requiredEnd, { hue: 'panel-edge' });
  const noteY = y + 14;
  f.dot(30, noteY + 48, { r: 3, hue: 'blue' });
  f.text(40, noteY + 52, "proto Message 中为 REQUIRED", { size: 11, serif: true, hue: 'ink-soft' });

  columns.forEach((column, columnIndex) => {
    f.beat(columnIndex + 1);
    f.rect(column.x, 10, width, 38, { hue: column.hue });
    f.text(column.x + width / 2, 27, column.name, { size: 11.5, weight: 700, anchor: 'middle' });
    f.text(column.x + width / 2, 42, column.sub, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
    const cx = column.x + width / 2;
    rows.forEach(([, , values], rowIndex) => {
      const value = values[columnIndex];
      const ty = TOP + rowIndex * ROW + 21;
      if (value === null) f.text(cx, ty, '省略', { size: 11, serif: true, hue: 'ink-mute', anchor: 'middle' });
      else f.text(cx, ty, value, { size: 11, anchor: 'middle' });
    });
  });

  f.beat(4);
  f.text(20, noteY + 12, "服务器将 contextId 49c5a238 和 taskId e5c95b09 写入其保存的", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, noteY + 27, "首条消息副本，planner 发送原消息时没有这两个字段。", { size: 11, serif: true, hue: 'ink-soft' });
});
