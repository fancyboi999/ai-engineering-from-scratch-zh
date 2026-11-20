'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/summary/multiagent-mac.json')).n9;
if (!S || S.n_common < 30) throw new Error('fig-1-2c: the Deep Agents and Agent SDK runs do not cover 30 tasks');
const SIDES = [['deep_agent', 'Deep Agents', 'blue'], ['claude_agent_sdk', 'Claude Agent SDK', 'olive']].map(([k, name, hue]) => {
  const s = S[k];
  const ids = Object.keys(s.tasks);
  return { k, name, hue, s, perTask: ids.map(t => s.tasks[t].in / 1000) };
});
const COLS = [
  { title: ['通过的任务', '共 30 项'], max: 30, v: s => s.pass, fmt: v => `${v}` },
  { title: ['模型调用', '每项任务'], max: 10, v: s => s.calls_med, fmt: v => `${v}` },
  { title: ['输入 token', '每项任务'], max: Math.ceil(Math.max(...SIDES.map(x => x.s.in_med)) / 10000) * 10, v: s => s.in_med / 1000, fmt: v => `${v.toFixed(1)}k` },
  { title: ['费用（美元）', '30 项任务'], max: 0.02, v: s => s.cost_sum, fmt: v => `$${v.toFixed(4)}` },
];
const X0 = 168;
const CW = 104;

module.exports = figure('fig-1-2c', {
  height: 236,
  title: 'Deep Agents 与 Claude Agent SDK 在同样 30 项任务上的对比',
  desc: `Claude Haiku 5.5 在两个 harness 里使用相同工具和相同系统提示词的点状表。${SIDES.map(x => `${x.name}：${x.s.n} 项中通过 ${x.s.pass} 项，每项任务模型调用中位数 ${x.s.calls_med} 次、输入 ${(x.s.in_med / 1000).toFixed(1)}k token，全部任务共 $${x.s.cost_sum.toFixed(4)}`).join('；')}。两个 harness 在 ${S.n_common} 项任务中有 ${S.agree} 项结果一致。下方每个点是一项任务的输入 token 数。`,
}, f => {
  COLS.forEach((c, i) => {
    const x = X0 + i * (CW + 14);
    f.kicker(x, 22, c.title[0]);
    f.kicker(x, 38, c.title[1]);
  });
  SIDES.forEach((side, r) => {
    f.beat(r + 1);
    const y = 62 + r * 30;
    f.text(16, y + 4, side.name, { size: 12, weight: 700, hue: side.hue });
    COLS.forEach((c, i) => {
      const x = X0 + i * (CW + 14);
      const v = c.v(side.s);
      f.rule(x, y, x + CW, y, { hue: 'ink-mute', opacity: 0.3 });
      const cx = x + Math.min(1, v / c.max) * CW;
      f.dot(cx, y, { r: 4.5, hue: side.hue });
      const label = c.fmt(v);
      const right = cx + 8 + label.length * 6.6 < x + CW + 12;
      f.text(right ? cx + 8 : cx - 8, y - 8, label, { size: 11, anchor: right ? 'start' : 'end' });
    });
  });
  f.beat(3);
  const top = 138;
  const left = X0;
  const width = 4 * CW + 3 * 14;
  const max = Math.ceil(Math.max(...SIDES.flatMap(x => x.perTask)) / 20) * 20;
  f.kicker(16, top + 4, '输入 token');
  f.kicker(16, top + 20, '每项任务');
  SIDES.forEach((side, r) => {
    const y = top + r * 22;
    f.rule(left, y, left + width, y, { hue: 'ink-mute', opacity: 0.3 });
    side.perTask.slice().sort((a, b) => a - b).forEach((v, k) => {
      f.dot(left + Math.min(1, v / max) * width, y + ((k % 3) - 1) * 3, { r: 2.2, hue: side.hue });
    });
  });
  const ay = top + 52;
  f.rule(left, ay, left + width, ay, { hue: 'ink' });
  for (let t = 0; t <= max; t += 10) {
    const tx = left + (t / max) * width;
    f.rule(tx, ay, tx, ay + 4, { hue: 'ink' });
    f.text(tx, ay + 17, `${t}k`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
});
