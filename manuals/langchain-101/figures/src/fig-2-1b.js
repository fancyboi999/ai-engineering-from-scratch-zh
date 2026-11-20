'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const read = name => fs.readFileSync(path.join(__dirname, '../../capture/lab/internals', name), 'utf8');

const channels = read('02-channels/trace.txt');
const orderRuns = [...channels.matchAll(/^slow node=(\w+): finish order \(node, model seconds\)=\[(.*)\]\s+merged list=\[([^\]]*)\]$/gm)].map(m => ({
  label: `${m[1]} 要求 60 个词`,
  finished: [...m[2].matchAll(/\('(\w+)', ([\d.]+)\)/g)].map(x => ({ name: x[1], s: Number(x[2]) })),
  applied: m[3].split(',').map(s => s.trim().replace(/'/g, '')),
  kinds: {},
}));
if (orderRuns.length !== 6) throw new Error('fig-2-1b: expected six finish-order runs');

const send = read('06-send-command/trace.txt');
const partB = send.slice(send.indexOf('## B.'), send.indexOf('## C.'));
const step2 = partB.slice(partB.indexOf('PLAN step=2'));
const finished = [...step2.matchAll(/^\s+done (\w+)\s/gm)].map(m => ({ name: m[1], s: null }));
const update = /UPDATE order=\[([^\]]*)\]/.exec(step2)[1];
const applied = [...update.matchAll(/"(\w+)@\('(__pregel_\w+)'/g)].map(m => ({ name: m[1], kind: m[2] }));
const kinds = Object.fromEntries(applied.map(a => [a.name, a.kind]));
const mixed = { label: 'Command 与 Send', finished, applied: applied.map(a => a.name), kinds };
const runs = [...orderRuns, mixed];
const bFirst = orderRuns.filter(r => r.finished[0].name === 'b').length;
const sameMerge = orderRuns.filter(r => r.applied.join() === 'a,b').length;

const LX = 210;
const RX = 452;
const BW = 64;
const BH = 24;
const GAP = 12;
const RH = 46;

module.exports = figure('fig-2-1b', {
  height: 440,
  title: '任务完成的顺序与其写入生效的顺序',
  desc: `七个超步，每步两个并行任务，用 Qwen3 4B 在 x86 服务器虚拟机上录制。左侧是任务返回的顺序，以及各自模型调用的秒数。右侧是 apply_writes 应用它们写入的顺序。在六次运行中，节点 a 和 b 各自向模型要一个回答，并用 operator.add 追加到同一个列表。6 次中有 ${bFirst} 次 b 先返回，列表为 a, b 的有 ${sameMerge} 次。在最后一个超步里，节点 ${applied[0].name} 由 Command(goto) 作为 PULL 任务启动，节点 ${applied[1].name} 由 Send 作为 PUSH 任务启动。${finished[0].name} 先完成，但 ${applied[0].name} 仍然先生效，因为 PULL 路径排在 PUSH 路径之前。`,
}, f => {
  f.kicker(LX, 22, '返回顺序');
  f.kicker(RX, 22, '生效顺序');
  f.text(LX, 40, '每个任务下方是模型耗时（秒）', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(RX, 40, '按任务路径排序', { size: 11, serif: true, hue: 'ink-soft' });
  runs.forEach((run, r) => {
    const y = 60 + r * RH + (r === runs.length - 1 ? 16 : 0);
    f.beat(r + 1);
    f.text(20, y + 16, run.label, { size: 11.5, hue: 'ink' });
    run.finished.forEach((t, k) => {
      const push = run.kinds[t.name] === '__pregel_push';
      const b = f.box({ x: LX + k * (BW + GAP), y, w: BW, h: BH, hue: 'amber', title: t.name, titleSize: 12, dash: push ? 'dashed' : undefined, pad: 4 });
      f.text(b.cx, y + BH + 13, t.s === null ? (push ? 'PUSH' : 'PULL') : `${t.s.toFixed(2)} s`, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
    });
    run.applied.forEach((name, k) => {
      const push = run.kinds[name] === '__pregel_push';
      const b = f.box({ x: RX + k * (BW + GAP), y, w: BW, h: BH, hue: 'indigo', title: name, titleSize: 12, dash: push ? 'dashed' : undefined, pad: 4 });
      const label = run.kinds[name] ? (push ? 'PUSH' : 'PULL') : `第 ${k + 1} 项`;
      f.text(b.cx, y + BH + 13, label, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
    });
    f.arrow([LX + 2 * BW + GAP + 8, y + BH / 2], [RX - 8, y + BH / 2], { style: 'state', label: r === 0 ? 'apply_writes' : undefined });
  });
  f.beat(0);
  f.rule(16, 60 + 6 * RH + 4, 624, 60 + 6 * RH + 4, { hue: 'ink-mute', opacity: 0.4 });
  f.rect(20, 418, 22, 14, { hue: 'amber', dash: 'dashed' });
  f.text(48, 429, '由 Send 产生的 PUSH 任务', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(300, 429, `6 次中 b 先返回 ${bFirst} 次，合并为 a, b 的 ${sameMerge} 次`, { size: 11, hue: 'indigo' });
});
