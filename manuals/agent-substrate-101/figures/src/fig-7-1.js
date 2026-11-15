'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');
const { flat } = require('../../../_shared/forms.js');

const lab = path.join(__dirname, '../../capture/lab');
const summary = load(path.join(lab, 'summary/kagent-turns-x86.json'));
const TURN = 'A-spaced-02';
const rows = rel => fs.readFileSync(path.join(lab, rel), 'utf8').split('\n').filter(Boolean).map(line => line.split('\t'));
const stamp = text => {
  const [head, frac = ''] = text.replace(/Z$/, '').split('.');
  return Date.parse(`${head}Z`) / 1000 + Number(`0.${frac || 0}`);
};

const client = rows('K-kagent/latency/timings.tsv').find(row => row[1] === TURN);
const server = rows('K-kagent/latency/server-times.tsv').find(row => row[0] === `${TURN}.json`);
const answered = stamp(client[0]);
const sent = answered - Number(client[3]);
const recorded = stamp(server[1]);
const completed = stamp(server[2]);
const changes = rows('K-kagent/logs/actor-state-changes.tsv')
  .filter(row => row[1] === `session-${client[2]}`)
  .map(row => ({ t: stamp(row[0]), state: row[3] }))
  .filter(change => change.t > recorded && change.t < answered + 1);
const at = state => changes.find(change => change.state === state).t;
const plus = t => `+${(t - sent).toFixed(2)} s`;
const span = (a, b) => `${(b - a).toFixed(2)} s`;

const BASE = 58;
const lanes = [
  { x: 142, name: '客户端', sub: 'kagent CLI', hue: 'olive', draw: (f, x) => flat.terminal(f, x, BASE - 34, 'olive') },
  { x: 252, name: 'kagent', sub: 'controller :8083', hue: 'plum', draw: (f, x) => flat.tower(f, x, BASE - 48, 'plum', { mark: 'kagent' }) },
  { x: 362, name: 'atenet-router', sub: 'agentgateway', hue: 'indigo', draw: (f, x) => flat.gateway(f, x, BASE - 44, 'indigo', { h: 44, mark: 'agentgateway' }) },
  { x: 472, name: 'ate-api-server', sub: 'ate-system', hue: 'blue', draw: (f, x) => flat.tower(f, x, BASE - 48, 'blue', { mark: 'substrate' }) },
  { x: 582, name: 'actor', sub: 'session-<uuid>', hue: 'green', draw: (f, x) => flat.stack(f, x, BASE - 38, 'green', { w: 42, h: 38 }) },
];
const steps = [
  { t: sent, from: 0, to: 1, style: 'call', label: '消息', note: 'A2A，带 Session ID' },
  { t: recorded, from: 1, to: 2, style: 'call', label: 'ate-target-actor', note: 'mTLS，端口 443' },
  { t: at('resuming'), from: 2, to: 3, style: 'call', label: 'ResumeActor', note: '路由器发起请求' },
  { t: at('running'), from: 3, to: 4, style: 'state', label: 'RUNNING', note: `${span(at('resuming'), at('running'))} 完成恢复`, bold: true },
  { from: 2, to: 4, style: 'call', label: '执行轮次', note: '发往 actor 端口 80 的 gRPC' },
  { t: completed, from: 4, to: 1, style: 'reply', label: 'TASK_STATE_COMPLETED', note: `轮次运行 ${span(at('running'), completed)}` },
  { t: at('suspending'), from: 1, to: 3, style: 'call', label: 'SuspendActor', note: '同步挂起，仅文件快照' },
  { t: answered, from: 1, to: 0, style: 'reply', label: '响应结果', note: `客户端耗时 ${span(sent, answered)}` },
  { t: at('suspended'), from: 3, to: 4, style: 'state', label: 'SUSPENDED', note: `${span(at('suspending'), at('suspended'))} 完成挂起`, bold: true },
];
const ROW = 42;
const FIRST = 134;
const END = FIRST + (steps.length - 1) * ROW + 30;

module.exports = figure('fig-7-1', {
  height: END + 46,
  title: '一次录制的 kagent 轮次：恢复会话 actor、运行并再次挂起',
  desc: `五条生命线，各自上方绘有组件图标：终端客户端、带 kagent 标志的 kagent controller、带 agentgateway 标志的网关 atenet-router、带 Agent Substrate 标志的 ate-api-server 以及三层结构的 actor session-uuid。九步交互给出从客户端发送消息起算的时间戳：路由器调用 ResumeActor，${span(at('resuming'), at('running'))} 后 actor 进入 RUNNING；轮次执行完成；kagent 调用同步 SuspendActor，客户端在 ${span(sent, answered)} 后拿到回答，actor 在 ${span(sent, at('suspended'))} 后回到 SUSPENDED。`,
}, f => {
  f.kicker(30, BASE + 30, '时间', { hue: 'ink-mute' });
  for (const lane of lanes) {
    lane.draw(f, lane.x);
    f.text(lane.x, BASE + 16, lane.name, { size: 11, weight: 700, hue: lane.hue, anchor: 'middle' });
    f.text(lane.x, BASE + 30, lane.sub, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
    f.lifeline(lane.x, BASE + 36, END);
  }
  steps.forEach((step, index) => {
    const y = FIRST + index * ROW;
    f.step(14, y, index + 1, { hue: step.style === 'state' ? 'amber' : 'ink' });
    if (step.t !== undefined) f.text(30, y + 4, plus(step.t), { size: 11, hue: step.style === 'state' ? 'amber' : 'ink-soft', weight: step.bold ? 700 : undefined });
    const x1 = lanes[step.from].x;
    const x2 = lanes[step.to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style: step.style, label: step.label, note: step.note, labelX: (x1 + x2) / 2, bold: step.bold });
  });
  f.text(20, END + 18, `98 个录制轮次中的一次。全部轮次的恢复耗时中位数为 ${summary.resume_seconds.turns_only.median.toFixed(3)} s，`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, END + 34, `挂起耗时中位数为 ${summary.suspend_seconds.median.toFixed(3)} s。模型使用模拟服务。`, { size: 11, serif: true, hue: 'ink-soft' });
});
