'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const run = load(path.join(__dirname, '../../capture/lab/summary/demos-x86.json')).idle_suspender;
const first = run.suspends[0];
const wake = run.requests.find(request => request.kind === 'resumed' && request.t > first.t);

module.exports = figure('fig-9-1', {
  height: 276,
  title: '处于请求路径中的空闲挂起器',
  desc: `客户端将请求发往空闲挂起器，后者经 kubectl ate proxy 转发至 atenet-router 与目标 actor。挂起器记录每个 actor 最近一次请求的时间。在实测记录中，它在 actor ${first.actor} 空闲 ${first.idle_seconds} 秒后调用 SuspendActor（耗时 ${first.seconds} 秒）；后续请求发现 actor ${wake.actor} 已挂起，由路由器在 ${wake.seconds} 秒内将其恢复。`,
}, f => {
  f.kicker(16, 24, '单次请求');
  const client = f.box({ x: 16, y: 36, w: 80, h: 46, hue: 'olive', title: '客户端', sub: 'curl' });
  const suspender = f.box({ x: 124, y: 36, w: 156, h: 46, hue: 'plum', title: '空闲挂起器', sub: '单个 Python 文件' });
  const proxy = f.box({ x: 308, y: 36, w: 156, h: 46, hue: 'olive', title: 'kubectl ate proxy', sub: '每个 actor 一个' });
  const router = f.box({ x: 492, y: 36, w: 132, h: 46, hue: 'indigo', title: 'atenet-router', sub: '调用 ResumeActor' });
  f.arrow(client.right(), suspender.left(), { style: 'call' });
  f.arrow(suspender.right(), proxy.left(), { style: 'call' });
  f.arrow(proxy.right(), router.left(), { style: 'call' });

  f.kicker(16, 128, '挂起决策');
  const table = f.box({ x: 124, y: 140, w: 156, h: 92, hue: 'plum', title: '最近请求时间', sub: ['busy：2 s 前', `bursty：${first.idle_seconds} s 前`, 'rare：已挂起'] });
  f.arrow(suspender.bottom(), table.top(), { style: 'write' });
  f.text(210, 116, '每次请求时更新', { size: 11, hue: 'teal' });
  const api = f.box({ x: 308, y: 163, w: 156, h: 46, hue: 'blue', title: 'ate-api-server', sub: 'SuspendActor' });
  const actor = f.box({ x: 492, y: 163, w: 132, h: 46, hue: 'green', title: 'actor bursty', sub: '占 2 个槽位之一' });
  f.arrow(table.right(), api.left(), { style: 'state' });
  f.arrow(api.right(), actor.left(), { style: 'state' });
  f.text(386, 254, `空闲满 ${first.idle_seconds} s，触发挂起：耗时 ${first.seconds} s`, { size: 11, hue: 'amber', anchor: 'middle' });
  f.arrow(router.bottom(), actor.top(), { style: 'call' });
  f.text(548, 126, `恢复，${wake.seconds} s`, { size: 11, anchor: 'end', knock: true });
});
