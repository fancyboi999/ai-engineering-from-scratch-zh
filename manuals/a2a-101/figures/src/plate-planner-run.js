'use strict';

const { figure } = require('../../../_shared/figkit.js');

const TASK_X = 424;
const TASK_W = 196;

function task(f, cy, id, lines) {
  const h = 22 + lines.length * 15 + 12;
  const y = cy - h / 2;
  f.rect(TASK_X, y, TASK_W, h, { hue: 'amber' });
  f.text(TASK_X + 12, y + 20, `task ${id}`, { size: 12.5, weight: 700, max: TASK_W - 24 });
  lines.forEach(([kind, content], index) => {
    const state = kind === 'state';
    f.text(TASK_X + 12, y + 38 + index * 15, content, { size: 11, serif: !state, hue: state ? 'amber' : 'ink-soft', max: TASK_W - 24 });
  });
}

module.exports = figure('plate-planner-run', {
  height: 500,
  title: "一个 planner，三个远程 agent",
  desc: "左侧为 capture/planner.py 的 planner，三条泳道各对应一次委派，按运行顺序排列。每条泳道中 planner 调用显示端口和技能的远程 agent，agent 运行显示状态的任务。test-runner 完成，13 passed。code-reviewer 询问基准分支，planner 回答 main，任务完成并给出一项发现。deployer 在 TASK_STATE_AUTH_REQUIRED 等待操作员批准，planner 用 SubscribeToTask 跟踪，随后完成。",
}, f => {
  f.kicker(20, 18, "客户端 agent");
  f.kicker(256, 18, "远程 agent");
  f.kicker(TASK_X, 18, "它运行的任务");

  f.box({ x: 20, y: 36, w: 120, h: 392, hue: 'violet', pad: 8, title: 'planner', sub: ["客户端 agent", "读取 3 张卡片，", "随后委派"] });

  const lanes = [96, 232, 368];
  f.rule(150, 164, 620, 164, { dash: 'dotted' });
  f.rule(150, 300, 620, 300, { dash: 'dotted' });

  f.beat(1);
  const tests = f.box({ x: 256, y: lanes[0] - 34, w: 150, h: 68, hue: 'blue', title: 'test-runner', sub: ["端口 41241", "技能 run-tests"] });
  f.arrow([140, lanes[0]], [tests.x - 1, lanes[0]], { style: 'call', label: 'SendMessage' });
  f.beat(2);
  f.arrow(tests.right(), [TASK_X - 1, lanes[0]], { style: 'state' });
  task(f, lanes[0], '954267b7', [['state', 'TASK_STATE_COMPLETED'], ['note', "summary.json：13 passed"]]);

  f.beat(3);
  const review = f.box({ x: 256, y: lanes[1] - 42, w: 150, h: 84, hue: 'blue', title: 'code-reviewer', sub: ["端口 41242", "技能 review-diff，", 'answer-question'] });
  f.arrow([140, lanes[1] - 12], [review.x - 1, lanes[1] - 12], { style: 'call', label: 'SendMessage' });
  f.beat(4);
  f.arrow(review.right(), [TASK_X - 1, lanes[1]], { style: 'state' });
  task(f, lanes[1], '80bc7784', [['state', 'TASK_STATE_INPUT_REQUIRED'], ['note', "询问基准分支"], ['note', "planner 回答：main"], ['state', 'TASK_STATE_COMPLETED'], ['note', "review.json：1 项发现"]]);
  f.beat(5);
  f.arrow([140, lanes[1] + 24], [review.x - 1, lanes[1] + 24], { style: 'call', label: "回答：main" });

  f.beat(6);
  const deploy = f.box({ x: 256, y: lanes[2] - 42, w: 150, h: 84, hue: 'blue', title: 'deployer', sub: ["端口 41243", "技能 deploy", "需要 bearer token"] });
  f.arrow([140, lanes[2] - 12], [deploy.x - 1, lanes[2] - 12], { style: 'call', label: 'SendMessage' });
  f.beat(7);
  f.arrow(deploy.right(), [TASK_X - 1, lanes[2]], { style: 'state' });
  task(f, lanes[2], 'a31361b3', [['state', 'TASK_STATE_AUTH_REQUIRED'], ['note', "等待操作员"], ['note', "planner 订阅"], ['state', 'TASK_STATE_COMPLETED'], ['note', "构建已上线 staging"]]);
  f.arrow([140, lanes[2] + 24], [deploy.x - 1, lanes[2] + 24], { style: 'call', label: 'SubscribeToTask' });

  f.beat(8);
  const operator = f.box({ x: 256, y: 452, w: 150, h: 40, hue: 'grey', title: '操作员', sub: "A2A 之外" });
  f.arrow(operator.top(), [operator.cx, deploy.y + deploy.h + 1], { style: 'effect', label: '批准' });
});
