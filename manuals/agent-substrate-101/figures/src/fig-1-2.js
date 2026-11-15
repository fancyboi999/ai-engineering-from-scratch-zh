'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { flat } = require('../../../_shared/forms.js');

const trace = fs.readFileSync(path.join(__dirname, '../../capture/lab/B-lifecycle/10-trace.tsv'), 'utf8').trim().split('\n').map(line => line.split('\t'));
const first = Number(trace.find(row => row[1] === 'call-1')[3]);
const running = JSON.parse(fs.readFileSync(path.join(__dirname, '../../capture/lab/B-lifecycle/12-actor-running.json'), 'utf8'));
const workerIp = running.status.workerAssignment.workerPodIps[0];
const warm = trace.filter(row => /^call-[2-5]$/.test(row[1])).map(row => Number(row[3])).sort((a, b) => a - b);
const typical = (warm[1] + warm[2]) / 2;
const log = fs.readFileSync(path.join(__dirname, '../../capture/lab/B-lifecycle/27-lifecycle.log'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
const stamp = text => Date.parse(text.slice(0, 23) + 'Z') / 1000 + Number('0.000' + text.slice(23).replace('Z', ''));
const restoring = log.find(line => line.message === 'Actor restoring');
const restored = log.find(line => line.message === 'Actor restored' && line.span_id === restoring.span_id);
const restore = stamp(restored.time) - stamp(restoring.time);

const BASE = 68;
const lanes = [
  { title: 'curl', sub: '客户端', hue: 'olive', draw: (f, x) => flat.terminal(f, x, BASE - 34, 'olive') },
  { title: 'kubectl ate', sub: 'proxy actor', hue: 'olive', draw: (f, x) => flat.unit(f, x, BASE - 42, 'olive', { w: 40, h: 42, mark: 'kubernetes' }) },
  { title: 'atenet-router', sub: '数据平面', hue: 'indigo', draw: (f, x) => flat.gateway(f, x, BASE - 40, 'indigo', { mark: 'envoy' }) },
  { title: 'ate-api-server', sub: '控制平面', hue: 'blue', draw: (f, x) => flat.tower(f, x, BASE - 48, 'blue', { mark: 'substrate' }) },
  { title: 'Postgres', sub: 'actor 行', hue: 'teal', draw: (f, x) => flat.cylinder(f, x, BASE - 58, 'teal', { mark: 'postgresql' }) },
  {
    title: 'worker pod',
    sub: 'my-counter-1',
    hue: 'violet',
    draw: (f, x) => {
      flat.frame(f, x, BASE - 48, 'violet', { w: 64, h: 48 });
      flat.shell(f, x, BASE - 42, 'violet', { w: 56, h: 38, mark: 'gvisor', zone: 22 });
      flat.stack(f, x + 12, BASE - 36, 'green', { w: 24, h: 26 });
    },
  },
];
const cx = index => 60 + index * 104;
const TOP = 136;

const rows = [
  [0, 1, 'call', 'POST localhost:8000/', null],
  [1, 2, 'event', 'mTLS CONNECT 到端口 8444', '经 kube-apiserver 端口转发'],
  [2, 3, 'call', 'ResumeActor', '每次请求均发送'],
  [3, 4, 'call', '读取 actor 行', 'ACTOR_STATE_SUSPENDED'],
  [3, 4, 'write', '获取租约，绑定 worker', null],
  [3, 5, 'state', 'atelet 恢复黄金快照', `SUSPENDED 到 RUNNING，后续恢复 ${restore.toFixed(2)} s`],
  [3, 2, 'reply', `worker ${workerIp}`, '附带其 SPIFFE ID'],
  [2, 5, 'event', 'CONNECT 到端口 8443', '再转至 actor 端口 80'],
  [1, 0, 'reply', '200, count: 1', `客户端耗时 ${first.toFixed(3)} s`],
];

module.exports = figure('fig-1-2', {
  height: 576,
  title: '发往 my-counter-1 的首次请求',
  desc: `六条生命线，各自上方绘有对应组件图标：终端 curl、带 Kubernetes 标志的 kubectl ate proxy actor、带 Envoy 标志的网关 atenet-router、带 Agent Substrate 标志的服务端 ate-api-server、带标志的圆柱体 Postgres，以及容纳 gVisor 沙箱与 actor 的 worker pod。九步交互：curl 向 127.0.0.1:8000 发送 POST，代理由 kube-apiserver 端口转发向路由器端口 8444 建立 mTLS CONNECT，路由器调用 ResumeActor，ate-api-server 读取 actor 行发现其已挂起，获取租约并绑定 worker，让 atelet 恢复黄金快照使 actor 从 SUSPENDED 变为 RUNNING，再向路由器返回 worker ${workerIp}。路由器向 worker 端口 8443 建立 CONNECT，curl 在 ${first.toFixed(3)} s 后收到带 count 1 的 200。第 5、6 步标为琥珀色，因为仅当 actor 处于挂起态时发生。同一 actor 后续恢复耗时 ${restore.toFixed(2)} s，发往运行中 actor 的请求耗时 ${typical.toFixed(3)} s。`,
}, f => {
  lanes.forEach((lane, index) => {
    lane.draw(f, cx(index));
    f.text(cx(index), BASE + 16, lane.title, { size: 11, weight: 700, hue: lane.hue, anchor: 'middle' });
    f.text(cx(index), BASE + 30, lane.sub, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
    f.lifeline(cx(index), BASE + 36, 544);
  });
  rows.forEach(([from, to, style, label, note], index) => {
    const y = TOP + index * 46;
    f.beat(index + 1);
    f.step(16, y, index + 1, { hue: index === 4 || index === 5 ? 'amber' : 'ink' });
    const x1 = cx(from);
    const x2 = cx(to);
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note: note || undefined });
  });
  f.beat(0);
  f.step(16, 560, 5, { hue: 'amber' });
  f.step(38, 560, 6, { hue: 'amber' });
  f.text(54, 564, `仅在 actor 挂起时执行。运行中 actor 会跳过这两步，${typical.toFixed(3)} s 返回。`, { size: 11, serif: true, hue: 'ink-soft', knock: true });
});
