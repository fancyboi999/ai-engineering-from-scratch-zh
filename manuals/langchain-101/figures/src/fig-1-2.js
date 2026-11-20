'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench/summary-mac.json'));
const M = S.main;
const FAM = ['chain', 'sql', 'retrieval', 'files', 'multiturn'];
const NAME = {
  'claude-haiku-5-5': 'Haiku 5.5',
  'claude-sonnet-5-5': 'Sonnet 5.5',
  'gpt-oss:20b': 'gpt-oss 20B',
  'qwen3:14b': 'Qwen3 14B',
  'qwen3:8b': 'Qwen3 8B',
  'qwen3:4b-instruct-2507-q4_K_M': 'Qwen3 4B',
  'qwen3:30b-a3b': 'Qwen3 30B-A3B',
};
const GROUPS = [
  ['claude-haiku-5-5', ['plain', 'deep_agent']],
  ['claude-sonnet-5-5', ['plain', 'deep_agent']],
  ['gpt-oss:20b', ['plain', 'deep_agent']],
  ['qwen3:14b', ['plain', 'deep_agent']],
  ['qwen3:8b', ['plain', 'create_agent', 'langgraph', 'deep_agent']],
  ['qwen3:4b-instruct-2507-q4_K_M', ['plain', 'create_agent', 'langgraph', 'deep_agent']],
  ['qwen3:30b-a3b', ['plain', 'deep_agent']],
];
const HUE = { plain: 'violet', create_agent: 'blue', langgraph: 'indigo', deep_agent: 'blue' };
const LABEL = { plain: '朴素循环', create_agent: 'create_agent', langgraph: 'StateGraph', deep_agent: 'deep agent' };

const order = M.order;
const X0 = 212;
const CW = 3.4;
const GAP = 6;
const colX = {};
let x = X0;
const famStart = {};
order.forEach((t, i) => {
  const fam = M.family[t];
  if (i && M.family[order[i - 1]] !== fam) x += GAP;
  if (!(fam in famStart)) famStart[fam] = x;
  colX[t] = x;
  x += CW;
});
const XEND = x;
const famEnd = {};
order.forEach(t => { famEnd[M.family[t]] = colX[t] + CW; });

const cell = (model, harness) => {
  const c = M.cells[`${model}|${harness}|0`];
  if (!c) throw new Error(`fig-1-2: no cell ${model} ${harness}`);
  return c;
};
const haiku = [cell('claude-haiku-5-5', 'plain'), cell('claude-haiku-5-5', 'deep_agent')];
const q4 = [cell('qwen3:4b-instruct-2507-q4_K_M', 'plain'), cell('qwen3:4b-instruct-2507-q4_K_M', 'deep_agent')];
const q8 = [cell('qwen3:8b', 'plain'), cell('qwen3:8b', 'deep_agent')];
const rowsTotal = GROUPS.reduce((a, [, hs]) => a + hs.length, 0);
const RH = 15;
const Y0 = 74;
const SEP = 7;
const height = Y0 + rowsTotal * RH + (GROUPS.length - 1) * SEP + 92;

module.exports = figure('fig-1-2', {
  height,
  title: '每个模型与 harness 在每项任务上的结果',
  desc: `一张网格，每行是一个模型与 harness 的组合，每列对应 99 项任务集中的一项任务，按任务族分组。实心方块表示通过，玫红方块表示失败，空白列表示该任务不在该行的 30 项子集之内。Claude Haiku 5.5 用 朴素循环在 99 项中通过 ${haiku[0].pass} 项，用 deep agent 通过 ${haiku[1].pass} 项。Qwen3 4B 的朴素循环通过 ${q4[0].pass} 项，deep 通过 ${q4[1].pass} 项；Qwen3 8B 分别通过 ${q8[0].pass} 项和 ${q8[1].pass} 项。在 Qwen3 模型上，朴素循环、create_agent 与手工搭建的 StateGraph 这几行在它们共有的每项任务上结果相同。`,
}, f => {
  f.kicker(20, 24, '模型');
  f.kicker(124, 24, 'harness');
  f.kicker(620, 24, '通过', { anchor: 'end' });
  for (const fam of FAM) {
    const cx = (famStart[fam] + famEnd[fam]) / 2;
    f.text(cx, 46, fam, { size: 11, anchor: 'middle', hue: 'ink-soft' });
    f.rule(famStart[fam], 54, famEnd[fam], 54, { hue: 'ink-mute' });
  }
  let y = Y0;
  GROUPS.forEach(([model, harnesses], g) => {
    if (g) y += SEP;
    f.beat(g + 1);
    f.text(20, y + 10, NAME[model], { size: 11, weight: 700, hue: 'plum' });
    harnesses.forEach(h => {
      const c = cell(model, h);
      f.text(124, y + 10, LABEL[h], { size: 11, hue: HUE[h] });
      const paths = { pass: '', fail: '' };
      let run = null;
      const flush = () => {
        if (run) paths[run.kind] += `M${run.x0.toFixed(1)} ${y + 1}h${(run.x1 - run.x0).toFixed(1)}v${RH - 4}h-${(run.x1 - run.x0).toFixed(1)}z`;
        run = null;
      };
      order.forEach((t, i) => {
        const r = c.tasks[t];
        if (!r) { flush(); return; }
        const kind = r.p ? 'pass' : 'fail';
        const joined = run && run.kind === kind && i > 0 && c.tasks[order[i - 1]] && M.family[order[i - 1]] === M.family[t];
        if (!joined) { flush(); run = { kind, x0: colX[t], x1: colX[t] + CW }; } else run.x1 = colX[t] + CW;
      });
      flush();
      if (paths.pass) f.mark(paths.pass, { hue: HUE[h] });
      if (paths.fail) f.mark(paths.fail, { hue: 'rose' });
      f.text(620, y + 10, `${c.pass}/${c.n}`, { size: 11, hue: 'ink', anchor: 'end', weight: 700 });
      y += RH;
    });
  });
  f.beat(0);
  f.path(order.map(t => `M${(colX[t] + CW - 0.4).toFixed(1)} ${Y0}V${y}`).join(''), { hue: 'paper', head: false, width: 0.8, packet: false });
  const ly = y + 26;
  f.rect(20, ly - 10, 10, 11, { fill: color('violet-ink'), stroke: 'none' });
  f.rect(32, ly - 10, 10, 11, { fill: color('blue-ink'), stroke: 'none' });
  f.rect(44, ly - 10, 10, 11, { fill: color('indigo-ink'), stroke: 'none' });
  f.text(60, ly, '通过，颜色对应 harness 所在的层', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(330, ly - 10, 10, 11, { fill: color('rose-ink'), stroke: 'none' });
  f.text(346, ly, '失败：状态错误、工具错误或没有答案', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ly + 22, '30 项任务的行运行的是分层子集，每个任务族 6 项。空白列表示没有运行。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ly + 40, 'Qwen3 行：在 Mac 上用贪心解码。Claude 行：通过 API，默认采样，每项任务运行一次。', { size: 11, serif: true, hue: 'ink-soft' });
});
