'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench/summary-mac.json'));
const T = S.toolscale.cells;
const Q4 = 'qwen3:4b-instruct-2507-q4_K_M';
const SIZES = [5, 20, 50, 100];
const BLOCKS = [
  ['claude-haiku-5-5', 'Haiku 5.5', ['off', 'on']],
  [Q4, 'Qwen3 4B', ['off', 'on', 'on_desc']],
  ['qwen3:8b', 'Qwen3 8B', ['off', 'on', 'on_desc']],
];
const SEL = { off: '无选择器', on: '选择器', on_desc: '选择器 + 列表' };
const SELHUE = { off: 'blue', on: 'plum', on_desc: 'plum' };
const get = (m, n, s) => T[`${m}|${n}|${s}`];

const X0 = 154;
const SQ = 8;
const GW = 10 * SQ + 34;
const GG = 6;
const gx = i => X0 + i * (GW + GG);
const RH = 17;
const Y0 = 46;
const SEP = 12;
const nRows = BLOCKS.reduce((a, [, , s]) => a + s.length, 0);
const height = Y0 + nRows * RH + BLOCKS.length * 18 + (BLOCKS.length - 1) * SEP + 96;
const pass = (m, n, s) => (get(m, n, s) ? get(m, n, s).pass : null);

module.exports = figure('fig-4-4', {
  height,
  title: '四种工具数量下的十项 chain 任务，有无 LLMToolSelectorMiddleware 的对比',
  desc: `一张网格，列出每个模型、工具数量和选择器设置下的十项 chain 任务，create_agent 在 Mac 上运行，Claude Haiku 5.5 通过 API。蓝色或梅紫色方块表示通过，实心玫红方块表示调用了干扰项或没有调用所需的查询，浅玫红方块表示其他失败，黑色方块表示抛出异常的运行。没有选择器时，Haiku 在 5、20、50 和 100 个工具下都是 10 项通过 10 项，有选择器时为 ${[5, 20, 50, 100].map(n => pass('claude-haiku-5-5', n, 'on')).join('、')}。Qwen3 4B 没有选择器时通过 ${SIZES.map(n => pass(Q4, n, 'off')).join('、')}，有选择器时通过 ${SIZES.map(n => pass(Q4, n, 'on')).join('、')}。Qwen3 8B 只运行了 5 和 50 个工具。这里的通过是宽松通过。`,
}, f => {
  f.kicker(20, 22, '模型，设置');
  SIZES.forEach((n, i) => {
    f.text(gx(i) + 5 * SQ, 22, `${n} 个工具`, { size: 11, hue: 'ink', anchor: 'middle', weight: 700 });
    f.rule(gx(i), 30, gx(i) + 10 * SQ, 30, { hue: 'ink-mute' });
  });
  let y = Y0;
  BLOCKS.forEach(([m, name, sels], b) => {
    if (b) y += SEP;
    f.beat(b + 1);
    f.text(20, y + 11, name, { size: 11, weight: 700, hue: 'plum' });
    y += 18;
    sels.forEach(s => {
      f.text(20, y + 11, SEL[s], { size: 11, hue: SELHUE[s] });
      SIZES.forEach((n, i) => {
        const c = get(m, n, s);
        if (!c) return;
        c.runs.forEach((r, k) => {
          const bx = gx(i) + k * SQ;
          if (r.p) f.rect(bx, y + 1, SQ - 2, RH - 5, { fill: color(`${SELHUE[s]}-ink`), stroke: 'none' });
          else if (r.c === 'harness_error') f.rect(bx, y + 1, SQ - 2, RH - 5, { fill: color('ink'), stroke: 'none' });
          else if (r.c === 'wrong_tool') f.rect(bx, y + 1, SQ - 2, RH - 5, { fill: color('rose-ink'), stroke: 'none' });
          else f.rect(bx + 0.5, y + 1.5, SQ - 3, RH - 6, { fill: color('rose-fill'), stroke: color('rose-ink') });
        });
        f.text(gx(i) + 10 * SQ + 4, y + 11, String(c.pass), { size: 11, hue: 'ink', weight: 700 });
      });
      y += RH;
    });
  });
  f.beat(0);
  const ly = y + 22;
  f.rect(20, ly - 10, 6, 12, { fill: color('blue-ink'), stroke: 'none' });
  f.rect(28, ly - 10, 6, 12, { fill: color('plum-ink'), stroke: 'none' });
  f.text(40, ly, '通过', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(86, ly - 10, 6, 12, { fill: color('rose-ink'), stroke: 'none' });
  f.text(98, ly, '工具错误：调用了干扰项，或没有查询条目', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(390.5, ly - 9.5, 5, 11, { fill: color('rose-fill'), stroke: color('rose-ink') });
  f.text(402, ly, '其他失败', { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(510, ly - 10, 6, 12, { fill: color('ink'), stroke: 'none' });
  f.text(522, ly, '抛出异常', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ly + 22, '每组后面的数字是 10 次中的通过数。工具：5 个查询、干扰项，以及 submit_answer。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, ly + 40, '选择器 + 列表：我们自己的系统 prompt，附上每个工具的名称和描述。', { size: 11, serif: true, hue: 'ink-soft' });
});
