'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const text = fs.readFileSync(path.join(__dirname, '../../capture/lab/internals/05-streaming/trace.txt'), 'utf8');
const partA = text.slice(text.indexOf('# A.'), text.indexOf('# C.'));
const items = [...partA.matchAll(/^\s+([\d.]+) ms\s+(\w+)\s+(.*)$/gm)].map(m => ({ t: Number(m[1]), mode: m[2], rest: m[3] }));
const MODES = ['tasks', 'messages', 'custom', 'updates', 'values', 'checkpoints', 'debug'];
for (const mode of MODES) if (!items.some(i => i.mode === mode)) throw new Error(`fig-2-5: no ${mode} item`);

const starts = items.filter(i => i.mode === 'tasks' && i.rest.startsWith('start'));
const valuesAt = items.filter(i => i.mode === 'values');
const bands = starts.map(s => ({ name: s.rest.split(' ')[1], from: s.t, to: valuesAt.find(v => v.t > s.t).t }));
const HUE = { tasks: 'amber', messages: 'plum', custom: 'green', updates: 'indigo', values: 'indigo', checkpoints: 'teal', debug: 'ink-soft' };
const counts = Object.fromEntries(MODES.map(m => [m, items.filter(i => i.mode === m).length]));
const last = Math.max(...items.map(i => i.t));
const firstText = items.find(i => i.mode === 'messages' && /text='[^']+'/.test(i.rest) && i.t > bands[2].from);

const SEGS = [
  { a: 0, b: 8, x: 126, w: 70, step: 4 },
  { a: 1893, b: 1901.4, x: 214, w: 170, step: 2 },
  { a: 2600, b: Math.ceil(last / 100) * 100 + 20, x: 402, w: 196, step: 200 },
];
const X = t => {
  const s = SEGS.find(g => t >= g.a && t <= g.b);
  if (!s) throw new Error(`fig-2-5: ${t} ms falls in an axis break`);
  return s.x + ((t - s.a) / (s.b - s.a)) * s.w;
};
const RY = 70;
const RH = 28;

module.exports = figure('fig-2-5', {
  height: 440,
  title: '一次 agent 运行中各个流模式在何处产生',
  desc: `七行，每个流模式一行，时间轴以毫秒计，对应 x86 服务器虚拟机上用 Qwen3 4B 的一次 create_agent 运行，所有模式全开，版本 v2。时间轴有三段放大区间，之间有断口：开头，第一个模型步骤结束与 tools 步骤前后的 1.9 s 附近，以及从 2.6 s 开始的回答。各超步为 ${bands.map(b => `${b.name} 从 ${b.from} 到 ${b.to} ms`).join('，')}。每个刻度是一个条目：${MODES.map(m => `${m} ${counts[m]}`).join('，')}。messages、custom 和 updates 条目在任务运行时或完成时出现。values 条目出现在更新阶段之后。一个步骤的 checkpoints 与 debug 条目出现在下一个超步开始时，与 tasks 的 start 条目一起。回答的 token 从 ${firstText.t} ms 起到达，大约每 67 ms 一个。`,
}, f => {
  f.kicker(20, 30, '流模式');
  bands.forEach(b => {
    SEGS.forEach(s => {
      const a = Math.max(b.from, s.a);
      const z = Math.min(b.to, s.b);
      if (z <= a) return;
      if (b.name === 'tools') f.rect(X(a), RY - 22, X(z) - X(a), MODES.length * RH + 10, { fill: color('code-bg'), stroke: 'none' });
    });
  });
  SEGS.forEach((s, i) => {
    if (i) {
      const bx = s.x - 9;
      f.rule(bx - 3, RY - 22, bx + 3, RY - 26, { hue: 'ink-mute' });
      f.rule(bx - 3, RY + MODES.length * RH - 8, bx + 3, RY + MODES.length * RH - 12, { hue: 'ink-mute' });
    }
  });
  f.text(X(4), RY - 30, '开始', { size: 11, anchor: 'middle', hue: 'ink-soft' });
  f.text(X(1893), RY - 30, 'model 结束', { size: 11, hue: 'plum' });
  f.text(X(1899), RY - 30, 'tools', { size: 11, anchor: 'middle', hue: 'green' });
  f.text(X(2950), RY - 30, 'model 给出回答', { size: 11, anchor: 'middle', hue: 'plum' });
  MODES.forEach((mode, r) => {
    const y = RY + r * RH;
    f.beat(r + 1);
    f.text(20, y + 4, mode, { size: 11.5, hue: HUE[mode] === 'ink-soft' ? 'ink' : HUE[mode] });
    SEGS.forEach(s => f.rule(s.x, y, s.x + s.w, y, { hue: 'ink-mute', opacity: 0.25 }));
    const here = items.filter(i => i.mode === mode);
    const seen = {};
    here.forEach(i => {
      const k = seen[i.t] || 0;
      seen[i.t] = k + 1;
      const x = X(i.t) + k * 3;
      f.rule(x, y - 9, x, y + 9, { hue: HUE[mode], width: 2 });
    });
    f.text(624, y + 4, String(here.length), { size: 11, anchor: 'end', hue: 'ink-soft' });
  });
  const axisY = RY + MODES.length * RH - 6;
  SEGS.forEach(s => {
    for (let t = Math.ceil(s.a / s.step) * s.step; t <= s.b; t += s.step) {
      f.rule(X(t), axisY, X(t), axisY + 4, { hue: 'ink' });
      f.text(X(t), axisY + 18, String(t), { size: 11, anchor: 'middle', hue: 'ink-soft' });
    }
  });
  f.text(20, axisY + 18, '毫秒', { size: 11, hue: 'ink-soft' });

  f.beat(8);
  const tool = bands.find(b => b.name === 'tools');
  const upd = items.find(i => i.mode === 'updates' && i.t > tool.from);
  const val = items.find(i => i.mode === 'values' && i.t > tool.from);
  const ck = items.find(i => i.mode === 'checkpoints' && i.t >= val.t);
  const cus = items.find(i => i.mode === 'custom');
  const yOf = m => RY + MODES.indexOf(m) * RH;
  const marks = [
    [X(cus.t) - 16, yOf('custom') - 14, 1],
    [X(upd.t) - 16, yOf('updates') - 14, 2],
    [X(val.t) + 16, yOf('values') - 14, 3],
    [X(ck.t) + 16, yOf('checkpoints') - 14, 4],
  ];
  marks.forEach(([x, y, n]) => f.step(x, y, n));

  f.beat(0);
  const notes = [
    [1, `custom：工具在 ${cus.t} ms 调用 stream_writer，位于 tools 任务内部`],
    [2, `updates：tools 任务在 ${upd.t} ms 完成，它的写入立即发出`],
    [3, `values：在该超步的更新阶段之后，${val.t} ms`],
    [4, `checkpoints：下一个超步规划时发出，${ck.t} ms`],
  ];
  notes.forEach(([n, line], k) => {
    const y = axisY + 46 + k * 22;
    f.step(30, y, n);
    f.text(46, y + 4, line, { size: 11, serif: true, hue: 'ink-soft' });
  });
});
