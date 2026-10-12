'use strict';

const { figure } = require('../../../_shared/figkit.js');

const cards = [
  {
    x: 20, y: 28, state: 'TASK_STATE_COMPLETED', where: "test-runner，任务 3d8f7801",
    by: "agent 选择：测试已运行", byHue: 'blue',
    message: ['1 failed, 11 passed'],
    artifacts: "产物：test-log.txt、summary.json",
  },
  {
    x: 330, y: 28, state: 'TASK_STATE_FAILED', where: "test-runner，任务 8ae21dcb",
    by: "agent 选择：提交不存在", byHue: 'blue',
    message: ['Commit deadbee does not exist in', 'payments-api.'],
    artifacts: "产物：无",
  },
  {
    x: 20, y: 206, state: 'TASK_STATE_CANCELED', where: "test-runner，任务 f22ed7af",
    by: "客户端选择：CancelTask", byHue: 'violet',
    message: ["Canceled at the client's request."],
    artifacts: "产物：test-log.txt，两个分块",
  },
  {
    x: 330, y: 206, state: 'TASK_STATE_REJECTED', where: "deployer，任务 23cf3710",
    by: "agent 选择：策略要求", byHue: 'blue',
    message: ["Production deploys are outside this agent's", 'policy. Use the release train.'],
    artifacts: "产物：无",
  },
];

const after = [
  { y: 410, call: 'SendMessage, taskId f22ed7af', error: 'UnsupportedOperationError, -32004' },
  { y: 452, call: "CancelTask，第二次", error: 'TaskNotCancelableError, -32002' },
];

module.exports = figure('fig-task-endings', {
  height: 492,
  title: "任务结束的四种方式",
  desc: "四张卡片，分别对应套件的终态。Completed：test-runner 任务 3d8f7801，agent 因测试已运行而选择，状态消息 1 failed, 11 passed，产物 test-log.txt、summary.json。Failed：任务 8ae21dcb，agent 因提交 deadbee 不存在而选择，无产物。Canceled：任务 f22ed7af，客户端通过 CancelTask 选择，保留两个日志分块。Rejected：deployer 任务 23cf3710，策略拒绝，无产物。下方，向已取消任务发消息得到 UnsupportedOperationError，再次取消得到 TaskNotCancelableError。",
}, f => {
  f.kicker(20, 16, "套件中的四种终态");
  cards.forEach((card, index) => {
    f.beat(index + 1);
    f.box({ x: card.x, y: card.y, w: 290, h: 42, hue: 'amber', double: true, title: card.state, sub: card.where });
    f.text(card.x + 4, card.y + 60, card.by, { size: 11.5, hue: card.byHue });
    f.box({ x: card.x, y: card.y + 70, w: 290, h: 62, hue: 'blue', title: "状态消息", titleSize: 11, sub: card.message, align: 'left' });
    f.text(card.x + 4, card.y + 152, card.artifacts, { size: 11.5, hue: 'green' });
  });
  f.beat(5);
  f.rule(20, 384, 620, 384, { hue: 'ink-mute', dash: 'dashed' });
  f.kicker(20, 400, "结束之后");
  f.text(140, 400, "调用已取消任务 f22ed7af，来自 10-cancel.http", { size: 11, serif: true, hue: 'ink-soft' });
  after.forEach((row, index) => {
    f.beat(5 + index);
    f.box({ x: 20, y: row.y, w: 250, h: 30, hue: 'violet', title: row.call, titleSize: 11.5 });
    f.arrow([270, row.y + 15], [329, row.y + 15], { style: 'fail' });
    f.box({ x: 330, y: row.y, w: 290, h: 30, hue: 'rose', title: row.error, titleSize: 11.5 });
  });
});
