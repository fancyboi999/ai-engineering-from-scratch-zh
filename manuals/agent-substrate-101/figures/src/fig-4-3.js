'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-3', {
  height: 352,
  title: 'ate-api-server 如何为一次恢复选定 worker',
  desc: '从 ResumeActor 到绑定 worker 的流程。所有 worker 依次经过六项检查：已注册且处于 WORKER_STATE_ACTIVE、匹配快照的沙箱类别、持有节点本地快照的所在节点、具备可恢复内存快照的运行时、匹配模板与 actor 的 worker 选择器标签，以及剩余容量满足 actor 资源上限。若无候选者，则返回错误 no worker has room for the actor，路由器暂存请求；若有候选者，则随机抽两个并在单个 Postgres 事务中绑定负载较低的一个。',
}, f => {
  const start = f.box({ x: 20, y: 20, w: 150, h: 48, hue: 'amber', title: 'ResumeActor', sub: 'actor 处于 SUSPENDED' });
  f.kicker(210, 18, '对每个 worker 执行六项检查');
  const filters = [
    ['已注册且处于 WORKER_STATE_ACTIVE', 'blue'],
    ['匹配快照的沙箱类别', 'violet'],
    ['若存在节点本地快照，则须在同一节点', 'teal'],
    ['具备可恢复该内存快照的运行时', 'violet'],
    ['标签匹配模板与 actor 的 workerSelector', 'grey'],
    ['剩余容量满足 actor 的资源上限', 'violet'],
  ];
  filters.forEach(([title, hue], index) => {
    f.box({ x: 210, y: 28 + index * 34, w: 410, h: 28, hue, title: `${index + 1}  ${title}`, titleSize: 12, weight: 400, align: 'left' });
  });
  f.arrow(start.right(), [209, start.cy], { style: 'call' });

  const none = f.box({ x: 20, y: 262, w: 230, h: 66, hue: 'rose', dash: 'dashed', title: '无候选 worker', sub: ['no worker has room for the actor', '路由器暂存该请求'] });
  const pick = f.box({ x: 280, y: 262, w: 160, h: 66, hue: 'blue', title: '随机抽两个', sub: ['负载较低的候选者', '胜出'] });
  const bind = f.box({ x: 470, y: 262, w: 150, h: 66, hue: 'teal', title: '绑定', sub: ['Postgres 内的', '单个事务'] });
  f.path(`M230 227 V244 H${none.cx} V${none.y - 1}`, { style: 'fail' });
  f.text(none.cx - 8, 240, '无 worker 通过', { size: 11, serif: true, hue: 'rose', anchor: 'end' });
  f.text(pick.cx + 8, 248, '通过检查的 worker', { size: 11, serif: true, hue: 'ink-soft' });
  f.arrow([pick.cx, 227], [pick.cx, pick.y - 1], { style: 'call' });
  f.arrow(pick.right(), [bind.x - 1, pick.cy], { style: 'write' });
  f.text(bind.cx, 346, 'ACTOR_STATE_RESUMING', { size: 11, hue: 'amber', anchor: 'middle' });
});
