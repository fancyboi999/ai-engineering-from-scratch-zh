'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/kagent-turns-x86.json'));
const seconds = value => `${value.toFixed(3)} s`;
const columns = [
  { name: '恢复', runs: data.runs.resume_seconds_turns_only, stat: data.resume_seconds.turns_only, hue: 'amber' },
  { name: '挂起', runs: data.runs.suspend_seconds, stat: data.suspend_seconds, hue: 'amber' },
  { name: '间隔 4 s 轮次', runs: data.runs.server_turn_seconds['A-spaced'], stat: data.server_turn_seconds['A-spaced'], hue: 'plum' },
  { name: '无间隔轮次', runs: data.runs.server_turn_seconds['B-b2b'], stat: data.server_turn_seconds['B-b2b'], hue: 'plum' },
  { name: '首次轮次', runs: data.runs.server_turn_seconds['C-first'], stat: data.server_turn_seconds['C-first'], hue: 'plum' },
];
const HALF = 40;

function ranked(values, py) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted.map((value, index) => ({ dx: -HALF + (2 * HALF * index) / (sorted.length - 1), y: py(value) }));
}

module.exports = figure('fig-7-1b', {
  height: 356,
  title: '有间隔与无间隔的 kagent 轮次耗时相同',
  desc: `使用模拟模型的 kagent 测试中每次运行各绘为一个点，横线表示中位数：${columns[0].stat.n} 轮恢复的中位数为 ${seconds(columns[0].stat.median)}，${columns[1].stat.n} 次挂起的中位数为 ${seconds(columns[1].stat.median)}，间隔 4 秒的轮次为 ${seconds(columns[2].stat.median)}，无间隔连续轮次为 ${seconds(columns[3].stat.median)}，新会话首次轮次为 ${seconds(columns[4].stat.median)}。`,
}, f => {
  const c = chart(f, { x: 62, y: 64, w: 548, h: 220, xDomain: [0, columns.length], yDomain: [0, 1.1], yTicks: [0, 0.25, 0.5, 0.75, 1], yLabel: '使用模拟模型时每次运行的耗时，秒' });
  f.kicker(c.px(1), 24, '轮次内的状态迁移', { hue: 'amber', anchor: 'middle' });
  f.kicker(c.px(3.5), 24, '集群内的完整轮次', { hue: 'plum', anchor: 'middle' });
  f.rule(c.px(2), 64, c.px(2), 284, { hue: 'ink-mute', dash: 'dashed', opacity: 0.6 });
  columns.forEach((column, index) => {
    const cx = c.px(index + 0.5);
    const my = c.py(column.stat.median);
    f.rule(cx - HALF - 8, my, cx + HALF + 8, my, { hue: 'ink', width: 1.4 });
    for (const dot of ranked(column.runs, c.py)) f.dot(cx + dot.dx, dot.y, { hue: column.hue, r: 1.8 });
    f.text(cx, c.py(column.stat.max) - 9, seconds(column.stat.median), { size: 12, weight: 700, hue: column.hue, anchor: 'middle', knock: true });
    f.text(cx, 302, column.name, { size: 11, anchor: 'middle' });
    f.text(cx, 317, `${column.stat.n} 次`, { size: 11, anchor: 'middle', serif: true, hue: 'ink-soft' });
  });
  const apart = Math.abs(columns[3].stat.median - columns[2].stat.median).toFixed(3);
  const by = c.py(0.93);
  f.path(`M${c.px(2.5)} ${by + 5} V${by} H${c.px(3.5)} V${by + 5}`, { hue: 'plum', head: false, packet: false });
  f.text(c.px(3), by - 6, `无热轮次：相差仅 ${apart} s`, { size: 11, serif: true, anchor: 'middle', hue: 'plum', knock: true });
  f.text(62, 344, '每点代表一次运行（由快到慢排列），黑线表示中位数。', { size: 11, serif: true, hue: 'ink-soft' });
});
