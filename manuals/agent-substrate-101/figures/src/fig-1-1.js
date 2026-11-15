'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const read = rel => fs.readFileSync(path.join(__dirname, '../../capture/lab', rel), 'utf8').trim().split('\n').map(line => line.split('\t'));
const trace = read('B-lifecycle/10-trace.tsv');
const ops = read('B-lifecycle/20-trace-ops.tsv');
const first = Number(trace.find(row => row[1] === 'call-1')[3]);
const suspend = Number(ops.find(row => row[1] === 'suspend-async')[2].replace('s', ''));
const samples = trace.filter(row => row[1] === 'state').length - 3;
const idle = trace.find(row => row[1] === 'idle-watch-start')[2].replace('no requests for ', '');
const s2 = value => `${(Math.round(value * 100) / 100).toFixed(2)} s`;

module.exports = figure('fig-1-1', {
  height: 384,
  title: 'Substrate 负责什么，什么留给你',
  desc: `WorkerPool counter 的三个 worker pod 并排排列。中间的 counter-7cc7dcd596-ffxwt 运行 actor my-counter-1，另外两个未运行 actor。下方对象存储为每个挂起的 actor 保存一份快照，ate-api-server 与 Postgres 保存所有 actor 的状态。从对象存储指向 actor 的琥珀虚线箭头表示请求触发恢复，由 Substrate 自动完成，实测耗时 ${s2(first)}。从 actor 指向对象存储的青绿粗箭头是 SuspendActor，必须由你调用：无请求等待 ${idle} 后，${samples} 次采样中 actor 全部仍处于 RUNNING。底部两列划分职责：Substrate 在收到请求时恢复、挂起时写快照、路由请求并限制访问范围；你负责调用 SuspendActor、调整 worker 数量、崩溃后调用 RevertActor，以及在别处运行 GPU 任务。`,
}, f => {
  f.kicker(20, 18, 'WorkerPool counter · 3 个 worker pod，各可容纳 1 个此规格 actor');
  const pod = (x, name, sub, dash) => f.box({ x, y: 28, w: 190, h: 44, hue: 'violet', title: name, sub, titleSize: 11, dash });
  pod(20, 'counter-7cc7dcd596-5tj9h', '无 actor', 'dashed');
  const host = pod(225, 'counter-7cc7dcd596-ffxwt', 'CPU 1000 / 1000 millicores');
  pod(430, 'counter-7cc7dcd596-p6g2q', '无 actor', 'dashed');
  const actor = f.box({ x: 235, y: 92, w: 170, h: 44, hue: 'green', title: 'my-counter-1', sub: 'ACTOR_STATE_RUNNING', titleSize: 12.5, strokeWidth: 1.6 });
  f.rule(host.cx, 72, host.cx, 92, { hue: 'green', width: 1.6 });
  const store = f.box({ x: 20, y: 192, w: 300, h: 46, hue: 'teal', title: '对象存储', sub: '每个挂起的 actor 存一份快照' });
  const api = f.box({ x: 350, y: 192, w: 270, h: 46, hue: 'blue', title: 'ate-api-server 与 Postgres', sub: '所有 actor 与 worker 的状态' });

  f.beat(1);
  f.path(`M60 ${store.y} V114 H${actor.x - 1}`, { style: 'state' });
  f.text(72, 108, '请求触发恢复', { size: 11.5, hue: 'amber' });
  f.text(72, 132, `Substrate 自动执行：${s2(first)}`, { size: 11, serif: true, hue: 'ink-soft' });
  f.beat(2);
  f.path(`M290 ${actor.y + actor.h} V${store.y - 1}`, { style: 'write', width: 2.4 });
  f.text(300, 160, 'SuspendActor', { size: 11.5, hue: 'teal', weight: 700 });
  f.text(300, 176, '需由你调用', { size: 11, serif: true, hue: 'ink-soft' });
  f.beat(3);
  f.path(`M${api.cx + 40} ${api.y} V114 H${actor.x + actor.w + 1}`, { style: 'call' });
  f.text(api.cx + 48, 160, '选定', { size: 11.5 });
  f.text(api.cx + 48, 176, 'worker', { size: 11.5 });

  f.beat(0);
  f.kicker(20, 268, 'Substrate 负责');
  f.kicker(328, 268, '你负责');
  f.box({ x: 20, y: 276, w: 292, h: 96, hue: 'blue', align: 'left', subSize: 11.5, sub: [
    `收到请求时恢复 actor：${s2(first)}`,
    `挂起时写入快照：${s2(suspend)}`,
    '将每个请求路由到目标 worker',
    '限制 actor 可访问的目标',
  ] });
  f.box({ x: 328, y: 276, w: 292, h: 96, hue: 'grey', align: 'left', subSize: 11.5, sub: [
    `调 SuspendActor：空闲 ${idle} 仍 RUNNING`,
    '改 spec.replicas：无自动扩缩',
    '崩溃后调用 RevertActor',
    '在别处运行 GPU 任务：无设备支持',
  ] });
});
