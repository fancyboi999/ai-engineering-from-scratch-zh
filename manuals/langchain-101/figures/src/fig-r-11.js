'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench/summary-mac.json'));
const SP = S.sampling;
const subset = S.main.subset;
const mixed = new Set(SP.mixed);
const seeds = Object.keys(SP.seeds).sort();
const ROWS = [
  ...SP.greedy.plain.map((r, i) => ({ label: `贪心，第 ${i + 1} 次运行`, tasks: r, hue: 'violet', group: 'plain 循环，temperature 0，seed 42' })),
  ...SP.greedy.deep_agent.map((r, i) => ({ label: `贪心，第 ${i + 1} 次运行`, tasks: r, hue: 'blue', group: 'deep agent，temperature 0，seed 42' })),
  ...seeds.map(k => ({ label: `seed ${k.split('-s')[1]}`, tasks: SP.seeds[k].tasks, hue: 'violet', group: 'plain 循环，temperature 0.7' })),
];
const X0 = 160;
const SQ = 12;
const RH = 18;
const Y0 = 62;
const FAMS = ['chain', 'sql', 'r', 'files', 'multi'];
const famName = { chain: 'chain', sql: 'sql', r: '检索', files: 'files', multi: '多轮' };
const colX = t => X0 + subset.indexOf(t) * (SQ + 1) + FAMS.findIndex(p => t.startsWith(p)) * 6;
const count = r => subset.filter(t => r.tasks[t]).length;

module.exports = figure('fig-r-11', {
  height: Y0 + 9 * RH + 3 * 22 + 50,
  title: '三次贪心运行互相一致，三次采样运行则不一致',
  desc: `Mac 上 Qwen3 4B 在 30 个子集任务上的网格。朴素循环与 deep agent 各在 temperature 0、seed 42 下运行三次，每次运行在每个任务上结果都相同，token 与工具调用也相同：分别通过 30 个中的 ${count(ROWS[0])} 个和 ${count(ROWS[3])} 个。temperature 0.7、seed 为 1、2、3 的 朴素循环分别通过 30 个中的 ${seeds.map(k => SP.seeds[k].pass).join('、')} 个，有 ${SP.mixed.length} 个任务在不同 seed 间结果改变：${SP.mixed.join(', ')}。`,
}, f => {
  f.kicker(20, 22, 'Qwen3 4B，30 个子集任务');
  f.kicker(620, 22, '通过', { anchor: 'end' });
  FAMS.forEach(p => {
    const ts = subset.filter(t => t.startsWith(p));
    const a = colX(ts[0]);
    const b = colX(ts[ts.length - 1]) + SQ - 1;
    f.text((a + b) / 2, 44, famName[p], { size: 11, anchor: 'middle', hue: 'ink-soft' });
    f.rule(a, 50, b, 50, { hue: 'ink-mute' });
  });
  let y = Y0;
  let group = null;
  ROWS.forEach((r, i) => {
    if (r.group !== group) {
      group = r.group;
      y += 6;
      f.beat(Math.floor(i / 3) + 1);
      f.text(20, y + 8, group, { size: 11, weight: 700, hue: r.hue });
      y += 16;
    }
    f.text(28, y + 10, r.label, { size: 11, hue: 'ink-soft' });
    subset.forEach(t => f.rect(colX(t), y, SQ - 2, RH - 5, { fill: color(r.tasks[t] ? `${r.hue}-ink` : 'rose-ink'), stroke: 'none' }));
    f.text(620, y + 10, `${count(r)}/30`, { size: 11, hue: 'ink', anchor: 'end', weight: 700 });
    y += RH;
  });
  f.beat(0);
  subset.filter(t => mixed.has(t)).forEach(t => {
    f.path(`M${colX(t) + (SQ - 2) / 2} ${y + 10} L${colX(t) + (SQ - 2) / 2 - 4} ${y + 17} L${colX(t) + (SQ - 2) / 2 + 4} ${y + 17} Z`, { hue: 'amber', head: false, width: 1.4, packet: false });
  });
  f.text(20, y + 34, `琥珀标记：${mixed.size} 个任务在不同 seed 间结果有变化`, { size: 11, serif: true, hue: 'amber' });
});
