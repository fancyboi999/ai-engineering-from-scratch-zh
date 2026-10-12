'use strict';

const { figure } = require('../figkit.js');

const lanes = [{ x: 118, name: '客户端', hue: 'violet' }, { x: 262, name: '服务器', hue: 'blue' }, { x: 406, name: '存储', hue: 'teal' }, { x: 556, name: '执行者', hue: 'olive' }];
const rows = [
  [0, 1, 'call', 'request()', '调用 · 墨色实线'],
  [1, 2, 'write', '写入 2', '持久写入 · 青色实线'],
  [1, 2, 'state', '任务 9 running', '状态变化 · 琥珀虚线'],
  [1, 3, 'model', 'generate', '模型或计算 · 梅紫实线'],
  [1, 3, 'effect', 'execute()', '外部副作用 · 橄榄虚线'],
  [1, 0, 'event', '事件帧', '流或事件 · 靛蓝点线'],
  [1, 3, 'fail', 'abort', '失败 · 玫红虚线'],
  [1, 0, 'reply', 'done', '回复 · 墨色虚线'],
];

module.exports = figure('tpl-sequence', {
  height: 430,
  title: '阅读时序图',
  desc: '客户端、服务器、存储与执行者各有一条生命线。八次编号交互依次展示调用、持久写入、状态变化、模型调用、外部副作用、事件、失败与回复的箭头样式。',
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 112, h: 30, hue: lane.hue, title: lane.name, titleSize: 12, anchor: 'middle' });
    f.lifeline(lane.x, 40, 418);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 76 + index * 44;
    f.step(24, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX: (x1 + x2) / 2 });
  });
});
