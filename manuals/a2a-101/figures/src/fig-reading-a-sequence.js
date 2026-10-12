'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 70, w: 96, hue: 'violet', title: 'planner', sub: "客户端 agent" },
  { x: 250, w: 112, hue: 'blue', title: 'test-runner', sub: "远程 agent" },
  { x: 416, w: 100, hue: 'teal', title: "任务存储", sub: "test-runner 内部", pad: 8 },
  { x: 514, w: 84, hue: 'indigo', title: 'webhook', sub: '/a2a-events', pad: 8 },
  { x: 600, w: 72, hue: 'grey', title: '操作员', sub: "人", pad: 7 },
];

const rows = [
  [0, 1, 'call', 'SendMessage', "请求 · 墨色实线", 160],
  [1, 2, 'write', "任务已保存", "写入 · 青色实线", 333],
  [1, 2, 'state', 'TASK_STATE_WORKING', "状态变化 · 琥珀色虚线", 333],
  [1, 0, 'event', 'statusUpdate', "流帧 · 靛蓝色点线", 160],
  [1, 3, 'event', "推送 POST", "推送 · 靛蓝色点线", 333],
  [0, 4, 'effect', "请求批准", "A2A 之外 · 橄榄色虚线", 160],
  [1, 0, 'fail', 'TaskNotFoundError', "错误 · 玫红色虚线", 160],
  [1, 0, 'reply', "SendMessage 结果", "回复 · 墨色虚线", 160],
];

module.exports = figure('fig-reading-a-sequence', {
  height: 440,
  title: "如何阅读本手册时序图",
  desc: "五条生命线：planner、test-runner、test-runner 的任务存储、/a2a-events 的 webhook 接收器、操作员。八个编号行各展示一种箭头样式：SendMessage 为墨色实线调用，任务保存为青色实线写入，TASK_STATE_WORKING 为琥珀色虚线状态变化，statusUpdate 流帧和推送 POST 为靛蓝色点线事件，planner 向操作员请求批准为 A2A 之外的橄榄色虚线效果，TaskNotFoundError 为玫红色虚线失败，SendMessage 结果为墨色虚线回复。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 8, w: lane.w, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 12, anchor: 'middle', pad: lane.pad });
    f.lifeline(lane.x, 48, 432);
  }
  rows.forEach(([from, to, style, label, note, labelX], index) => {
    const y = 84 + index * 46;
    f.beat(index + 1);
    f.step(24, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX });
  });
});
