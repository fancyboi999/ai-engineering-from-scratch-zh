'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 90, w: 136, title: 'planner', sub: "客户端 agent", hue: 'violet' },
  { x: 320, w: 136, title: 'test-runner', sub: 'localhost:41241', hue: 'blue' },
  { x: 560, w: 150, title: "webhook 接收器", sub: ':41250/a2a-events', hue: 'violet' },
];

const rows = [
  [1, 0, 1, 'call', 'SendMessage', "returnImmediately、webhook 配置"],
  [2, 1, 0, 'reply', "任务 d7d3dceb SUBMITTED", "调用立即返回"],
  [3, 1, 2, 'event', 'POST statusUpdate WORKING', 'Authorization: Bearer hook_secret_91d2'],
  [4, 1, 2, 'event', "5 次 POST · artifactUpdate", "test-log.txt 的五个分块"],
  [5, 1, 2, 'event', 'POST artifactUpdate', "summary.json，一个 data part"],
  [6, 1, 2, 'event', 'POST statusUpdate COMPLETED', '1 failed, 11 passed'],
  [7, 2, 1, 'reply', '204 No Content', "每次 POST 的回答"],
  [8, 0, 1, 'call', 'ListTaskPushNotificationConfigs', "任务结束后发送"],
  [8, 1, 0, 'reply', "一个配置，id 92c697ef", "服务器分配的 ID"],
  [9, 0, 1, 'call', 'GetTaskPushNotificationConfig', "taskId 和 id"],
  [9, 1, 0, 'reply', "相同配置", null],
  [10, 0, 1, 'call', 'DeleteTaskPushNotificationConfig', null],
  [10, 1, 0, 'reply', 'result: {}', "此配置不再有 POST"],
];

const STEP = 40;
const TOP = 86;
const height = TOP + rows.length * STEP + 4;

module.exports = figure('fig-push-webhook', {
  height,
  title: "一次测试运行的 webhook",
  desc: "三条生命线：planner、test-runner、端口 41250 的 planner webhook 接收器。planner 用 returnImmediately 和推送配置发送 SendMessage，立即得到 TASK_STATE_SUBMITTED 的任务。test-runner 随后推送八次通知：带 Authorization Bearer 头的 working 状态、test-log.txt 的五个 artifactUpdate 分块、summary.json 产物、completed 状态。接收器对每次 POST 返回 204 No Content。任务结束后 planner 列出、读取、删除推送配置，服务器分配的 id 为 92c697ef。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: lane.w, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 12, anchor: 'middle' });
    f.lifeline(lane.x, 50, height - 8);
  }
  rows.forEach(([beat, from, to, style, label, note], index) => {
    const y = TOP + index * STEP;
    f.beat(beat);
    f.step(24, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note: note || undefined, labelX: (x1 + x2) / 2 });
  });
});
