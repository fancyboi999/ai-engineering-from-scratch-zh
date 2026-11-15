'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-5', {
  height: 390,
  title: '从错误文本定位修复步骤',
  desc: '四行决策图。带 error resuming actor 的 500 与带 AssignWorker prerequisite not met 的 503 都代表 ACTOR_STATE_CRASHED，修复方法是 kubectl ate revert actor，这会丢弃最近一次已完成快照之后的调用。带 upstream connect error 的 503 表示进程已退出但状态仍为 ACTOR_STATE_RUNNING，需先同步挂起使其转为 CRASHED 再回退。已停止节点上的 actor 也会返回相同错误并保持 RUNNING，节点停机期间挂起或回退均无效，处理步骤见图 8.2d。等待 5 秒后返回 no worker has room for the actor 的 503 说明 actor 健康，只是 worker 池已满。',
}, f => {
  f.kicker(20, 18, '调用方看到的响应');
  f.kicker(296, 18, 'Actor 状态');
  f.kicker(456, 18, '处理步骤');

  const seen = (y, title, sub, hue = 'rose') => f.box({ x: 20, y, w: 250, h: 60, hue, align: 'left', title, sub });
  const a = seen(28, '500（0.08 s）', ['error resuming actor lab-c/x1']);
  const b = seen(104, '503（0.06 s）', ['AssignWorker prerequisite not met', 'got: ACTOR_STATE_CRASHED']);
  const c = seen(196, '503（0.06 s）', ['upstream connect error or disconnect', 'reset reason: connection termination']);
  const d = seen(288, '503（5.06 s 后）', ['no worker has room for the actor']);

  const crashed = f.box({ x: 296, y: 50, w: 134, h: 92, hue: 'rose', title: 'CRASHED', sub: ['拒绝执行', 'resume actor'] });
  const running = f.box({ x: 296, y: 196, w: 134, h: 60, hue: 'rose', dash: 'dashed', title: 'RUNNING', sub: ['进程已退出'] });
  const suspended = f.box({ x: 296, y: 288, w: 134, h: 60, hue: 'amber', title: 'SUSPENDED', sub: ['worker 池已满'] });

  const revert = f.box({ x: 456, y: 50, w: 164, h: 92, hue: 'amber', title: 'revert actor', sub: ['回退至最近一次', 'COMPLETED 快照，', '后续调用丢失'] });
  const suspend = f.box({ x: 456, y: 196, w: 164, h: 60, hue: 'amber', title: 'suspend --mode sync', titleSize: 11.5, sub: ['执行失败并将', 'actor 标为 CRASHED'] });
  const wait = f.box({ x: 456, y: 288, w: 164, h: 60, hue: 'violet', title: '扩容 worker', sub: ['或稍后重试，', '详见第 4.4 节'] });

  f.arrow(a.right(), [crashed.x - 1, a.cy], { style: 'fail' });
  f.arrow(b.right(), [crashed.x - 1, b.cy - 12], { style: 'fail' });
  f.arrow(c.right(), [running.x - 1, c.cy], { style: 'fail' });
  f.arrow(d.right(), [suspended.x - 1, d.cy], { style: 'fail' });
  f.arrow(crashed.right(), [revert.x - 1, crashed.cy], { style: 'call' });
  f.arrow(running.right(), [suspend.x - 1, running.cy], { style: 'call' });
  f.arrow(suspended.right(), [wait.x - 1, suspended.cy], { style: 'call' });
  f.arrow([538, 195], [538, 143], { style: 'state' });
  f.text(20, 366, '节点停止也会返回第三种错误文本。此时不要回退：详见图 8.2d。', { size: 11, serif: true, hue: 'rose' });
  f.text(20, 382, '耗时与名称取自 x86 服务器客户机（Envoy 数据平面）的实测运行。', { size: 11, serif: true, hue: 'ink-soft' });
});
