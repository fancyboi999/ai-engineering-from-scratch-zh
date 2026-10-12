'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const rows = [
  ['id', '3d8f7801'],
  ['contextId', 'ac3830af'],
  ['status.state', 'TASK_STATE_COMPLETED'],
  ['status.message', '1 failed, 11 passed'],
  ['status.timestamp', '2026-10-06T09:00:00.750Z'],
  ['artifacts', "2 个产物"],
  ['history', "2 条消息"],
];

const parts = [
  ['text', 'collected 12 items'],
  ['raw', 'refunds.diff, base64'],
  ['url', 'screenshot.png'],
  ['data', '"passed": 11'],
];

module.exports = figure('fig-task-object-model', {
  height: 420,
  title: "一个任务的对象模型",
  desc: "虚线框标记上下文 ac3830af。框内以表格绘制阻塞运行的任务 3d8f7801，按运行填写顺序出现：id、contextId，随后两条 history 消息，带各自角色的 user 消息 21636369、agent 消息 10cc3c92，再是带名称及 part 数量的 test-log、summary 产物，最后 status.state 为 TASK_STATE_COMPLETED、status.message 为 1 failed, 11 passed、status.timestamp 为 2026-10-06T09:00:00.750Z。下方四个小块说明 part 恰好包含 text、raw、url、data 之一，各有一个示例。",
}, f => {
  const row = index => {
    const [field, value] = rows[index];
    const y = 68 + index * 28;
    f.rect(26, y, 310, 28, { fill: color('paper'), stroke: color('panel-edge') });
    f.text(38, y + 18, field, { size: 11.5, hue: 'ink-soft' });
    f.text(160, y + 18, value, { size: 11.5 });
  };
  const link = { style: 'call', hue: 'ink-mute', head: false };

  f.box({ x: 26, y: 40, w: 310, h: 28, hue: 'amber', title: 'Task', align: 'left', titleSize: 12 });
  f.kicker(20, 324, "每条消息和每个产物都包含 part");
  parts.forEach(([title, sub], index) => f.box({ x: 20 + index * 152, y: 332, w: 144, h: 46, hue: 'green', title, sub, titleSize: 12, pad: 8 }));
  f.text(20, 400, "每个 part 恰好包含这四种内容之一，还可有 mediaType、filename、metadata。", { size: 11, serif: true, hue: 'ink-soft' });

  f.beat(1);
  f.rect(14, 8, 612, 290, { fill: 'none', stroke: color('ink-mute'), dash: 'dashed' });
  f.text(26, 28, "上下文 ac3830af", { size: 12, weight: 700 });
  f.text(158, 28, "归组相关任务和消息，本次运行创建一个任务", { size: 11, serif: true, hue: 'ink-soft' });
  row(0);
  row(1);

  f.beat(2);
  row(6);
  f.box({ x: 360, y: 166, w: 256, h: 52, hue: 'violet', title: 'messageId: 21636369', sub: ['role: ROLE_USER', "parts：1 个 text part"], titleSize: 12, align: 'left' });
  f.path('M336 250 H352 V192 H360', link);

  f.beat(3);
  f.box({ x: 360, y: 224, w: 256, h: 52, hue: 'blue', title: 'messageId: 10cc3c92', sub: ['role: ROLE_AGENT', "parts：1 个 text part"], titleSize: 12, align: 'left' });
  f.path('M352 250 H360', link);

  f.beat(4);
  row(5);
  f.box({ x: 360, y: 40, w: 256, h: 52, hue: 'green', title: 'artifactId: test-log', sub: ['name: test-log.txt', "parts：5 个 text part"], titleSize: 12, align: 'left' });
  f.box({ x: 360, y: 98, w: 256, h: 52, hue: 'green', title: 'artifactId: summary', sub: ['name: summary.json', "parts：1 个 data part"], titleSize: 12, align: 'left' });
  f.path('M336 222 H346 V66 H360', link);
  f.path('M346 124 H360', link);

  f.beat(5);
  row(2);
  row(3);
  row(4);
});
