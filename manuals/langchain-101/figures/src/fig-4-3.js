'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench/summary-mac.json'));
const ST = S.structured;
const Q4 = 'qwen3:4b-instruct-2507-q4_K_M';
const ROWS = [
  [Q4, 'Qwen3 4B', ['none', 'tool', 'provider', 'extract']],
  ['qwen3:8b', 'Qwen3 8B', ['none', 'tool', 'extract']],
  ['claude-haiku-5-5', 'Haiku 5.5', ['none', 'tool', 'provider', 'extract']],
];
const VAR = { none: '自由文本', tool: 'ToolStrategy', provider: 'ProviderStrategy', extract: '提取调用' };
const cell = (m, v) => {
  const c = ST.cells[`${m}|${v}`];
  if (!c) throw new Error(`fig-4-3: no cell ${m} ${v}`);
  return c;
};
const order = ST.order;
const X0 = 226;
const CW = 8.4;
const colX = {};
let x = X0;
order.forEach((t, i) => {
  if (i && t.startsWith('sql') && order[i - 1].startsWith('chain')) x += 8;
  colX[t] = x;
  x += CW;
});
const chainEnd = colX[order.filter(t => t.startsWith('chain')).pop()] + CW;
const sqlStart = colX[order.find(t => t.startsWith('sql'))];
const XEND = x;
const RH = 17;
const Y0 = 62;
const SEP = 10;
const nRows = ROWS.reduce((a, [, , vs]) => a + vs.length, 0);
const height = Y0 + nRows * RH + (ROWS.length - 1) * SEP + 84;
const k = (m, v) => cell(m, v).correct;

module.exports = figure('fig-4-3', {
  height,
  title: '结构化输出：按策略和模型划分的每项任务的答案',
  desc: `一张网格，每行是一个模型与策略的组合，每列是一项任务：20 项 chain 任务和 19 项 SQL 任务，各带查询工具。蓝色方块是正确的结构化答案，浅玫红方块是错误的值，空方块是没有结构化答案，实心玫红方块是抛出的错误。在 Qwen3 4B 上，ToolStrategy 在 39 项任务中有 ${39 - cell(Q4, 'tool').present} 项没有给出答案，ProviderStrategy 在 ${cell(Q4, 'provider').n} 项中有 ${cell(Q4, 'provider').n - cell(Q4, 'provider').present} 项抛出异常。再发起第二次模型调用，从最终文本中提取答案，在 Qwen3 4B 上 39 项中正确 ${k(Q4, 'extract')} 项，在 Qwen3 8B 上正确 ${k('qwen3:8b', 'extract')} 项，在 Claude Haiku 5.5 上正确 ${k('claude-haiku-5-5', 'extract')} 项。自由文本取最后一个数字，在 Haiku 上 39 项中正确 ${k('claude-haiku-5-5', 'none')} 项。`,
}, f => {
  f.kicker(20, 22, '模型');
  f.kicker(110, 22, '策略');
  f.kicker(620, 22, '正确', { anchor: 'end' });
  f.text((X0 + chainEnd) / 2, 42, 'chain，20 项任务', { size: 11, anchor: 'middle', hue: 'ink-soft' });
  f.text((sqlStart + XEND) / 2, 42, 'sql，19 项任务', { size: 11, anchor: 'middle', hue: 'ink-soft' });
  f.rule(X0, 49, chainEnd, 49, { hue: 'ink-mute' });
  f.rule(sqlStart, 49, XEND, 49, { hue: 'ink-mute' });
  let y = Y0;
  ROWS.forEach(([m, name, vars], g) => {
    if (g) y += SEP;
    f.beat(g + 1);
    f.text(20, y + 11, name, { size: 11, weight: 700, hue: 'plum' });
    vars.forEach(v => {
      const c = cell(m, v);
      f.text(110, y + 11, VAR[v], { size: 11, hue: v === 'extract' ? 'plum' : 'blue' });
      const solid = { blue: '', rose: '' };
      const w = CW - 2;
      const h = RH - 5;
      for (const t of order) {
        const r = c.tasks[t];
        if (!r) continue;
        const bx = colX[t];
        const box = `M${bx.toFixed(1)} ${y + 1}h${w.toFixed(1)}v${h}h-${w.toFixed(1)}z`;
        if (r.err) solid.rose += box;
        else if (!r.present) f.rect(bx + 0.5, y + 1.5, w - 1, h - 1, { fill: 'none', stroke: color('ink-mute') });
        else if (r.ok) solid.blue += box;
        else f.rect(bx + 0.5, y + 1.5, w - 1, h - 1, { fill: color('rose-fill'), stroke: color('rose-ink') });
      }
      if (solid.blue) f.mark(solid.blue, { hue: 'blue' });
      if (solid.rose) f.mark(solid.rose, { hue: 'rose' });
      f.text(620, y + 11, `${c.correct}/${c.n}`, { size: 11, hue: 'ink', anchor: 'end', weight: 700 });
      y += RH;
    });
  });
  f.beat(0);
  const ly = y + 24;
  f.rect(20, ly - 10, 9, 12, { fill: color('blue-ink'), stroke: 'none' });
  f.text(34, ly, '正确的值', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(140.5, ly - 9.5, 8, 11, { fill: color('rose-fill'), stroke: color('rose-ink') });
  f.text(154, ly, '错误的值', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(250.5, ly - 9.5, 8, 11, { fill: 'none', stroke: color('ink-mute') });
  f.text(264, ly, '没有结构化答案', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(410, ly - 10, 9, 12, { fill: color('rose-ink'), stroke: 'none' });
  f.text(424, ly, '抛出错误', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ly + 24, 'Qwen3 4B 的 ProviderStrategy 只运行了其中 10 项任务。全部在 Mac 上运行，Haiku 通过 API。', { size: 11, serif: true, hue: 'ink-soft' });
});
