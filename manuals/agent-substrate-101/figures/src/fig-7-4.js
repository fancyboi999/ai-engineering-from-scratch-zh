'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const summary = name => load(path.join(__dirname, '../../capture/lab/summary', name));
const loss = summary('dependency-loss-x86.json').outages.postgres;
const idle = summary('failures-x86.json').idle_watch;
const resume = summary('resume-x86.json').node_local.points;
const kagent = summary('kagent-turns-x86.json');
const running = loss.summary.running;
const failed = Object.entries(running.codes).filter(([code]) => code !== '200').reduce((sum, [, count]) => sum + count, 0);
const at = mib => resume.find(point => point.x === mib).seconds.median.toFixed(2);
const stillRunning = idle.states.ACTOR_STATE_RUNNING === idle.samples_after_last_request;
if (!stillRunning) throw new Error('fig-7-4: the idle watch has a sample that is not RUNNING');
const actors = Math.max(...kagent.parallel_workers.map(sample => sample.actors));
const overhead = (kagent.resume_seconds.turns_only.median + kagent.suspend_seconds.median).toFixed(2);

const questions = [
  { ask: 'agent 是否仅使用 CPU 运行？', proof: 'v1.0.0 中 actor 无法使用 GPU', choice: '每个 agent 独立 pod', why: '调度在 GPU 节点上', hue: 'grey' },
  { ask: 'agent 大部分时间是否处于空闲？', proof: '繁忙 actor 会全天独占 worker', choice: '每个 agent 独立 pod', why: '无法释放任何容量', hue: 'grey' },
  { ask: '状态是否必须跨空闲期保留？', proof: `200 MiB 恢复需 ${at(200)} s，1000 MiB 需 ${at(1000)} s`, choice: '每个会话独立沙箱', why: '无需快照与对象存储', hue: 'grey' },
  { ask: '你能否运维 Postgres？', proof: `Postgres 中断 ${loss.outage_seconds} s：${failed} 个请求失败`, choice: '托管沙箱服务', why: '直接调 API，无需管集群', hue: 'grey' },
  { ask: '是否有组件调用 SuspendActor？', proof: `空闲 ${idle.seconds} s：每次采样仍为 RUNNING`, choice: '先引入 harness', why: 'kagent 会在每轮后挂起', hue: 'plum' },
];
const LEFT = 20;
const WIDE = 356;
const RIGHT = 420;
const TOP = 34;
const TALL = 52;
const PITCH = 76;

module.exports = figure('fig-7-4', {
  height: 500,
  title: '判断 Agent Substrate 是否适用的五个问题',
  desc: `按列排列的五个问题及其背后的事实或实测数据。任一问题回答“否”都直接导向更简单的方案：GPU 节点上的单 agent 独立 pod、普通单 agent 独立 pod、单会话独立沙箱、托管沙箱服务，或先引入 harness。五个问题全答“是”则指向 Agent Substrate：实测单个 worker 可同时运行 ${actors} 个 actor，单个 kagent 轮次的恢复与挂起开销共 ${overhead} 秒。`,
}, f => {
  f.kicker(LEFT, 20, '按此顺序依次判断');
  f.kicker(RIGHT, 20, '首次答“否”时选择');
  questions.forEach((question, index) => {
    const y = TOP + index * PITCH;
    f.rect(LEFT, y, WIDE, TALL, { fill: color('paper'), stroke: color('ink') });
    f.step(LEFT + 22, y + TALL / 2, index + 1);
    f.text(LEFT + 44, y + 22, question.ask, { size: 12.5, weight: 700 });
    f.text(LEFT + 44, y + 40, question.proof, { size: 11, serif: true, hue: 'ink-soft' });
    f.arrow([LEFT + WIDE, y + TALL / 2], [RIGHT - 1, y + TALL / 2], { style: 'call', label: '否' });
    f.box({ x: RIGHT, y: y + 3, w: 200, h: TALL - 6, hue: question.hue, title: question.choice, titleSize: 11.5, sub: question.why, pad: 6 });
    f.arrow([LEFT + 22, y + TALL], [LEFT + 22, y + PITCH - 1], { style: 'call', label: '是' });
  });
  const y = TOP + questions.length * PITCH;
  f.rect(LEFT, y, 600, 76, { hue: 'blue', strokeWidth: 2.4 });
  f.text(LEFT + 20, y + 30, '选择 Agent Substrate', { size: 16, weight: 700, hue: 'blue' });
  f.text(LEFT + 20, y + 50, '在少量 worker pod 上承载大量有状态 actor', { size: 12, serif: true });
  f.text(LEFT + 20, y + 66, `实测单个 worker 同时运行 ${actors} 个 actor，每个 kagent 轮次的恢复与挂起开销为 ${overhead} s`, { size: 11, serif: true, hue: 'ink-soft' });
});
