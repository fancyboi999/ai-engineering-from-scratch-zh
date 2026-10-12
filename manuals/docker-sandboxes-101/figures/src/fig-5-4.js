'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 36, name: '用户，--exec', hue: 'grey' },
  { x: 196, name: 'root', hue: 'violet' },
  { x: 356, name: 'writer', hue: 'violet' },
  { x: 516, name: 'reviewer', hue: 'violet' },
];
const cx = index => lanes[index].x + 50;

const rows = [
  { y: 76, from: 0, to: 1, style: 'call', label: 'Ask the writer for one sentence', note: '消息1' },
  { y: 126, from: 1, to: 2, style: 'call', label: 'transfer_task', note: 'agent: writer, task, expected_output' },
  { y: 226, from: 2, to: 1, style: 'reply', label: 'MicroVMs are lightweight', note: '句子返回 root' },
  { y: 276, from: 1, to: 3, style: 'state', label: '{"agent": "reviewer"}', note: '会话移交 reviewer' },
  { y: 326, from: 3, to: 0, style: 'reply', label: 'APPROVED: MicroVMs are lightweight', note: '由 reviewer 回答' },
  { y: 376, from: 0, to: 3, style: 'call', label: 'Now hand the conversation to the reviewer.', note: '消息2' },
  { y: 426, from: 3, to: 0, style: 'reply', label: 'APPROVED: MicroVMs are lightweight', note: '不再询问 root' },
];

module.exports = figure('fig-5-4', {
  height: 456,
  title: '有返回的委派，再到持续移交',
  desc: '四生命线：--exec用户、team.yaml的root/writer/reviewer。消息1让root找writer写一句；transfer_task传agent/task/expected_output，writer子会话只含任务，返回MicroVMs are lightweight virtual machines作工具响应。root再移交reviewer，后者以APPROVED回答。消息2直接到reviewer，同样回答，不再询问root。',
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 100, h: 30, hue: lane.hue, title: lane.name, titleSize: 11.5 });
    f.lifeline(lane.x + 50, 40, 444);
  }
  rows.forEach((row, index) => {
    f.beat(index + 1);
    f.step(18, row.y, index + 1, { hue: row.style === 'state' ? 'amber' : undefined });
    const x1 = cx(row.from);
    const x2 = cx(row.to);
    f.arrow([x1, row.y], [x2 + (x2 > x1 ? -1 : 1), row.y], { style: row.style, label: row.label, note: row.note });
    if (index === 1) f.box({ x: 351, y: 150, w: 110, h: 46, hue: 'amber', title: '子会话', titleSize: 12, sub: ['仅任务'] });
  });
});
