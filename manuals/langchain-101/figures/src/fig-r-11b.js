'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench2/summary-bench2.json'));
const Q4 = 'qwen3:4b-instruct-2507-q4_K_M';
const wilson = (k, n) => {
  const z = 1.96;
  const p = k / n;
  const d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d;
  const h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
};
const row = (label, c, hue) => ({ label, k: c.pass, n: c.n, hue });
const profile = (m, name) => {
  const d = S.profiles[m];
  return [
    { head: `${name}，99 个任务`, rows: [row('plain 循环', d.plain, 'violet'), row('deep agent', d.deep, 'blue'), row('deep，profile B', d.profB, 'plum')] },
    { head: `${name}，30 任务子集`, rows: [row('plain 循环', d.plain_sub, 'violet'), row('deep agent', d.deep_sub, 'blue'), row('deep，profile A', d.profA, 'plum'), row('deep，profile B', d.profB_sub, 'plum')] },
  ];
};
const ptc = (m, name) => {
  const d = S.ptc[m];
  const arms = [['plain', 'plain 循环', 'violet'], ['deep', 'deep agent', 'blue'], ['ptc', 'deep + eval 工具', 'green'], ['nudge', 'deep + eval，已要求', 'indigo']];
  return { head: `${name}，chain 与 sql`, rows: arms.filter(([a]) => d[a]).map(([a, l, h]) => row(l, d[a], h)) };
};
const GROUPS = [
  ...profile(Q4, 'Qwen3 4B'),
  ...profile('qwen3:8b', 'Qwen3 8B'),
  ptc('qwen3:8b', 'Qwen3 8B'),
  ptc('qwen3:14b', 'Qwen3 14B'),
  ptc('gpt-oss:20b', 'gpt-oss 20B'),
  ptc('claude-haiku-5-5', 'Claude Haiku 5.5'),
  { head: 'Qwen3 8B，Qwen3 14B 评分', rows: [{ label: '评分标准，此前失败的任务', k: S.rubric.recovered.length, n: S.rubric.n, hue: 'olive' }] },
];
const AX = 250;
const AW = 260;
const RH = 14;
const HEAD = 20;
const Y0 = 60;
const px = v => AX + v * AW;
const nRows = GROUPS.reduce((t, g) => t + g.rows.length, 0);
const all = GROUPS.flatMap(g => g.rows);
const small = all.filter(r => r.n < 30).length;
const widths = all.map(r => { const [lo, hi] = wilson(r.k, r.n); return hi - lo; });
const widest = Math.max(...widths);
const narrowest = Math.min(...widths);

module.exports = figure('fig-r-11b', {
  height: Y0 + nRows * RH + GROUPS.length * (HEAD + 6) + 50,
  title: '第二个测试基准中每个单元的通过率与区间',
  desc: `${nRows} 个单元的点与 95% Wilson 区间，来自第二个测试基准，分为 ${GROUPS.length} 组：Qwen3 4B 与 Qwen3 8B 上的两项 profile 实验、四个模型上的 eval 工具，以及一次评分标准运行。其中 ${small} 个单元的任务数少于 30。最宽的区间是 ${Math.round(100 * widest)} 个百分点，最窄的是 ${Math.round(100 * narrowest)} 个百分点。`,
}, f => {
  f.kicker(20, 22, '单元');
  f.kicker(620, 22, '通过数/n', { anchor: 'end' });
  [0, 0.5, 1].forEach(v => {
    f.text(px(v), 44, `${v * 100}%`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  });
  let y = Y0;
  const bottom = Y0 + nRows * RH + GROUPS.length * (HEAD + 6) - 6;
  [0, 0.5, 1].forEach(v => f.rule(px(v), 50, px(v), bottom, { hue: 'ink-mute', opacity: 0.25 }));
  GROUPS.forEach((g, gi) => {
    f.beat(gi % 3 + 1);
    f.text(20, y + 9, g.head, { size: 11, weight: 700, hue: 'plum' });
    y += HEAD;
    g.rows.forEach(r => {
      const [lo, hi] = wilson(r.k, r.n);
      f.text(28, y + 9, r.label, { size: 11, hue: 'ink-soft', max: AX - 40 });
      f.rule(px(lo), y + 5, px(hi), y + 5, { hue: r.hue, width: 2 });
      f.rect(px(r.k / r.n) - 3.5, y + 1.5, 7, 7, { fill: color(`${r.hue}-ink`), stroke: 'none' });
      f.text(620, y + 9, `${r.k}/${r.n}`, { size: 11, hue: r.n < 30 ? 'rose' : 'ink', anchor: 'end', weight: r.n < 30 ? 700 : 400 });
      y += RH;
    });
    y += 6;
  });
  f.beat(0);
  f.text(20, y + 8, '须线是 95% Wilson 区间。玫红计数表示任务数少于 30 的单元。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, y + 24, '评分标准单元只含 朴素循环失败过的任务，所以它的基线是 25 个中的 0 个。', { size: 11, serif: true, hue: 'ink-soft' });
});
