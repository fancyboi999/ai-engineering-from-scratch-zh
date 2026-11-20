'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const text = fs.readFileSync(path.join(__dirname, '../../capture/lab/internals/04-interrupt/trace.txt'), 'utf8');
const part = (start, end) => {
  const i = text.indexOf(start);
  const j = end ? text.indexOf(end, i + 1) : -1;
  if (i < 0) throw new Error(`fig-2-4: no "${start}"`);
  return text.slice(i, j < 0 ? undefined : j);
};
const logs = body => [...body.matchAll(/^\s+(\{"node".*\})$/gm)].map(m => JSON.parse(m[1]));
const ids = body => [...body.matchAll(/returned interrupt id=([0-9a-f]+) value=\{'q': '([^']+)'\}/g)].map(m => ({ id: m[1].slice(0, 8), q: m[2] }));

const run1 = part('## run 1', '## run 2a');
const run2a = part('## run 2a', '## run 2b');
const run2b = part('## run 2b', '## run 3');
const run3 = part('## run 3', '## model calls per invocation');
const perCall = JSON.parse(/## model calls per invocation: (\{.*\})/.exec(text)[1].replace(/'/g, '"'));
const history = [...part('## checkpoint history').matchAll(/step=(-?\d+) source=(\w+)/g)].map(m => Number(m[1]));
if (history.length !== 4) throw new Error('fig-2-4: expected four checkpoints');
const err = /raises (\w+):/.exec(run2a)[1];
const reapplied = /reapplied\(no rerun\)=\['(\w+)'\]/.exec(run2b)[1];
const i1 = ids(run1);
const i2 = ids(run2b);
const enter = (body, node) => logs(body).find(l => l.node === node && l.event.startsWith('enter'));
const listOf = (body, node) => `[${(enter(body, node)['scratchpad.resume'] || []).join(', ')}]`;
const ran = (body, node) => logs(body).some(l => l.node === node);
const calls = (body, node) => logs(body).filter(l => l.node === node && l.event.startsWith('model call')).length;
const returned = (body, node) => logs(body).filter(l => l.node === node && /returned/.test(l.event)).map(l => /'([^']+)'/.exec(l.event)[1]);
const plural = n => `${n} 次模型调用`;

const askId1 = i1[0].id;
const approveId = i1[1].id;
const askId2 = i2[0].id;
const nullResume = enter(run3, 'ask').null_resume;
const total = Object.values(perCall).reduce((a, b) => a + b, 0);

const cells = {
  ask: [
    { hue: 'amber', lines: [`进入，列表 ${listOf(run1, 'ask')}`, plural(calls(run1, 'ask')), '调用 #0 停止', `id ${askId1}`] },
    { hue: 'amber', lines: [`进入，列表 ${listOf(run2b, 'ask')}`, plural(calls(run2b, 'ask')), `#0 返回 ${returned(run2b, 'ask')[0]}`, `#1 停止 ${askId2}`] },
    { hue: 'teal', lines: [`进入，列表 ${listOf(run3, 'ask')}`, plural(calls(run3, 'ask')), `#0 重放 ${returned(run3, 'ask')[0]}`, `#1 得到 ${nullResume}，完成`] },
  ],
  approve: [
    { hue: 'amber', lines: [`进入，列表 ${listOf(run1, 'approve')}`, plural(calls(run1, 'approve')), '调用 #0 停止', `id ${approveId}`] },
    { hue: 'teal', lines: [`进入，列表 ${listOf(run2b, 'approve')}`, plural(calls(run2b, 'approve')), `#0 返回 ${returned(run2b, 'approve')[0]}`, '完成'] },
    null,
  ],
  other: [
    { hue: 'teal', lines: ['运行一次', plural(calls(run1, 'other')), '完成', '写入已保存'] },
    { hue: 'teal', dash: true, lines: ['未运行', plural(calls(run2b, 'other')), '已保存的写入', '重新应用'] },
    null,
  ],
  after: [null, null, { hue: 'teal', lines: ['运行', plural(calls(run3, 'after')), '完成'] }],
};
if (reapplied !== 'other' || ran(run2b, 'other') || ran(run3, 'approve') || !ran(run3, 'after')) throw new Error('fig-2-4: capture does not match the drawing');

const COLS = [
  { x: 108, w: 146, head: 'invoke(input)', sub: '调用 1', key: 'run 1' },
  { x: 260, w: 68, head: "'yes'", sub: '调用 2a', key: 'run 2a' },
  { x: 334, w: 146, head: '{id: answer}', sub: '调用 2b', key: 'run 2b' },
  { x: 486, w: 136, head: "'A2'", sub: '调用 3', key: 'run 3' },
];
const RUN_COL = [0, 2, 3];
const ROWS = ['ask', 'approve', 'other', 'after'];
const Y0 = 62;
const RH = 76;

module.exports = figure('fig-2-4', {
  height: 520,
  title: '三次调用回答并行两个节点提出的三个问题',
  desc: `四个节点与四次调用组成的网格，在同一个线程上使用 InMemorySaver，模型为 x86 服务器虚拟机上的 Qwen3 4B。ask、approve 和 other 在 START 之后并行运行，after 最后运行。ask 和 approve 在调用 interrupt 之前，各自先让模型提出一个问题。调用 1 启动运行：ask 在它的第一个中断处停止，id 为 ${askId1}，approve 停止，id 为 ${approveId}，other 完成。调用 2a 用一个普通值恢复，抛出 ${err}，因为有两个中断在等待，且不产生任何模型调用。调用 2b 用一个从 id 到答案的映射恢复：approve 再次询问模型，得到 OK，完成。ask 再次询问模型，重放它的第一个答案，提出第二个问题，并以 id ${askId2} 停止。other 不运行，因为它已保存的写入被重新应用。调用 3 用 A2 恢复：ask 第三次运行，共两次模型调用，完成，随后 after 运行。四次调用分别产生 ${perCall['run 1']}、${perCall['run 2a']}、${perCall['run 2b']} 和 ${perCall['run 3']} 次模型调用，五个提示词共 ${total} 次。线程保存了 ${history.length} 个检查点，步为 ${history.slice().reverse().join('、')}。`,
}, f => {
  f.kicker(20, 22, '第几次调用');
  f.text(20, 40, '恢复值', { size: 11, serif: true, hue: 'ink-soft' });
  COLS.forEach((c, k) => {
    f.text(c.x + c.w / 2, 22, c.sub, { size: 11, anchor: 'middle', hue: 'ink-mute' });
    f.text(c.x + c.w / 2, 40, c.head, { size: 11.5, anchor: 'middle', weight: 700, hue: k === 1 ? 'rose' : 'violet' });
  });
  ROWS.forEach((node, r) => {
    const y = Y0 + r * RH;
    f.text(20, y + 34, node, { size: 12, weight: 700, hue: 'indigo' });
    f.rule(16, y - 4, 624, y - 4, { hue: 'ink-mute', opacity: 0.3 });
  });
  RUN_COL.forEach((col, k) => {
    f.beat(col === 0 ? 1 : col === 2 ? 3 : 4);
    const c = COLS[col];
    ROWS.forEach((node, r) => {
      const cell = cells[node][k];
      const y = Y0 + r * RH;
      if (!cell) {
        f.text(c.x + c.w / 2, y + 36, '-', { size: 11, anchor: 'middle', hue: 'ink-mute' });
        return;
      }
      f.rect(c.x, y, c.w, RH - 10, { hue: cell.hue, dash: cell.dash ? 'dashed' : undefined });
      cell.lines.forEach((line, i) => f.text(c.x + 6, y + 15 + i * 15, line, { size: 11, hue: i === 0 ? 'ink-soft' : i === 1 ? 'plum' : cell.hue, max: c.w - 10 }));
    });
  });
  f.beat(2);
  const c2 = COLS[1];
  f.rect(c2.x, Y0, c2.w, 3 * RH - 10, { hue: 'rose', dash: 'dashed' });
  ['Runtime', 'Error', '', '2 个在等待', '没有节点', '运行'].forEach((line, i) => {
    if (line) f.text(c2.x + c2.w / 2, Y0 + 40 + i * 16, line, { size: 11, anchor: 'middle', hue: i < 2 ? 'rose' : 'ink-soft', weight: i < 2 ? 700 : undefined });
  });

  f.beat(5);
  const my = Y0 + 4 * RH + 8;
  f.text(20, my + 14, '模型调用', { size: 11.5, hue: 'plum', weight: 700 });
  f.text(20, my + 40, '检查点', { size: 11.5, hue: 'teal', weight: 700 });
  const made = [history.filter(s => s <= 0), [], [], history.filter(s => s > 0)];
  COLS.forEach((c, k) => {
    f.text(c.x + c.w / 2, my + 14, String(perCall[c.key]), { size: 12, anchor: 'middle', hue: 'plum', weight: 700 });
    const steps = made[k];
    f.text(c.x + c.w / 2, my + 40, steps.length ? `第 ${steps.sort((a, b) => a - b).join('、')} 步` : '无', { size: 11, anchor: 'middle', hue: steps.length ? 'teal' : 'ink-mute' });
  });
  f.text(334 + 73, my + 56, '答案作为写入保存', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(334 + 73, my + 70, '在第 0 步的检查点上', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });

  f.beat(0);
  const ky = 486;
  f.rect(20, ky - 11, 22, 14, { hue: 'amber' });
  f.text(48, ky, '在中断处停止', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(220, ky - 11, 22, 14, { hue: 'teal' });
  f.text(248, ky, '完成', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(340, ky - 11, 22, 14, { hue: 'teal', dash: 'dashed' });
  f.text(368, ky, '写入重新应用，不运行', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ky + 22, `列表：进入时的恢复列表，五个提示词共 ${total} 次模型调用`, { size: 11, serif: true, hue: 'ink-soft' });
});
