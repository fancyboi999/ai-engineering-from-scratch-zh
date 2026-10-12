'use strict';

const { figure } = require('../../../_shared/figkit.js');

const W = 192;
const XS = [20, 224, 428];
const ROW = [116, 186, 256, 326, 396];
const H = 44;

function lane(f, index, card, steps) {
  const x = XS[index];
  const mid = x + W / 2;
  let previous = null;
  steps.forEach((step, row) => {
    f.beat(step.beat);
    if (row === 0) f.arrow([mid, card.y + card.h], [mid, ROW[0] - 1], { style: 'call', label: step.label });
    else f.arrow([mid, previous.y + H], [mid, ROW[row] - 1], { style: step.arrow, label: step.label });
    previous = f.box({ x, y: ROW[row], w: W, h: H, hue: step.hue, dash: step.dash, double: step.double, title: step.title, sub: step.sub, titleSize: step.titleSize || 12, pad: 8 });
  });
  return previous;
}

function decision(f, index, beat, end, title, sub) {
  f.beat(beat);
  const mid = XS[index] + W / 2;
  f.arrow([mid, end.y + end.h], [mid, 475], { style: 'call', hue: 'ink-mute' });
  if (index > 0) f.arrow([XS[index - 1] + W, 498], [XS[index] - 1, 498], { style: 'call' });
  return f.box({ x: XS[index], y: 476, w: W, h: 44, hue: 'violet', title, sub, titleSize: 12 });
}

module.exports = figure('fig-planner-run', {
  height: 596,
  title: "planner 的运行与逐次决策",
  desc: "planner 读取三张卡片，将技能映射到 agent。第一泳道：提交 a41d7c3 的 run-tests SendMessage 返回已完成任务 954267b7，summary.json 显示 passed 13、failed 0。第二泳道：review-diff SendMessage 返回 TASK_STATE_INPUT_REQUIRED，询问基准分支，planner 在同一任务回答 main，任务完成，review.json 有一项 low 严重度发现。第三泳道：带 bearer token 的 deploy SendMessage 返回 TASK_STATE_AUTH_REQUIRED，planner 订阅，操作员在首帧到达时通过 A2A 外部批准，流以 TASK_STATE_COMPLETED 结束。planner 在每条泳道后决策，若测试失败或发现严重度 high 就停止。",
}, f => {
  f.kicker(20, 18, "发现：每端口一张卡片，技能映射到 agent");
  f.kicker(20, 466, '决策');
  f.box({ x: 20, y: 540, w: 600, h: 44, hue: 'rose', dash: 'dashed', title: '停止', sub: "测试任务未完成、测试失败或发现严重度 high 时", titleSize: 12 });

  f.beat(1);
  const cards = [
    f.box({ x: XS[0], y: 26, w: W, h: 46, hue: 'blue', title: 'test-runner', sub: 'run-tests', titleSize: 12 }),
    f.box({ x: XS[1], y: 26, w: W, h: 46, hue: 'blue', title: 'code-reviewer', sub: 'review-diff, answer-question', titleSize: 12 }),
    f.box({ x: XS[2], y: 26, w: W, h: 46, hue: 'blue', title: 'deployer', sub: "deploy，需要 bearer token", titleSize: 12 }),
  ];

  const tests = lane(f, 0, cards[0], [
    { beat: 2, hue: 'violet', title: 'SendMessage', sub: "提交 a41d7c3", label: "委派 run-tests" },
    { beat: 3, hue: 'amber', double: true, title: 'TASK_STATE_COMPLETED', titleSize: 11.5, sub: "任务 954267b7", arrow: 'reply' },
    { beat: 3, hue: 'green', title: 'summary.json', sub: 'passed 13, failed 0', arrow: 'reply' },
  ]);
  decision(f, 0, 4, tests, '测试', "13 项通过，继续");

  const review = lane(f, 1, cards[1], [
    { beat: 5, hue: 'violet', title: 'SendMessage', sub: "refunds.diff 作为 raw part", label: "委派 review-diff" },
    { beat: 6, hue: 'amber', dash: 'dashed', title: 'TASK_STATE_INPUT_REQUIRED', titleSize: 11.5, sub: "哪个基准分支？", arrow: 'reply' },
    { beat: 7, hue: 'violet', title: "SendMessage，同一任务", titleSize: 11.5, sub: "从上下文回答：main", arrow: 'call', label: '回答' },
    { beat: 8, hue: 'amber', double: true, title: 'TASK_STATE_COMPLETED', titleSize: 11.5, sub: "任务 80bc7784", arrow: 'reply' },
    { beat: 8, hue: 'green', title: 'review.json', sub: "1 项发现，severity low", arrow: 'reply' },
  ]);
  decision(f, 1, 9, review, '审查', "1 项发现，0 项阻断");

  const deploy = lane(f, 2, cards[2], [
    { beat: 10, hue: 'violet', title: 'SendMessage', sub: "构建 2026.10.06-1、token", label: "委派 deploy" },
    { beat: 11, hue: 'amber', dash: 'dashed', title: 'TASK_STATE_AUTH_REQUIRED', titleSize: 11.5, sub: "需要操作员批准", arrow: 'reply' },
    { beat: 12, hue: 'indigo', title: 'SubscribeToTask', sub: "第 1 帧：Task 快照", arrow: 'call', label: '跟踪' },
    { beat: 13, hue: 'grey', title: "操作员批准", sub: "POST /approve，不是 A2A", arrow: 'effect', label: "首帧到达时" },
    { beat: 14, hue: 'amber', double: true, title: 'TASK_STATE_COMPLETED', titleSize: 11.5, sub: "任务 a31361b3，流结束", arrow: 'event', label: "另外 3 帧" },
  ]);
  decision(f, 2, 15, deploy, '部署', 'TASK_STATE_COMPLETED');
});
