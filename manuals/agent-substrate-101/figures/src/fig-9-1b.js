'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const run = load(path.join(__dirname, '../../capture/lab/summary/demos-x86.json')).idle_suspender;
const END = 600;
const X0 = 136;
const X1 = 616;
const px = t => X0 + (Math.min(Math.max(t, 0), END) / END) * (X1 - X0);
const actors = ['busy', 'bursty', 'rare'];
const requests = run.requests.filter(request => request.t <= END);
const suspends = run.suspends.filter(suspend => suspend.t <= END);
const spans = name => {
  const out = [];
  let start = null;
  const events = [
    ...requests.filter(r => r.actor === name && r.kind === 'resumed').map(r => ({ t: r.t - r.seconds, on: true })),
    ...suspends.filter(s => s.actor === name).map(s => ({ t: s.t, on: false })),
  ].sort((a, b) => a.t - b.t);
  for (const event of events) {
    if (event.on && start === null) start = event.t;
    if (!event.on && start !== null) { out.push([start, event.t]); start = null; }
  }
  if (start !== null) out.push([start, END]);
  return out;
};
const one = run.capacity.filter(sample => sample.t <= END && sample.millicores === 1000).length;
const samples = run.capacity.filter(sample => sample.t <= END).length;

module.exports = figure('fig-9-1b', {
  height: 326,
  title: '三个 actor 在十分钟内共享两个槽位',
  desc: `第二台 x86 服务器客户机上 ${END} 秒的运行时间线。该 worker 仅可同时容纳两个各占 1 核 CPU 的 actor。actor busy 每 5 秒收到一次请求并全程保持运行；actor bursty 每 150 秒收到五次突发请求，挂起器在每次空闲满 30 秒后将其挂起（共 ${suspends.filter(s => s.actor === 'bursty').length} 次）；actor rare 共收到两次请求并被挂起 ${suspends.filter(s => s.actor === 'rare').length} 次。全部 ${requests.length} 个请求均返回 200。在 ${samples} 次容量采样中，有 ${one} 次占用 1 核 CPU，其余占用 2 核 CPU。`,
}, f => {
  const top = 40;
  f.text(16, top + 16, '已占用 CPU', { size: 12, weight: 700 });
  f.text(16, top + 31, '共 2 核 CPU', { size: 11, serif: true, hue: 'ink-soft' });
  const cap = run.capacity.filter(sample => sample.t <= END);
  cap.forEach((sample, index) => {
    const next = index + 1 < cap.length ? cap[index + 1].t : END;
    const h = sample.millicores / 2000 * 30;
    f.rect(px(sample.t), top + 34 - h, px(next) - px(sample.t), h, { fill: color('violet-fill'), stroke: 'none' });
  });
  f.rule(X0, top + 34, X1, top + 34, { hue: 'violet' });
  f.rule(X0, top + 4, X1, top + 4, { hue: 'violet', dash: 'dashed', opacity: 0.6 });
  f.text(X1, top - 4, '2 核 CPU，worker 池满载', { size: 11, hue: 'violet', anchor: 'end' });

  actors.forEach((name, index) => {
    const y = 108 + index * 48;
    f.text(16, y + 12, name, { size: 12, weight: 700 });
    f.text(16, y + 27, `${requests.filter(r => r.actor === name).length} 个请求`, { size: 11, serif: true, hue: 'ink-soft' });
    f.rule(X0, y + 8, X1, y + 8, { hue: 'ink-mute', opacity: 0.3 });
    for (const [a, b] of spans(name)) f.rect(px(a), y, px(b) - px(a), 16, { fill: color('green-fill'), stroke: color('green-ink') });
    for (const r of requests.filter(q => q.actor === name)) f.dot(px(r.t), y + 8, { hue: r.kind === 'resumed' ? 'ink' : 'green', r: r.kind === 'resumed' ? 2.6 : 1.3 });
    for (const s of suspends.filter(q => q.actor === name)) f.rule(px(s.t), y - 5, px(s.t), y + 21, { hue: 'amber', width: 2 });
  });
  const axis = 258;
  f.rule(X0, axis, X1, axis, { hue: 'ink' });
  for (let t = 0; t <= END; t += 60) {
    f.rule(px(t), axis, px(t), axis + 5, { hue: 'ink' });
    f.text(px(t), axis + 18, String(t / 60), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text((X0 + X1) / 2, axis + 36, '自首个请求起算的分钟数', { size: 11.5, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.rule(X0, axis + 50, X0, axis + 62, { hue: 'amber', width: 2 });
  f.text(X0 + 8, axis + 60, '空闲 30 秒后挂起', { size: 11, hue: 'amber' });
  f.dot(X0 + 250, axis + 56, { hue: 'ink', r: 2.6 });
  f.text(X0 + 258, axis + 60, '触发 actor 恢复的请求', { size: 11 });
});
