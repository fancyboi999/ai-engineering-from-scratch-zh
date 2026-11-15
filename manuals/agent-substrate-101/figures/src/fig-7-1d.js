'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/kagent-model-x86.json'));
const groups = [
  { key: 'A-3b', name: '3b，同一会话' },
  { key: 'C-3b-first', name: '3b，新会话' },
  { key: 'A-1p5b', name: '1.5b，同一会话' },
  { key: 'C-1p5b-first', name: '1.5b，新会话' },
];
const GAP = 1.4;
const TOP = 22;
const BAR = 6.4;
const one = value => `${value.toFixed(1)} s`;
const stuck = data.turn_that_did_not_end;
const total = groups.reduce((sum, group) => sum + data.runs[group.key].length, 0);
const clean = groups.reduce((sum, group) => sum + data.series[group.key].clean, 0);
const share = data.series['A-3b'].model_share.median;
const overhead = data.series['A-3b'].resume_seconds.median + data.series['A-3b'].suspend_seconds.median;

let cursor = 0.6;
for (const group of groups) {
  group.from = cursor;
  group.turns = data.runs[group.key].map((turn, index) => ({ ...turn, at: cursor + index + 0.5 }));
  cursor += group.turns.length + GAP;
}
const span = cursor - GAP + 0.6;

module.exports = figure('fig-7-1d', {
  height: 372,
  title: 'CPU 上使用小型真实模型执行的每个 kagent 轮次',
  desc: `CPU 上使用小型开源模型执行的全部 ${total} 个 kagent 轮次（按运行顺序每轮一根柱）。柱体紫红色部分为模型请求耗时，琥珀色部分为轮次其余耗时（含恢复与挂起）。使用 3b 模型时，同一会话内单轮次中位耗时 ${one(data.series['A-3b'].wall_seconds.median)}，模型请求占 ${Math.round(share * 100)}%。使用 1.5b 模型时中位耗时为 ${one(data.series['A-1p5b'].wall_seconds.median)}。共 ${clean} 个轮次正常完成。1.5b 模型下有一个轮次未结束：客户端在 ${Math.round(stuck.client_seconds)} 秒后放弃，后续一轮在其后等待了 ${Math.round(stuck.next_turn_wall_seconds)} 秒。`,
}, f => {
  const c = chart(f, { x: 56, y: 62, w: 560, h: 222, xDomain: [0, span], yDomain: [0, TOP], yTicks: [0, 5, 10, 15, 20], yLabel: '每轮次的客户端耗时（秒）' });
  f.kicker(56, 22, '模型请求', { hue: 'plum' });
  f.kicker(206, 22, '轮次其余耗时', { hue: 'amber' });
  f.kicker(616, 22, '无响应或受阻等待', { hue: 'rose', anchor: 'end' });
  groups.forEach((group, index) => {
    const left = c.px(group.from);
    const right = c.px(group.from + group.turns.length);
    const stats = data.series[group.key];
    const divider = left - c.px(GAP / 2) + c.px(0);
    if (index) f.rule(divider, 62, divider, 284, { hue: 'ink-mute', dash: 'dashed', opacity: 0.6 });
    for (const turn of group.turns) {
      const x = c.px(turn.at) - BAR / 2;
      if (!turn.clean) {
        const top = c.py(TOP);
        f.rect(x, top, BAR, c.py(0) - top, { hue: 'rose' });
        f.hatchRect(x, top, BAR, c.py(0) - top);
        continue;
      }
      const model = c.py(turn.model_seconds);
      const wall = c.py(turn.wall_seconds);
      f.rect(x, model, BAR, c.py(0) - model, { hue: 'plum' });
      f.rect(x, wall, BAR, model - wall, { hue: 'amber' });
    }
    if (stats.clean === stats.n) {
      const my = c.py(stats.wall_seconds.median);
      f.rule(left - 2, my, right + 2, my, { hue: 'ink', width: 1.2 });
      f.text((left + right) / 2, c.py(20.6), one(stats.wall_seconds.median), { size: 12, weight: 700, anchor: 'middle', knock: true });
    }
    f.text((left + right) / 2, 302, group.name, { size: 11, anchor: 'middle' });
    f.text((left + right) / 2, 317, `${stats.clean}/${stats.n} 正常完成`, { size: 11, anchor: 'middle', serif: true, hue: 'ink-soft' });
  });
  const last = groups[3];
  const lost = last.turns.find(turn => !turn.completed);
  const waited = last.turns.find(turn => turn.completed && !turn.clean);
  f.text(616, 52, `${Math.round(lost.wall_seconds)} s 无响应，随后一轮耗时 ${Math.round(waited.wall_seconds)} s`, { size: 11, anchor: 'end', hue: 'rose' });
  f.text(56, 344, '每根柱：按运行顺序排列的一个轮次。黑线：无失败轮次序列的中位数。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(56, 359, `恢复加挂起：约占每轮 ${overhead.toFixed(1)} s。qwen2.5 运行于 12 核 CPU（无 GPU）。`, { size: 11, serif: true, hue: 'ink-soft' });
});
