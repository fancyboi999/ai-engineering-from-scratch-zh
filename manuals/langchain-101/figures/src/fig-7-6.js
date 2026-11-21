'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/tracing-mac-real.json'));
const il = data.interleave;
const conditions = [['off', '追踪关闭', 'grey'], ['on', '追踪开启', 'olive']];

module.exports = figure('fig-7-6', {
  height: 366,
  title: '追踪关闭与开启时，一次 agent 运行在模型之外的耗时',
  desc: `在 Mac 上用 Qwen3 4B，每次 agent 运行在模型之外花费的毫秒数，每种条件 ${il.off.n} 次运行，在同一进程内交错执行。中位数：关闭 ${il.off.non_model_ms_median} ms，开启 ${il.on.non_model_ms_median} ms，成对比较时开启多 ${il.paired_on_minus_off_ms_median} ms。开启追踪时，运行的中位耗时为 ${il.on.wall_ms_median} ms。`,
}, f => {
  const c = chart(f, { x: 70, y: 40, w: 540, h: 250, xDomain: [0, 2], yDomain: [0, 60], yTicks: [0, 10, 20, 30, 40, 50, 60], yLabel: '模型之外的毫秒数' });
  conditions.forEach(([key, label, hue], i) => {
    const cx = c.px(i + 0.5);
    il[key].non_model_ms.forEach((v, j) => f.dot(Math.round(cx + ((j * 37) % 61 - 30) * 2.6), Math.round(c.py(v)), { hue, r: 2 }));
    const med = il[key].non_model_ms_median;
    f.rule(cx - 92, c.py(med), cx + 92, c.py(med), { hue: 'ink', width: 2 });
    f.text(cx + 96, c.py(med) + 4, `${med} ms`, { size: 11, hue: 'ink', knock: true });
    f.text(cx, 308, label, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  });
  f.text(70, 336, `每个点是一次 agent 运行（取自 7 次追踪运行），每组 ${il.off.n} 次。线是中位数。`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(70, 354, `未绘出：前两次运行。第一次在模型之外花了 ${il.first_run_non_model_ms} ms。`, { size: 11, serif: true, hue: 'ink-soft' });
});
