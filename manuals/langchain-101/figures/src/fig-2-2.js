'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const forms = require('../../../_shared/forms.js');

const read = name => fs.readFileSync(path.join(__dirname, '../../capture/lab/internals', name), 'utf8');
const trace = read('02-channels/trace.txt');
const partB = trace.slice(trace.indexOf('# B.'), trace.indexOf('# C.'));
const ran = JSON.parse(/node bodies that ran before the raise: (\[.*\])/.exec(partB)[1].replace(/'/g, '"'));
const putLine = /loop.put_writes calls before the raise[^:]*: (\[.*\])$/m.exec(partB)[1];
const pending = [...putLine.matchAll(/\('([ab])', \[\('(\w+)', (\d+)\)\]\)/g)].map(m => ({ node: m[1], channel: m[2], value: Number(m[3]) }));
if (pending.length !== 2) throw new Error('fig-2-2: expected two node writes');
const errorName = /^raised (\w+):/m.exec(partB)[1];
const getStateFrames = /get_state after the raise ALSO raises \w+ via (\[.*\])/.exec(partB)[1];
const resumeRan = /node bodies re-run on resume: (\[[^\]]*\])/.exec(partB)[1];
const ckptStep = /raw saver.get_tuple works: checkpoint step=(\d+)/.exec(partB)[1];

const repair = read('02-channels/repair.txt');
const fixed = repair.slice(repair.indexOf('## 2.'), repair.indexOf('## 3.'));
const fixedState = /get_state: ok -> (\{[^}]*\})/.exec(fixed)[1];
const fixedRan = /node bodies run by invoke\(None\): (\[[^\]]*\])/.exec(fixed)[1];
const fixedSchema = /graph recompiled with (.*)$/m.exec(fixed)[1];
if (resumeRan !== '[]' || fixedRan !== '[]') throw new Error('fig-2-2: expected no node to run again');

const CODE = 64;
const LOOP = 230;
const NODES = 392;
const SAVER = 560;

module.exports = figure('fig-2-2', {
  height: 600,
  title: 'LastValue 冲突、冲突之后失败的读取，以及修复',
  desc: `四条生命线组成的时序图：你的代码、Pregel 循环、节点 a 和 b，以及 InMemorySaver。invoke 启动运行。循环运行 ${ran.join(' 和 ')}，每个完成的节点对 x 的写入都作为待处理写入保存在第 ${ckptStep} 步的检查点上：${pending.map(p => `${p.node} 写的 ${p.channel}=${p.value}`).join('，')}。随后 apply_writes 用两个值调用 LastValue.update，并抛出 ${errorName}。之后的 get_state 读到同样的待处理写入，再次抛出，调用栈经过 ${getStateFrames}。invoke(None) 重新应用这些写入，不运行任何节点，再次抛出。在下半部分，同一个 saver 由重新编译的图打开，所用模式为 ${fixedSchema}。get_state 返回 ${fixedState}，invoke(None) 以同样的状态结束，且不运行任何节点。`,
}, f => {
  const term = forms.flat.terminal(f, CODE, 30, 'violet');
  const loop = forms.flat.unit(f, LOOP, 32, 'indigo');
  const nodes = forms.flat.unit(f, NODES, 32, 'indigo');
  const saver = forms.flat.cylinder(f, SAVER, 22, 'teal', { w: 40, h: 46 });
  f.text(CODE, 84, '你的代码', { size: 11.5, anchor: 'middle', hue: 'violet' });
  f.text(LOOP, 84, 'Pregel 循环', { size: 11.5, anchor: 'middle', hue: 'indigo' });
  f.text(NODES, 84, '节点 a、b', { size: 11.5, anchor: 'middle', hue: 'indigo' });
  f.text(SAVER, 84, 'InMemorySaver', { size: 11.5, anchor: 'middle', hue: 'teal' });
  for (const x of [CODE, LOOP, NODES, SAVER]) f.lifeline(x, 92, 584);

  const row = (n, y, hue) => f.step(20, y, n, { hue });
  let y = 116;
  f.beat(1);
  row(1, y, 'ink');
  f.arrow([CODE, y], [LOOP - 2, y], { style: 'call', label: "invoke({'x': 0})" });
  y += 34;
  f.beat(2);
  row(2, y, 'ink');
  f.arrow([LOOP, y], [NODES - 2, y], { style: 'call', label: `运行 ${ran.join(', ')}` });
  y += 34;
  f.beat(3);
  row(3, y, 'teal');
  pending.forEach((p, k) => {
    const yy = y + k * 24;
    f.arrow([NODES, yy], [SAVER - 22, yy], { style: 'write', label: `${p.node}: ${p.channel}=${p.value}`, labelX: 470 });
  });
  y += 56;
  f.beat(4);
  row(4, y, 'rose');
  f.rect(LOOP - 60, y - 13, 120, 22, { hue: 'rose' });
  f.text(LOOP, y + 3, 'apply_writes', { size: 11.5, anchor: 'middle', hue: 'rose', weight: 700 });
  f.text(LOOP + 70, y + 3, 'LastValue 收到两个值', { size: 11, serif: true, hue: 'ink-soft', knock: true });
  y += 30;
  f.arrow([LOOP - 2, y], [CODE + 2, y], { style: 'fail', label: errorName });
  y += 40;
  f.beat(5);
  row(5, y, 'rose');
  f.arrow([CODE, y], [LOOP - 2, y], { style: 'call', label: 'get_state' });
  f.arrow([LOOP, y], [SAVER - 22, y], { style: 'call', label: `读取第 ${ckptStep} 步及待处理写入`, labelX: 400 });
  y += 26;
  f.arrow([LOOP - 2, y], [CODE + 2, y], { style: 'fail', label: `再次 ${errorName}` });
  y += 38;
  f.beat(6);
  row(6, y, 'rose');
  f.arrow([CODE, y], [LOOP - 2, y], { style: 'call', label: 'invoke(None)' });
  f.text(LOOP + 12, y + 4, `运行的节点：${resumeRan}，写入已重新应用`, { size: 11, serif: true, hue: 'ink-soft', knock: true });
  y += 26;
  f.arrow([LOOP - 2, y], [CODE + 2, y], { style: 'fail', label: `再次 ${errorName}` });

  y += 30;
  f.beat(7);
  f.rule(14, y, 626, y, { hue: 'ink-mute', dash: 'dashed' });
  f.text(36, y + 18, '同一个 saver，图已重新编译', { size: 11.5, hue: 'teal', weight: 700, knock: true });
  f.text(36, y + 36, `使用 ${fixedSchema}`, { size: 11, hue: 'teal', knock: true });
  y += 62;
  row(7, y, 'teal');
  f.arrow([CODE, y], [LOOP - 2, y], { style: 'call', label: 'get_state' });
  y += 24;
  f.arrow([LOOP - 2, y], [CODE + 2, y], { style: 'reply', label: fixedState });
  y += 34;
  f.beat(8);
  row(8, y, 'teal');
  f.arrow([CODE, y], [LOOP - 2, y], { style: 'call', label: 'invoke(None)' });
  f.text(LOOP + 12, y + 4, `运行的节点：${fixedRan}，已保存的写入归并：0 + 1 + 2`, { size: 11, serif: true, hue: 'ink-soft', knock: true });
  y += 24;
  f.arrow([LOOP - 2, y], [CODE + 2, y], { style: 'reply', label: fixedState });
});
