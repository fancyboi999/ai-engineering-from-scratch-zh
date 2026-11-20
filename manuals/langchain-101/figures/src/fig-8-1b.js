'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/agent-server-x86.json'));
const X0 = 150;
const SCALE = 64;
const px = t => X0 + t * SCALE;
const order = ['reject', 'enqueue', 'interrupt', 'rollback'];
const notes = {
  reject: 'B 被拒绝，HTTP 409',
  enqueue: 'B 等 A 结束后再运行',
  interrupt: 'A 被中断，其节点丢失',
  rollback: 'A 被删除，B 单独运行',
};

function spans(events, label) {
  const out = [];
  for (const node of ['first', 'second']) {
    const start = events.find(e => e.label === label && e.ev === `${node}_start`);
    if (!start) continue;
    const end = events.find(e => e.label === label && e.ev === `${node}_end`);
    out.push({ node, start: start.dt, end: end ? end.dt : null });
  }
  return out;
}

module.exports = figure('fig-8-1b', {
  height: 396,
  title: '各 multitask 策略下运行 A 与运行 B 的节点',
  desc: '时间轴 0 到 7 秒上的四条轨道，每条是 x86 服务器虚拟机上 langgraph dev 下的一个线程。运行 A 运行两个各 2 s 的节点，运行 B 约 1 s 后在同一线程上发出，运行两个各 1 s 的节点。reject 下，B 被以 HTTP 409 拒绝，A 完成。enqueue 下，B 在 A 于 4.8 s 结束时开始。interrupt 下，B 在 1.0 s 开始，A 的第一个节点永远没有完成。rollback 下，A 的第一个节点在 B 发出前刚好开始，B 在 1.0 s 开始，A 被删除。',
}, f => {
  const LANE = 136;
  f.rule(px(1.0), 30, px(1.0), 318, { hue: 'rose', dash: 'dashed', width: 1.4 });
  f.text(px(1.0), 22, '运行 B 发出', { size: 11, hue: 'rose', anchor: 'middle', weight: 700 });
  order.forEach((strategy, i) => {
    const row = data.double_texting.find(r => r.strategy === strategy);
    const y = 46 + i * 70;
    f.beat(i + 1);
    f.kicker(20, y, strategy);
    f.text(20, y + 16, notes[strategy], { size: 11, serif: true, hue: 'ink-soft' });
    f.text(LANE, y + 34, 'A', { size: 11, weight: 700, anchor: 'end', hue: 'amber' });
    f.text(LANE, y + 54, 'B', { size: 11, weight: 700, anchor: 'end', hue: 'amber' });
    f.rule(px(0), y + 30, px(7), y + 30, { opacity: 0.25 });
    f.rule(px(0), y + 50, px(7), y + 50, { opacity: 0.25 });
    for (const s of spans(row.node_events, `${strategy}-A`)) {
      if (s.end === null) {
        const w = Math.max(px(1.0) - px(s.start), 8);
        f.rect(px(s.start), y + 22, w, 16, { fill: 'none', stroke: color('rose-ink'), dash: 'dashed' });
        f.text(Math.max(px(1.0), px(s.start) + w) + 10, y + 34, `A 的 ${s.node} 节点从未写入`, { size: 11, hue: 'rose', knock: true });
      } else {
        f.rect(px(s.start), y + 22, px(s.end) - px(s.start) - 2, 16, { fill: color('amber-ink'), stroke: 'none' });
        f.text((px(s.start) + px(s.end)) / 2, y + 34, s.node, { size: 11, hue: 'paper', anchor: 'middle' });
      }
    }
    if (strategy === 'reject') f.text(px(1.0) + 6, y + 54, '409，没有运行', { size: 11, hue: 'rose', knock: true });
    for (const s of spans(row.node_events, `${strategy}-B`)) {
      f.rect(px(s.start), y + 42, px(s.end) - px(s.start) - 2, 16, { fill: color('amber-fill'), stroke: color('amber-ink') });
      f.text((px(s.start) + px(s.end)) / 2, y + 54, s.node, { size: 11, hue: 'amber', anchor: 'middle' });
    }
  });
  f.beat(0);
  f.rule(px(0), 326, px(7), 326, { hue: 'ink' });
  for (let t = 0; t <= 7; t += 1) {
    f.rule(px(t), 322, px(t), 330, { hue: 'ink' });
    f.text(px(t), 344, `${t} s`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(20, 370, 'A 行：运行 A 的节点，实心。B 行：运行 B 的节点，空心。玫红虚线：开始了', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 386, '却从未写入的 A 节点。时间来自节点事件，各运行一次。', { size: 11, serif: true, hue: 'ink-soft' });
});
