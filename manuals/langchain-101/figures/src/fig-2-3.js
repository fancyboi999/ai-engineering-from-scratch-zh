'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const events = fs.readFileSync(path.join(__dirname, '../../capture/lab/internals/03-checkpoint/a_sync.trace.jsonl'), 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));

const done = events.filter(e => e.event === 'loop.put_writes');
const puts = events.filter(e => e.event === 'saver.put');
const writes = events.filter(e => e.event === 'saver.put_writes');
const ticks = events.filter(e => e.event === 'tick');
const steps = [...new Set(done.map(d => d.step))];
const panels = steps.map(step => {
  const tasks = done.filter(d => d.step === step).map(d => {
    const w = writes.find(x => x.task_id === d.task_id);
    if (!w) throw new Error(`fig-2-3: no put_writes for ${d.task_id}`);
    return { name: d.task, id: d.task_id, back: d.t_ms, durable: w.t_ms, start: w.t_ms - w.dt_us / 1000 };
  });
  const t0 = Math.min(...tasks.map(t => t.back));
  const put = puts.find(p => p.step === step);
  const extra = step === 0 ? puts.find(p => p.step === -1) : null;
  const next = ticks.find(t => t.step === step + 1);
  return { step, tasks, t0, put, extra, next };
});
const waits = panels.flatMap(p => p.tasks.map(t => t.durable - t.back));
const lo = Math.min(...waits);
const hi = Math.max(...waits);
const late = panels.find(p => p.tasks.some(t => t.durable > p.put.t_ms));
const gapS = i => (panels[i + 1].t0 - panels[i].t0) / 1000;

const PW = 126;
const PG = 16;
const PX0 = 62;
const SPAN = 7;
const LOOP_Y = 96;
const SAVER_Y = 160;
const fmt = v => v.toFixed(1);

module.exports = figure('fig-2-3', {
  height: 400,
  title: '一次 sync 运行中，每个完成的任务要等多久才完成 put_writes',
  desc: `四个面板，对应一次 create_agent 运行（Qwen3 4B，持久性模式 sync，使用 x86 服务器虚拟机上的 SqliteSaver）的四个超步。每个面板覆盖该步第一个任务返回之后的 ${SPAN} ms。上方泳道是循环：每个返回的任务一个点，下一个超步开始处一条琥珀线。下方泳道是后台 saver：实心块是保存检查点的 put 调用，空心块是保存单个任务写入的 put_writes 调用。玫红色条带从每个任务返回时起，到它的 put_writes 结束止。这些时间跨度为 ${fmt(lo)} 到 ${fmt(hi)} ms，是在一台负载较高的虚拟机上的一次运行。在第 ${late.step} 步，检查点的 put 先于任务 ${late.tasks[0].id} 的 put_writes 结束。面板之间是模型运行的数秒。`,
}, f => {
  f.text(20, LOOP_Y + 4, '循环', { size: 12, weight: 700, hue: 'indigo' });
  f.text(20, SAVER_Y + 4, 'saver', { size: 12, weight: 700, hue: 'teal' });
  panels.forEach((p, i) => {
    const x0 = PX0 + i * (PW + PG);
    const X = t => x0 + ((t - p.t0) / SPAN) * PW;
    f.beat(i + 1);
    f.rect(x0, 50, PW, 168, { fill: color('code-bg'), stroke: 'none' });
    f.text(x0 + PW / 2, 42, `第 ${p.step} 步`, { size: 11.5, anchor: 'middle', hue: 'amber', weight: 700 });
    f.rule(x0, LOOP_Y, x0 + PW, LOOP_Y, { hue: 'indigo', opacity: 0.5 });
    f.rule(x0, SAVER_Y, x0 + PW, SAVER_Y, { hue: 'teal', opacity: 0.5 });
    p.tasks.forEach((t, k) => {
      f.dot(X(t.back), LOOP_Y, { hue: 'indigo', r: 3.5 });
      const y = SAVER_Y + 8 + k * 16;
      f.rect(Math.max(x0, X(t.start)), y, X(t.durable) - Math.max(x0, X(t.start)), 10, { fill: color('paper'), stroke: color('teal-ink') });
      f.rect(X(t.back), y + 12, X(t.durable) - X(t.back), 3, { fill: color('rose-ink'), stroke: 'none' });
    });
    for (const q of [p.put, p.extra].filter(Boolean)) {
      const a = Math.max(x0, X(q.t_ms - q.dt_us / 1000));
      if (X(q.t_ms) <= x0 + PW) f.rect(a, SAVER_Y - 18, X(q.t_ms) - a, 12, { hue: 'teal' });
    }
    if (p.next && X(p.next.t_ms) <= x0 + PW) f.rule(X(p.next.t_ms), 74, X(p.next.t_ms), 214, { hue: 'amber', width: 1.6 });
    for (let t = 0; t <= SPAN; t += 2) {
      f.rule(X(p.t0 + t), 218, X(p.t0 + t), 222, { hue: 'ink' });
      f.text(X(p.t0 + t), 236, String(t), { size: 11, anchor: 'middle', hue: 'ink-soft' });
    }
    f.text(x0 + PW / 2, 66, p.tasks.map(t => t.name.replace(/^__start__$/, '开始')).join(', '), { size: 11, anchor: 'middle', hue: 'ink-soft' });
    if (i < panels.length - 1) {
      const nxt = panels[i + 1].tasks[0].name;
      f.text(x0 + PW + PG / 2, 264, `${nxt} ${gapS(i).toFixed(2)} s`, { size: 11, anchor: 'middle', hue: nxt === 'model' ? 'plum' : 'green' });
    }
  });
  f.text(20, 236, '毫秒', { size: 11, hue: 'ink-soft' });

  f.beat(5);
  const li = panels.indexOf(late);
  const lx0 = PX0 + li * (PW + PG);
  const LX = t => lx0 + ((t - late.t0) / SPAN) * PW;
  f.step(LX(late.put.t_ms) - 14, SAVER_Y - 32, 1);
  f.step(LX(late.tasks[0].durable) + 12, SAVER_Y + 34, 2, { hue: 'rose' });

  f.beat(0);
  const notes = [
    [1, 'ink', `第 ${late.step} 步：检查点的 put 结束，sync 不再等待，第 ${late.step + 1} 步开始`],
    [2, 'rose', `${late.tasks[0].id} 的 put_writes 在 ${fmt(late.tasks[0].durable - late.put.t_ms)} ms 之后才结束`],
  ];
  notes.forEach(([n, hue, text], k) => {
    const y = 300 + k * 22;
    f.step(30, y, n, { hue });
    f.text(46, y + 4, text, { size: 11, serif: true, hue: 'ink-soft' });
  });
  const ky = 360;
  f.dot(26, ky - 4, { hue: 'indigo', r: 3.5 });
  f.text(36, ky, '任务返回', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(150, ky - 11, 12, 12, { hue: 'teal' });
  f.text(168, ky, 'put', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(214, ky - 11, 12, 12, { fill: color('paper'), stroke: color('teal-ink') });
  f.text(232, ky, 'put_writes', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(320, ky - 6, 16, 3, { fill: color('rose-ink'), stroke: 'none' });
  f.text(342, ky, `尚未持久化，${fmt(lo)} 到 ${fmt(hi)} ms`, { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(26, ky + 10, 26, ky + 24, { hue: 'amber', width: 1.6 });
  f.text(36, ky + 22, '下一个超步开始', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(232, ky + 22, '面板之间：下一个任务及其耗时（秒）', { size: 11, serif: true, hue: 'ink-soft' });
});
