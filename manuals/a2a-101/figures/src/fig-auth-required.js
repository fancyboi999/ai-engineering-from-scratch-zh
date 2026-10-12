'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 100, title: 'planner', sub: "客户端 agent", hue: 'violet' },
  { x: 350, title: 'deployer', sub: "远程 agent", hue: 'blue' },
  { x: 556, title: '操作员', sub: "A2A 之外", hue: 'grey' },
];

const rows = [
  [0, 1, 'call', 'SendStreamingMessage', "部署 2026.10.06-1 到 staging"],
  [1, 0, 'event', "task，TASK_STATE_SUBMITTED", "第 1 帧"],
  [1, 0, 'event', 'TASK_STATE_WORKING', "第 2 帧：Preparing build"],
  [1, 0, 'event', 'TASK_STATE_AUTH_REQUIRED', "第 3 帧：链接 /approve/ecf2dcb6"],
  [2, 1, 'effect', 'POST /approve/ecf2dcb6', "批准，A2A 之外"],
  [1, 2, 'reply', '200, approved: true', "普通 HTTP"],
  [1, 0, 'event', 'TASK_STATE_WORKING', "第 4 帧：Approved by an operator"],
  [1, 0, 'event', 'artifactUpdate', "第 5 帧：deploy-report.json"],
  [1, 0, 'event', 'TASK_STATE_COMPLETED', "第 6 帧，随后流关闭"],
];

module.exports = figure('fig-auth-required', {
  height: 468,
  title: "等待操作员的部署",
  desc: "三条生命线的时序图：planner、deployer agent、A2A 之外的操作员。planner 用 SendStreamingMessage 打开流。第 1 至第 3 帧携带 TASK_STATE_SUBMITTED、TASK_STATE_WORKING、带批准链接的 TASK_STATE_AUTH_REQUIRED。操作员通过普通 HTTP 向批准端点 POST 时，流保持打开但没有帧。随后第 4 至第 6 帧携带 TASK_STATE_WORKING、deploy-report.json 产物、TASK_STATE_COMPLETED，流关闭。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 8, w: 150, h: 38, hue: lane.hue, title: lane.title, sub: lane.sub, anchor: 'middle' });
    f.lifeline(lane.x, 46, 456);
  }
  const rowY = index => 84 + index * 44;
  rows.forEach(([from, to, style, label, note], index) => {
    const y = rowY(index);
    f.beat(index + 1);
    f.step(24, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX: (x1 + x2) / 2 });
    if (index === 3) {
      f.rule(112, rowY(3) + 22, 112, rowY(6) - 16, { hue: 'indigo', dash: 'dotted', width: 1.6 });
      f.text(124, rowY(4) + 26, "流保持打开，", { size: 11, hue: 'indigo' });
      f.text(124, rowY(4) + 41, "等待时没有帧", { size: 11, hue: 'indigo' });
    }
  });
});
