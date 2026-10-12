'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 100, title: 'planner', sub: "客户端 agent", hue: 'violet' },
  { x: 350, title: 'code-reviewer', sub: "远程 agent", hue: 'blue' },
  { x: 556, title: "任务 e5c95b09", sub: "存储任务记录", hue: 'teal' },
];

const rows = [
  [0, 1, 'call', 'SendMessage', "text 与 refunds.diff，无 taskId"],
  [1, 2, 'state', 'TASK_STATE_INPUT_REQUIRED', "询问：哪个基准分支？"],
  [1, 0, 'reply', "task，TASK_STATE_INPUT_REQUIRED", "阻塞调用在此返回"],
  [0, 1, 'call', 'SendMessage: main', 'taskId e5c95b09, contextId 49c5a238'],
  [1, 2, 'write', "history：问题、main", "问题离开当前状态"],
  [1, 2, 'state', 'TASK_STATE_WORKING', 'Comparing the diff against main'],
  [1, 2, 'write', "产物 review.json", "一个 text part 和一个 data part"],
  [1, 2, 'state', 'TASK_STATE_COMPLETED', "状态消息：2 findings"],
  [1, 0, 'reply', "task，TASK_STATE_COMPLETED", "review.json，四条历史消息"],
];

module.exports = figure('fig-input-required', {
  height: 468,
  title: "审查的问题与回答",
  desc: "三条生命线：planner、code-reviewer agent、存储任务 e5c95b09。planner 发送不带任务 ID 的 diff，reviewer 用询问基准分支的问题将任务移到 TASK_STATE_INPUT_REQUIRED，阻塞调用返回任务。planner 带相同任务和上下文 ID 回答 main。reviewer 将问题移入历史、工作、添加 review.json 产物、完成任务，返回含四条历史消息的任务。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 8, w: 150, h: 38, hue: lane.hue, title: lane.title, sub: lane.sub, anchor: 'middle' });
    f.lifeline(lane.x, 46, 456);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 84 + index * 44;
    f.beat(index + 1);
    f.step(24, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX: (x1 + x2) / 2 });
  });
});
