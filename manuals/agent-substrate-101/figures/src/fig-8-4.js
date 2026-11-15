'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-8-4', {
  height: 346,
  title: '受支持升级流程的四个步骤',
  desc: '从上到下的四个升级步骤：podcertificate-controller、各节点上的 atelet、workers，最后是 API server、controller 与数据平面。前两步中运行中的 actor 保持运行（某次实测在 atelet 步骤中挂起与恢复曾失败 24 秒）。在 worker 步骤中每个 actor 会收到 SIGTERM，仅当进程未直接退出时才有 30 分钟窗口完成挂起；无人挂起的 actor 会变为崩溃状态。最后一步会迁移数据库 schema，回滚不会撤销该迁移。',
}, f => {
  const LEFT = 20;
  const WIDE = 240;
  const RIGHT = 310;
  const TALL = 60;
  const row = index => 30 + index * 80;
  f.kicker(LEFT, 20, '按此顺序依次升级');
  f.kicker(RIGHT, 20, '运行中 actor 受到的影响');
  const steps = [
    { hue: 'blue', title: '1  podcertificate-controller', sub: ['签发各组件证书'] },
    { hue: 'violet', title: '2  atelet', sub: ['每次升级一个节点'] },
    { hue: 'violet', title: '3  workers', sub: ['每批滚动池容量的 10%'] },
    { hue: 'blue', title: '4  ate-api-server 及其他组件', sub: ['ate-idp-server, CRD, ate-controller,', 'router, egress, SandboxConfig'] },
  ];
  steps.forEach((step, index) => {
    f.box({ x: LEFT, y: row(index), w: WIDE, h: TALL, pad: 6, ...step });
    if (index) f.arrow([LEFT + WIDE / 2, row(index - 1) + TALL], [LEFT + WIDE / 2, row(index) - 1], {});
  });
  const across = (index, style) => f.arrow([LEFT + WIDE, row(index) + TALL / 2], [RIGHT - 1, row(index) + TALL / 2], { style });
  f.box({ x: RIGHT, y: row(0), w: 310, h: TALL, hue: 'green', title: '无影响', sub: ['actor 继续正常运行'] });
  f.box({ x: RIGHT, y: row(1), w: 310, h: TALL, hue: 'green', title: '继续运行', sub: ['实测中该节点上的挂起与恢复', '曾连续失败 24 s'] });
  f.box({ x: RIGHT, y: row(2), w: 176, h: TALL, hue: 'amber', title: 'SIGTERM', sub: ['进程捕获信号时有', '30 分钟完成挂起'], titleSize: 12, pad: 6, strokeWidth: 2 });
  f.box({ x: RIGHT + 204, y: row(2), w: 106, h: TALL, hue: 'rose', title: 'CRASHED', sub: ['若无组件', '将其挂起'], titleSize: 12, pad: 6 });
  f.box({ x: RIGHT, y: row(3), w: 310, h: TALL, hue: 'teal', title: '迁移数据库 schema', sub: ['API 调用可能短暂中断一次；', '回滚不会撤销该 schema 迁移'] });
  across(0, 'call');
  across(1, 'call');
  across(2, 'state');
  across(3, 'write');
  f.arrow([RIGHT + 176, row(2) + TALL / 2], [RIGHT + 203, row(2) + TALL / 2], { style: 'fail' });
});
