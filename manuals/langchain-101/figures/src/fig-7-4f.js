'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench2/summary-bench2.json'));
const MODELS = [
  ['qwen3:8b', 'Qwen3 8B，Ollama'],
  ['qwen3:14b', 'Qwen3 14B，Ollama'],
  ['gpt-oss:20b', 'gpt-oss 20B，Ollama'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5，API'],
];
const ARMS = [
  ['plain', 'plain 循环', 'violet'],
  ['deep', 'deep agent', 'blue'],
  ['ptc', 'deep agent + eval 工具', 'green'],
  ['nudge', '+ 要求用 eval', 'indigo'],
];
const BX = 196;
const BW = 110;
const RH = 17;
const Y0 = 56;
const cell = (m, a) => S.ptc[m][a];
const rows = MODELS.map(([m, name]) => [m, name, ARMS.filter(([a]) => cell(m, a))]);
const nRows = rows.reduce((t, r) => t + r[2].length, 0);
const k = v => `${Math.round(v / 1000).toLocaleString('en-US')}k`;
const hay = cell('claude-haiku-5-5', 'ptc');
const hayN = cell('claude-haiku-5-5', 'nudge');
const m8 = cell('qwen3:8b', 'ptc');

module.exports = figure('fig-7-4f', {
  height: Y0 + nRows * RH + MODELS.length * 30 + 76,
  title: '有无 eval 工具的通过数，4 个模型，39 个任务',
  desc: `在 39 个 chain 与 sql 任务上，对 plain 循环、deep agent 和带 eval 工具的 deep agent 的通过率条形图，模型为 Qwen3 8B、Qwen3 14B、gpt-oss 20B 和 Claude Haiku 5.5。Haiku 带 eval 工具时通过 ${hay.n} 个中的 ${hay.pass} 个，提示词要求使用时通过 ${hayN.n} 个中的 ${hayN.pass} 个，Qwen3 8B 带 eval 工具时通过 ${m8.n} 个中的 ${m8.pass} 个。各列依次为模型调用数、以千计的提示词 token 数，以及每个任务的中位秒数。`,
}, f => {
  f.kicker(20, 22, '通过数/任务数');
  f.kicker(400, 22, '调用', { anchor: 'end' });
  f.kicker(496, 22, '提示词', { anchor: 'end' });
  f.kicker(596, 22, '秒/任务', { anchor: 'end' });
  f.rule(20, 32, 620, 32, { hue: 'ink-mute' });
  let y = Y0;
  rows.forEach(([m, name, arms], g) => {
    f.beat(g + 1);
    f.text(20, y + 4, name, { size: 11, weight: 700, hue: 'plum' });
    y += 20;
    arms.forEach(([a, label, hue]) => {
      const c = cell(m, a);
      f.text(28, y + 9, label, { size: 11, hue: 'ink-soft', max: BX - 36 });
      f.rect(BX, y, BW, RH - 5, { fill: color('panel'), stroke: color('ink-mute') });
      f.rect(BX, y, BW * c.pass / c.n, RH - 5, { fill: color(`${hue}-ink`), stroke: 'none' });
      f.text(BX + BW + 8, y + 9, `${c.pass}/${c.n}`, { size: 11, weight: 700, hue: 'ink' });
      f.text(400, y + 9, String(c.calls_sum), { size: 11, hue: 'ink', anchor: 'end' });
      f.text(496, y + 9, k(c.in_sum), { size: 11, hue: 'ink', anchor: 'end' });
      f.text(596, y + 9, c.wall_med.toFixed(1), { size: 11, hue: 'ink', anchor: 'end' });
      y += RH;
    });
    y += 10;
  });
  f.beat(0);
  f.text(20, y + 6, '12 个任务的行：30 任务子集中的 chain 与 sql 任务。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, y + 22, `没有本地模型调用过 eval。在要求使用的 ${hayN.n} 次运行中，Haiku 有 ${hayN.eval_runs} 次用了它。`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, y + 38, '本地秒数来自一台同时在跑其他任务的 Mac。', { size: 11, serif: true, hue: 'ink-soft' });
});
