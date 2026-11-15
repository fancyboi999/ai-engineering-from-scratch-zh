'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const forms = require('../../../_shared/forms.js');

const trace = fs.readFileSync(path.join(__dirname, '../../capture/lab/B-lifecycle/10-trace.tsv'), 'utf8').trim().split('\n').map(line => line.split('\t'));
const calls = trace.filter(row => /^call-\d$/.test(row[1])).map(row => Number(row[3]));
const afterIdle = Number(trace.find(row => row[1] === 'call-after-idle')[3]);
const idle = trace.find(row => row[1] === 'idle-watch-start')[2].replace('no requests for ', '');
const samples = trace.filter(row => row[1] === 'state').length - 3;
const first = calls[0];
const warm = calls.slice(1);
const s = value => `${value.toFixed(3)} s`;
const low = Math.min(...warm);
const high = Math.max(...warm);

const ANGLE = 'true';
const OX = 250;
const UP = 160;
const DOWN = 412;
const r1 = value => Math.round(value * 10) / 10;

module.exports = figure('plate-substrate-request', {
  height: 692,
  title: '单次请求唤醒单个 actor 的完整路径',
  desc: `单次请求的等轴测全局视图。客户端终端经 kubectl ate proxy 发送 POST /。在 ate-system 命名空间内，带 Envoy 标识的 atenet-router 调用 ate-api-server 的 ResumeActor，后者读取 Postgres 中的 actor 行记录并绑定 worker。下方为带 Kubernetes 标识的 kind-control-plane 节点，其上绘有敞口框架表示的 worker pod、内部的 gVisor 沙箱、atelet 以及绘为 bucket 的对象存储。atelet 将黄金快照恢复至沙箱内，使 actor my-counter-1 从虚线轮廓的 SUSPENDED 变为由内存、文件与 rootfs 三层实心块组成的 RUNNING。随后路由器打通指向端口 8443 的隧道。实测首次请求耗时 ${s(first)}，后续四次耗时 ${s(low)} 至 ${s(high)}，无流量空闲 ${idle} 后的请求耗时 ${s(afterIdle)}。`,
}, f => {
  const U = forms.isoView(f, { ox: OX, oy: UP, angle: ANGLE });
  const D = forms.isoView(f, { ox: OX, oy: DOWN, angle: ANGLE });
  const tag = (x, y, title, sub, hue, anchor = 'start') => {
    f.text(x, y, title, { size: 12, weight: 700, hue, anchor });
    if (sub) f.text(x, y + 15, sub, { size: 11, serif: true, hue: 'ink-soft', anchor });
  };

  f.kicker(20, 18, '请求路径 · Agent Substrate v1.0.0');
  f.text(620, 18, 'my-counter-1', { size: 11, anchor: 'end', hue: 'ink-soft' });

  forms.tile(f, U, [-50, -48, 0], 'grey', { w: 436, d: 100 });
  const CX = -186;
  forms.terminal(f, U, [CX, -8, 0], 'olive');
  forms.gateway(f, U, [-28, -28, 0], 'indigo', { mark: { id: 'envoy', size: 34, inset: 11, rise: 27.7 } });
  forms.tower(f, U, [175, -22, 0], 'blue', { mark: { id: 'substrate', size: 38, inset: 3, rise: 38 } });
  const postgres = forms.cylinder(f, U, [346, 0, 0], 'teal', { mark: { id: 'postgresql', size: 30, drop: 2.5 } });
  const pcx = postgres.center[0];

  tag(20, 126, '客户端', 'curl -X POST', 'olive');
  f.text(20, 156, 'kubectl ate proxy', { size: 11, serif: true, hue: 'ink-soft' });
  tag(OX, 70, 'atenet-router', 'Envoy 数据平面', 'indigo', 'middle');
  tag(420, 158, 'ate-api-server', '控制平面', 'blue', 'middle');
  tag(r1(pcx), 240, 'Postgres', null, 'teal', 'middle');
  f.text(620, 196, '命名空间 ate-system', { size: 11, serif: true, hue: 'ink-mute', anchor: 'end' });
  f.leader([604, 202], U.P(362, -48, 0), { hue: 'ink-mute' });
  f.text(620, 382, 'actor 行记录', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
  f.leader([594, 371], postgres.rim(9.5), { hue: 'teal' });

  forms.slab(f, D, [-70, -56, 0], 'grey', { w: 442, d: 172, mark: { id: 'kubernetes', size: 46, at: [336, 82] } });
  const pod = forms.frame(f, D, [-64, -48, 0], 'violet', { w: 192, d: 100, h: 86 });
  const sandbox = forms.shell(f, D, [-54, -38, 5], 'violet', { w: 172, d: 80, h: 65, mark: { id: 'gvisor', size: 31, inset: 88, rise: 63 } });
  forms.stack(f, D, [54, -28, 5], 'green', { ghost: true });
  const actor = forms.stack(f, D, [-28, -28, 5], 'green');
  sandbox.front();
  pod.front();
  const atelet = forms.unit(f, D, [180, -17, 0], 'violet');
  forms.bucket(f, D, [346, 0, 0], 'teal');

  tag(20, 304, 'worker pod', null, 'violet');
  f.leader([96, 300], D.P(-64, 52, 84), { hue: 'violet' });
  tag(20, 326, 'gVisor 沙箱', null, 'violet');
  f.leader([98, 322], D.P(-54, 42, 68), { hue: 'violet' });
  tag(20, 356, 'my-counter-1', null, 'green');
  for (const [label, lx, y, to] of [['内存', 48, 374, [-6, 14, 39]], ['文件', 48, 390, [-8, 21, 26]], ['rootfs', 66, 406, [-10, 28, 12]]]) {
    f.text(20, y, label, { size: 11, hue: 'green' });
    f.leader([lx, y - 4], D.P(...to), { hue: 'green' });
  }
  const running = D.P(0, 86, 0);
  f.text(...running, 'RUNNING', { size: 11.5, weight: 700, hue: 'green', anchor: 'middle' });
  f.leader([running[0] + 12, running[1] - 12], D.P(4, 44, 9), { hue: 'green' });
  const suspended = D.P(98, 86, 0);
  f.text(...suspended, 'SUSPENDED', { size: 11.5, hue: 'amber', anchor: 'middle' });
  f.leader([suspended[0] + 12, suspended[1] - 12], D.P(86, 30, 5), { hue: 'amber' });
  tag(...D.P(198, 64, 0), 'atelet', null, 'violet', 'middle');
  tag(620, 490, '对象存储', 'rustfs bucket', 'teal', 'end');
  f.text(620, 660, '节点', { size: 11, serif: true, hue: 'ink-mute', anchor: 'end' });
  tag(620, 676, 'kind-control-plane', null, 'grey', 'end');
  f.kicker(20, 556, '客户端实测耗时');
  f.text(20, 620, '经由 kubectl ate proxy，x86 服务器客户机', { size: 11, serif: true, hue: 'ink-mute' });
  f.text(20, 638, `无请求空闲 ${idle} 后：${samples}/${samples} 次采样仍为 RUNNING`, { size: 11, serif: true, hue: 'ink-mute' });
  f.text(20, 656, `随后一次请求耗时 ${s(afterIdle)}`, { size: 11, serif: true, hue: 'ink-mute' });

  f.beat(1);
  f.isoFlow(U, [[CX + 48, 12, 0], [-47, 12, 0]], { style: 'call' });
  f.text(...U.P(-100, 12, 15), 'POST /', { size: 11, anchor: 'middle', knock: true });
  f.step(...U.P(-72, -5, 0), 1);
  f.beat(2);
  f.isoFlow(U, [[30, 16, 0], [166, 16, 0]], { style: 'call' });
  f.text(...U.P(98, 16, 16), 'ResumeActor', { size: 11, anchor: 'middle', knock: true });
  f.step(...U.P(98, 33, 0), 2);
  f.beat(3);
  f.isoFlow(U, [[221, 12, 0], [322, 12, 0]], { style: 'write' });
  f.text(...U.P(274, 12, 16), '读取并绑定', { size: 11, anchor: 'middle', hue: 'teal', knock: true });
  f.step(...U.P(276, 29, 0), 3, { hue: 'teal' });

  f.beat(4);
  const apiFoot = U.P(219, 22, 0);
  f.path(`M${apiFoot[0]} ${apiFoot[1] + 2}L${apiFoot[0]} ${atelet.top[1] - 3}`, { style: 'call' });
  f.step(apiFoot[0] + 15, 374, 4);
  f.text(apiFoot[0] + 30, 378, 'Restore', { size: 11.5 });

  f.beat(5);
  f.isoFlow(D, [[320, 10, 0], [219, 10, 0]], { style: 'write' });
  f.isoFlow(D, [[169, 10, 0], [131, 10, 0]], { style: 'write', packet: false });
  forms.sheets(f, D, [262, 2, 9], 'teal');
  const five = D.P(270, 34, 0);
  f.step(...five, 5, { hue: 'teal' });
  f.text(five[0], five[1] + 24, '黄金快照', { size: 11, hue: 'teal', anchor: 'middle' });
  f.isoFlow(D, [[78, 35, 5], [-4, 35, 5]], { style: 'state', packet: false });

  f.beat(6);
  const routerFoot = U.P(28, 28, 0);
  f.path(`M${routerFoot[0]} ${routerFoot[1] + 2}L${routerFoot[0]} ${actor.top[1] - 3}`, { style: 'event' });
  f.step(routerFoot[0] - 15, 236, 6, { hue: 'indigo' });
  f.text(routerFoot[0] - 30, 240, '隧道，端口 8443', { size: 11.5, hue: 'indigo', anchor: 'end' });

  f.beat(7);
  f.isoFlow(U, [[-32, 27, 0], [CX + 48, 27, 0]], { style: 'reply' });
  f.step(...U.P(-92, 44, 0), 7);
  f.text(20, 578, `首次请求 ${s(first)}`, { size: 12, weight: 700, hue: 'amber' });
  f.text(20, 598, `后续四次 ${s(low)} 至 ${s(high)}`, { size: 12, weight: 700, hue: 'green' });
});
