'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const events = fs.readFileSync(path.join(__dirname, '../../capture/lab/internals/01-superstep/trace.jsonl'), 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));

const steps = [];
let current = null;
for (const e of events) {
  if (e.event === 'prepare_next_tasks' && e.for_execution) {
    current = { step: e.step, tasks: e.tasks, seen: e.versions_seen, changed: {}, written: new Set() };
    steps.push(current);
  } else if (e.event === 'apply_writes' && current) {
    current.changed = e.versions_changed;
    for (const w of e.writes_in_apply_order) current.written.add(w.channel);
  }
}
if (steps.length !== 6) throw new Error(`fig-2-1: expected 6 planned steps, got ${steps.length}`);

const CHANNELS = ['__start__', 'messages', 'branch:to:model', '__pregel_tasks'];
const versions = {};
for (const s of steps) {
  s.after = {};
  for (const ch of CHANNELS) {
    if (s.changed[ch]) versions[ch] = s.changed[ch][1];
    s.after[ch] = versions[ch];
  }
}
const seenModel = steps.map(s => (s.seen.model ? s.seen.model['branch:to:model'] : null));
const trig = steps[4].after['branch:to:model'];
const last = steps[5];
const lastBranch = last.step === 4 ? steps[4].after['branch:to:model'] : null;

const X0 = 150;
const CW = 78;
const colX = i => X0 + i * CW;
const TASK_Y = 40;
const ROW_Y = 104;
const RH = 30;
const rowY = r => ROW_Y + r * RH;

const label = t => {
  if (t.kind === '__pregel_push') return `${t.name}[${/\d+/.exec(t.path)[0]}]`;
  return t.name;
};

module.exports = figure('fig-2-1', {
  height: 430,
  title: '一次 create_agent 运行的六个超步及通道版本',
  desc: `一张网格，列出一次含两次工具调用的 create_agent 运行中规划的 ${steps.length} 个超步，从输入步 ${steps[0].step} 到找不到任务的步 ${last.step}。最上一行是各步规划的任务：__start__、model、tools 的两个 PUSH 任务、再一次 model，以及无任务。下面四行给出每步之后 __start__、messages、branch:to:model 和 __pregel_tasks 的版本。实心格表示该步写入的通道，虚线格表示被读取方清空并换了新版本的通道，灰色数字表示沿用的版本。同一步中变化的通道得到相同的版本号。琥珀色箭头从触发任务的通道版本指向下一步里的该任务。最后一行是 model 已经见过的 branch:to:model 版本。在第 ${last.step} 步，通道版本为 ${lastBranch}，model 见过的是 ${seenModel[5]}，但通道为空，所以没有任务运行。`,
}, f => {
  f.kicker(20, 22, '超步');
  steps.forEach((s, i) => {
    f.text(colX(i) + 35, 22, String(s.step), { size: 12, weight: 700, anchor: 'middle', hue: 'amber' });
  });
  f.text(20, TASK_Y + 16, '规划的任务', { size: 11.5, hue: 'amber' });
  f.text(20, TASK_Y + 32, 'PULL 或 PUSH', { size: 11, serif: true, hue: 'ink-soft' });
  CHANNELS.forEach((ch, r) => f.text(20, rowY(r) + 19, ch, { size: 11.5, hue: 'indigo' }));
  f.text(20, rowY(4) + 15, 'model 已见过', { size: 11.5, hue: 'ink-soft' });
  f.text(20, rowY(4) + 29, 'branch:to:model', { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(16, ROW_Y - 10, 620, ROW_Y - 10, { hue: 'ink-mute', opacity: 0.4 });
  f.rule(16, rowY(4) - 4, 620, rowY(4) - 4, { hue: 'ink-mute', opacity: 0.4 });

  const tagPos = {};
  steps.forEach((s, i) => {
    f.beat(i + 1);
    const x = colX(i);
    if (i === 0) {
      f.box({ x: x + 2, y: TASK_Y + 4, w: 66, h: 22, hue: 'violet', title: '输入', titleSize: 11, weight: 400, pad: 3 });
    } else if (!s.tasks.length) {
      f.text(x + 35, TASK_Y + 19, '无', { size: 11, anchor: 'middle', hue: 'ink-mute' });
    } else {
      s.tasks.forEach((t, k) => {
        const y = TASK_Y + 4 + k * 24;
        const push = t.kind === '__pregel_push';
        f.box({ x: x + 2, y, w: 66, h: 22, hue: 'amber', title: label(t), titleSize: 11, weight: 400, pad: 3, dash: push ? 'dashed' : undefined });
        tagPos[`${i}:${k}`] = [x + 2, y + 11];
      });
    }
    CHANNELS.forEach((ch, r) => {
      const y = rowY(r);
      const v = s.after[ch];
      if (v === undefined) return;
      if (s.changed[ch]) {
        const written = s.written.has(ch) || (i === 0 && ch === '__start__');
        f.rect(x + 4, y + 4, 62, 22, written ? { hue: 'indigo' } : { fill: color('paper'), stroke: color('indigo-ink'), dash: 'dashed' });
        f.text(x + 35, y + 19, `v${v}`, { size: 11.5, anchor: 'middle', weight: 700, hue: 'indigo' });
      } else {
        f.text(x + 35, y + 19, `v${v}`, { size: 11, anchor: 'middle', hue: 'ink-mute' });
      }
    });
    const seen = seenModel[i];
    f.text(x + 35, rowY(4) + 22, seen === null ? '-' : `v${seen}`, { size: 11.5, anchor: 'middle', hue: seen === null ? 'ink-mute' : 'amber' });
  });

  const triggers = [
    [0, '__start__', 1],
    [1, 'branch:to:model', 2],
    [2, '__pregel_tasks', 3],
    [3, 'branch:to:model', 4],
  ];
  triggers.forEach(([from, ch, to], n) => {
    f.beat(to + 1);
    const r = CHANNELS.indexOf(ch);
    const sx = colX(from) + 66;
    const sy = rowY(r) + 15;
    const gx = colX(to) - 3;
    const tag = tagPos[`${to}:0`];
    f.path(`M${sx} ${sy} H${gx} V${tag[1]} H${tag[0] - 1}`, { style: 'state' });
  });

  f.beat(6);
  const x4 = colX(5);
  f.rect(x4 + 4, rowY(2) + 4, 62, 22, { fill: 'none', stroke: color('rose-ink'), dash: 'dashed' });

  f.beat(0);
  const NY = 300;
  const notes = [
    [colX(2) + 35, 1, `第 ${steps[2].step} 步：messages、__pregel_tasks 和 branch:to:model 都得到 v${steps[2].after.messages}`],
    [colX(4) + 35, 2, `第 ${steps[4].step} 步：branch:to:model 的 v${steps[3].after['branch:to:model']} 比已见过的 v${seenModel[3]} 新，所以 model 运行`],
    [colX(5) + 35, 3, `第 ${last.step} 步：v${lastBranch} 比已见过的 v${seenModel[5]} 新，但通道为空：没有任务`],
  ];
  notes.forEach(([cx, n, text], k) => {
    const y = NY + k * 22;
    f.step(cx, rowY(4) + 44, n, { hue: 'amber' });
    f.step(30, y, n, { hue: 'amber' });
    f.text(46, y + 4, text, { size: 11, serif: true, hue: 'ink-soft' });
  });
  const ky = 384;
  f.rect(20, ky - 11, 22, 14, { hue: 'indigo' });
  f.text(48, ky, '已写入，新版本', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(200, ky - 11, 22, 14, { fill: color('paper'), stroke: color('indigo-ink'), dash: 'dashed' });
  f.text(228, ky, '已读取并清空，新版本', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(20, ky + 9, 22, 14, { hue: 'amber', dash: 'dashed' });
  f.text(48, ky + 20, '由 Send 产生的 PUSH 任务', { size: 11, serif: true, hue: 'ink-soft' });
  f.path(`M200 ${ky + 16} H222`, { style: 'state', packet: false });
  f.text(228, ky + 20, '触发下一个任务的版本', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ky + 40, '灰色数字：沿用的版本', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(330, ky + 29, 22, 14, { fill: 'none', stroke: color('rose-ink'), dash: 'dashed' });
  f.text(358, ky + 40, '空通道，不触发任何任务', { size: 11, serif: true, hue: 'ink-soft' });
});
