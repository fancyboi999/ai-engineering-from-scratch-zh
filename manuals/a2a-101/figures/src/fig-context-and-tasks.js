'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const messages = [
  { kicker: "调用 1 · 审查 diff", y: 168, hue: 'violet', title: 'ROLE_USER · 14a03569', sub: "text 和 raw refunds.diff，不带 ID" },
  { y: 212, hue: 'blue', title: 'ROLE_AGENT · 46494a30', sub: "询问使用哪个基准分支" },
  { kicker: "调用 2 · 回答问题", y: 274, hue: 'violet', title: 'ROLE_USER · 096d3737 · main', sub: 'taskId e5c95b09, contextId 49c5a238' },
  { y: 318, hue: 'blue', title: 'ROLE_AGENT · 8f9ee658', sub: 'Comparing the diff against main' },
];

module.exports = figure('fig-context-and-tasks', {
  height: 452,
  title: "一个上下文，两个任务",
  desc: "树图根为上下文 49c5a238。第一个子节点是已完成审查任务 e5c95b09，历史包含两次 SendMessage 的四条消息：planner 的 diff 请求、agent 问题、带 taskId 和 contextId 的 planner 回答 main、agent 回复，之后是产物 review.json。第二个子节点为同上下文的后续任务，采集未到此处，因此用虚线绘制。其首条消息携带 contextId 49c5a238、referenceTaskIds 引用 e5c95b09，不带 taskId。",
}, f => {
  f.rect(190, 12, 260, 46, { fill: color('paper'), stroke: color('ink-mute') });
  f.text(320, 31, "上下文 49c5a238", { size: 12.5, weight: 700, anchor: 'middle' });
  f.text(320, 48, "code-reviewer 创建，对你不透明", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.path('M320 58 V78 H170 V96', { style: 'call', hue: 'ink-mute', head: false });
  const review = f.box({ x: 20, y: 96, w: 300, h: 50, hue: 'amber', double: true, title: "任务 e5c95b09 · 审查", sub: 'TASK_STATE_COMPLETED, status: 2 findings' });
  f.path(`M36 ${review.y + review.h} V399`, { style: 'call', hue: 'ink-mute', head: false });
  f.text(20, 444, "紫色：planner 发送。蓝色：code-reviewer 发送。ID 缩短至 8 个字符。", { size: 11, serif: true, hue: 'ink-soft' });

  messages.forEach((message, index) => {
    f.beat(index + 1);
    if (message.kicker) f.kicker(56, message.y - 8, message.kicker);
    f.box({ x: 56, y: message.y, w: 264, h: 38, hue: message.hue, title: message.title, titleSize: 12, sub: message.sub });
    f.path(`M36 ${message.y + 19} H55`, { style: 'call', hue: 'ink-mute', head: false });
  });

  f.beat(5);
  f.kicker(56, 374, '结果');
  f.box({ x: 56, y: 380, w: 264, h: 38, hue: 'green', title: "产物 review.json", titleSize: 12, sub: "一个 text part 和一个 data part" });
  f.path('M36 399 H55', { style: 'call', hue: 'ink-mute', head: false });

  f.beat(6);
  f.path('M320 78 H596 V96', { style: 'call', hue: 'ink-mute', dash: 'dashed', head: false });
  const follow = f.box({ x: 360, y: 96, w: 260, h: 50, hue: 'grey', dash: 'dashed', title: "后续任务", sub: "服务器创建 ID" });

  f.beat(7);
  f.kicker(376, 168, "其首条消息");
  f.path(`M596 ${follow.y + follow.h} V175`, { style: 'call', hue: 'ink-mute', dash: 'dashed', head: false });
  const first = f.box({ x: 376, y: 176, w: 244, h: 66, hue: 'violet', dash: 'dashed', title: "ROLE_USER · 新 messageId", titleSize: 12, sub: ['contextId 49c5a238', 'referenceTaskIds [e5c95b09]', "无 taskId"] });
  f.path(`M${first.x} ${first.y + 20} H340 V${review.cy} H${review.x + review.w + 1}`, { style: 'call', hue: 'violet' });
  f.text(376, 268, "现在携带 taskId e5c95b09 的消息", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(376, 284, "会失败：任务已到终态。", { size: 11, serif: true, hue: 'ink-soft' });
});
