'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const turns = load(path.join(__dirname, '../../capture/lab/summary/kagent-turns-x86.json'));
const resume = turns.resume_seconds.turns_only;
const suspend = turns.suspend_seconds;
const dwell = stat => `${stat.median.toFixed(2)} s（${stat.n} 次中位）`;

const W = 150;
const H = 50;
const COL = [14, 245, 476];
const TOP = 44;
const LOW = 176;

module.exports = figure('fig-3-2', {
  height: 366,
  title: '七种 actor 状态及其状态迁移',
  desc: `状态图展示 v1.0.0 中 ActorState 枚举的七种状态。CreateActor 创建处于 ACTOR_STATE_SUSPENDED 的 actor。ResumeActor 使其经 ACTOR_STATE_RESUMING 进入 ACTOR_STATE_RUNNING。SuspendActor 使其经 ACTOR_STATE_SUSPENDING 回到 ACTOR_STATE_SUSPENDED。恢复失败、worker pod 丢失、内存超限被杀或挂起失败都会使其进入 ACTOR_STATE_CRASHED，此时请求收到 503。离开 ACTOR_STATE_CRASHED 的唯一箭头是 RevertActor，经 ACTOR_STATE_REVERTING 回到 ACTOR_STATE_SUSPENDED。DeleteActor 可将任意状态的 actor 转入 ACTOR_STATE_DELETING。在 16 vCPU、31 GB 的第二台 x86 客户机 kagent 运行中，actor 在 ${resume.n} 轮恢复里停留于 ACTOR_STATE_RESUMING 的中位数为 ${resume.median.toFixed(2)} s，在 ${suspend.n} 次挂起里停留于 ACTOR_STATE_SUSPENDING 的中位数为 ${suspend.median.toFixed(2)} s。灰色点线箭头表示从源码读到但未实跑的迁移。`,
}, f => {
  const state = (col, y, name, sub, hue = 'amber', extra = {}) => f.box({ x: COL[col], y, w: W, h: H, hue, titleSize: 11, pad: 2, title: `ACTOR_STATE_${name}`, sub, ...extra });
  const suspended = state(0, TOP, 'SUSPENDED', '无沙箱，无 worker');
  const resuming = state(1, TOP, 'RESUMING', dwell(resume));
  const running = state(2, TOP, 'RUNNING', 'worker 上有沙箱');
  const reverting = state(0, LOW, 'REVERTING', '后续调用将丢失');
  const crashed = state(1, LOW, 'CRASHED', '请求返回 503', 'rose', { strokeWidth: 2 });
  const suspending = state(2, LOW, 'SUSPENDING', dwell(suspend));

  const label = (x, y, content, options = {}) => f.text(x, y, content, { size: 11, serif: true, hue: options.hue || 'ink-soft', anchor: options.anchor, weight: options.weight });
  const gap = (a, b) => (a.x + W + b.x) / 2;

  label(89, 16, 'CreateActor', { anchor: 'middle' });
  f.arrow([89, 22], [89, TOP - 1], { style: 'call' });

  f.arrow(suspended.right(), [resuming.x - 1, suspended.cy], { style: 'state' });
  label(gap(suspended, resuming), suspended.cy - 8, 'ResumeActor', { anchor: 'middle' });
  f.arrow(resuming.right(), [running.x - 1, resuming.cy], { style: 'state' });
  label(gap(resuming, running), resuming.cy - 8, '恢复完成', { anchor: 'middle' });

  f.arrow([596, TOP + H], [596, LOW - 1], { style: 'state' });
  label(588, 154, 'SuspendActor', { anchor: 'end' });
  f.path(`M554 ${LOW + H} V250 H5 V${suspended.cy} H13`, { style: 'state' });
  label(300, 244, '快照已落盘节点');

  f.arrow([293, TOP + H], [293, LOW - 1], { style: 'fail' });
  label(285, 154, '恢复失败', { anchor: 'end', hue: 'rose' });
  f.path(`M512 ${TOP + H} V124 H363 V${LOW - 1}`, { style: 'fail' });
  label(504, 118, 'worker pod 丢失、内存被杀', { anchor: 'end', hue: 'rose' });
  f.arrow(suspending.left(), [crashed.x + W + 1, suspending.cy], { style: 'fail' });
  label(gap(crashed, suspending), suspending.cy - 8, '挂起', { anchor: 'middle', hue: 'rose' });
  label(gap(crashed, suspending), suspending.cy + 16, '失败', { anchor: 'middle', hue: 'rose' });

  f.arrow(crashed.left(), [reverting.x + W + 1, crashed.cy], { style: 'state', width: 2 });
  label(gap(reverting, crashed), crashed.cy - 8, 'RevertActor', { anchor: 'middle', hue: 'ink', weight: 700 });
  label(gap(reverting, crashed), crashed.cy + 16, '唯一', { anchor: 'middle' });
  label(gap(reverting, crashed), crashed.cy + 30, '脱困路径', { anchor: 'middle' });
  f.arrow([70, LOW], [70, TOP + H + 1], { style: 'state' });
  label(78, 138, '最近持久快照');
  f.arrow([34, TOP + H], [34, LOW - 1], { hue: 'ink-mute', dash: 'dotted' });

  const deleting = f.box({ x: COL[2], y: 298, w: W, h: H, hue: 'grey', titleSize: 11, pad: 2, title: 'ACTOR_STATE_DELETING', sub: '随后 actor 消失', double: true });
  label(deleting.cx, 278, 'DeleteActor，可从任意状态触发', { anchor: 'middle' });
  f.arrow([deleting.cx, 283], [deleting.cx, 297], { style: 'call' });

  f.path('M14 286 H40', { style: 'state', head: false });
  f.path('M48 286 H76', { style: 'fail', head: false });
  label(84, 290, '实测追踪：琥珀色为状态迁移，玫红色为失败');
  f.path('M14 304 H76', { hue: 'ink-mute', dash: 'dotted', head: false });
  label(84, 308, '仅见于源码、未实跑：对 SUSPENDED actor 调 RevertActor');
  label(14, 326, '未画出（同样仅见于源码）：对 RUNNING actor 调用 RevertActor。');
  label(14, 342, 'RESUMING 与 SUSPENDING 的耗时来自 kagent 运行中的仅文件快照 actor。');
  label(14, 358, '进程退出后 actor 仍保持 RUNNING，详见第 3.5 节。');
  void running;
});
