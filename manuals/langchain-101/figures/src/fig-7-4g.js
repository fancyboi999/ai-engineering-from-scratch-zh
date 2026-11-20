'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const S = load(path.join(__dirname, '../../capture/lab/bench2/summary-bench2.json'));
const H = S.ptc['claude-haiku-5-5'];
const ARMS = [['ptc', 'eval 工具，普通 prompt', 'green'], ['nudge', 'eval 工具，prompt 要求使用', 'indigo']];
const METRICS = [
  ['模型调用', c => c.calls_sum, v => String(v)],
  ['prompt token', c => c.in_sum, v => `${(v / 1e6).toFixed(2)}M`],
  ['输出 token', c => c.out_sum, v => `${(v / 1000).toFixed(1)}k`],
  ['美元', c => c.cost, v => `$${v.toFixed(3)}`],
  ['eval 调用', c => c.eval_calls, v => String(v)],
  ['eval 错误', c => c.eval_errors, v => String(v)],
];
const ids = Object.keys(H.ptc.tasks);
const SQ = 11;
const STEP = 14.4;
const X0 = 20;
const BX = 150;
const BW = 300;
const RH = 15;
const GAP = 12;
const TOP = 54;
const stripY = i => TOP + i * 50 + 16;
const BARS_Y = TOP + 2 * 50 + 34;
const ev = a => ids.filter(t => H[a].tasks[t].ev > 0).length;

module.exports = figure('fig-7-4g', {
  height: BARS_Y + METRICS.length * (2 * RH + GAP) + 50,
  title: 'Claude Haiku 5.5 带 eval 工具，prompt 有无要求使用',
  desc: `两条带，对应 39 个 chain 与 sql 任务，每个任务一个方块，显示哪些运行调用了 eval 工具：prompt 没有要求时 ${ev('ptc')} 次，prompt 要求时 ${ev('nudge')} 次。两组中每个任务都通过。下方的成对条形比较两组的模型调用数、prompt token、输出 token、美元、eval 调用数和 eval 错误数：调用数分别为 ${H.ptc.calls_sum} 和 ${H.nudge.calls_sum}，成本分别为 $${H.ptc.cost.toFixed(3)} 和 $${H.nudge.cost.toFixed(3)}。`,
}, f => {
  f.kicker(20, 22, '每个方块是一个任务');
  f.kicker(620, 22, `${ids.length} 个任务，全部通过`, { anchor: 'end' });
  f.rule(20, 32, 620, 32, { hue: 'ink-mute' });
  ARMS.forEach(([a, label, hue], i) => {
    f.beat(i + 1);
    const y = stripY(i);
    f.text(X0, y - 6, `${label}：${ids.length} 次运行中有 ${ev(a)} 次调用了 eval`, { size: 11, weight: 700, hue });
    ids.forEach((t, j) => {
      const used = H[a].tasks[t].ev > 0;
      f.rect(X0 + j * STEP, y, SQ, SQ, used ? { fill: color(`${hue}-ink`), stroke: 'none' } : { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`), strokeWidth: 0.8 });
    });
  });
  f.beat(0);
  f.text(X0, stripY(1) + 32, '深色方块：该次运行调用了 eval。浅色方块：直接使用任务工具。', { size: 11, serif: true, hue: 'ink-soft' });
  f.kicker(20, BARS_Y - 8, '两组，同样的 39 个任务');
  let y = BARS_Y;
  METRICS.forEach(([name, get, show], g) => {
    f.beat(g % 2 + 1);
    f.text(20, y + RH + 2, name, { size: 11, hue: 'ink-soft' });
    const top = Math.max(...ARMS.map(([a]) => get(H[a])));
    ARMS.forEach(([a, , hue], i) => {
      const v = get(H[a]);
      const w = top ? BW * v / top : 0;
      const by = y + i * RH;
      if (w > 0) f.rect(BX, by, w, RH - 4, { fill: color(`${hue}-ink`), stroke: 'none' });
      else f.rule(BX, by, BX, by + RH - 4, { hue: 'ink-mute' });
      f.text(BX + w + 8, by + 9, show(v), { size: 11, weight: 700, hue: 'ink' });
    });
    y += 2 * RH + GAP;
  });
  f.beat(0);
  f.text(20, y + 2, '绿色是普通 prompt，靛蓝是要求使用 eval 的 prompt。', { size: 11, serif: true, hue: 'ink-soft' });
});
