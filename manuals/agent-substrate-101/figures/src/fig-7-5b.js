'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/agent-executor-x86.json'));
const seconds = value => `${value.toFixed(2)} s`;
const columns = [
  { name: 'suspend', key: 'suspend', hue: 'amber' },
  { name: 'resume', key: 'resume', hue: 'amber' },
  { name: 'ssh 单条命令', key: 'ssh', hue: 'plum' },
].map(column => ({ ...column, runs: data.cycles.runs[column.key], stat: data.cycles.seconds[column.key] }));
const more = load(path.join(__dirname, '../../capture/lab/summary/agent-executor-followups-x86.json'));
const refused = more.clone.resume_with_https_rule;
const kept = more.clone.resume_after_clone;
const firsts = [
  { name: '无 workspace', note: '运行 1 次', value: data.first_resume.no_workspace, hue: 'green' },
  { name: 'clone，无出站规则', note: '运行 1 次，5 次重试均失败', value: data.first_resume.workspace_clone_blocked, hue: 'rose' },
  { name: 'clone，https 规则', note: `${refused.seconds.n} 次中位数，5 次重试均失败`, value: refused.seconds.median, hue: 'rose' },
  { name: 'clone，tlsPassthrough 规则', note: '运行 1 次，clone 成功', value: more.clone.resume_with_passthrough_rule_seconds, hue: 'violet' },
  { name: '后续恢复（保留检出目录）', note: `${kept.seconds.n} 次中位数`, value: kept.seconds.median, hue: 'green' },
];
const HALF = 34;
const TOP = 64;
const HEIGHT = 210;

function ranked(values, py) {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted.map((value, index) => ({ dx: -HALF + (2 * HALF * index) / (sorted.length - 1), y: py(value) }));
}

module.exports = figure('fig-7-5b', {
  height: 346,
  title: '无 workspace 任务的 Agent Executor 命令耗时与克隆仓库任务的恢复耗时',
  desc: `针对 Agent Executor 同一提交实测的两张图。左图为无 workspace 的单个 task 在 ${columns[0].stat.n} 轮循环中每次运行的耗时（每点一次）：ax suspend task 中位数为 ${seconds(columns[0].stat.median)}，ax resume task 为 ${seconds(columns[1].stat.median)}，经 ax ssh 执行单条命令为 ${seconds(columns[2].stat.median)}。右图为 runner 准备 workspace 时 ax resume task 的耗时：无 workspace 为 ${seconds(firsts[0].value)}；无出站规则时 clone 为 ${seconds(firsts[1].value)}；配置 https 规则由网关做 TLS 拦截导致 git 拒绝证书时，${refused.seconds.n} 次恢复的中位数为 ${seconds(firsts[2].value)}；配置 tlsPassthrough 规则使 clone 成功时为 ${seconds(firsts[3].value)}；后续保留检出目录的恢复中位数为 ${seconds(firsts[4].value)}。耗时较长的恢复源于 runner 的 5 次重试，而非恢复本身的开销。`,
}, f => {
  const left = chart(f, { x: 56, y: TOP, w: 250, h: HEIGHT, xDomain: [0, columns.length], yDomain: [0, 1], yTicks: [0, 0.25, 0.5, 0.75, 1], xLabel: 'ax 命令（每项运行 10 次）', yLabel: '每次运行的客户端耗时（秒）' });
  f.kicker(left.px(1.5), 24, '首次恢复之后', { hue: 'amber', anchor: 'middle' });
  f.kicker(360, 24, '带 workspace 的 ax resume task', { hue: 'rose' });
  columns.forEach((column, index) => {
    const cx = left.px(index + 0.5);
    const my = left.py(column.stat.median);
    f.rule(cx - HALF - 8, my, cx + HALF + 8, my, { hue: 'ink', width: 1.4 });
    for (const dot of ranked(column.runs, left.py)) f.dot(cx + dot.dx, dot.y, { hue: column.hue, r: 2.2 });
    f.text(cx, left.py(column.stat.max) - 10, seconds(column.stat.median), { size: 12, weight: 700, hue: column.hue, anchor: 'middle', knock: true });
    f.text(cx, TOP + HEIGHT + 18, column.name, { size: 11, anchor: 'middle' });
  });
  const scale = 190 / 14;
  f.rule(360, 46, 360, 46 + firsts.length * 50, { hue: 'ink' });
  firsts.forEach((first, index) => {
    const y = 58 + index * 50;
    const width = Math.max(first.value * scale, 2);
    f.text(366, y, first.name, { size: 11 });
    f.rect(360, y + 7, width, 12, { hue: first.hue });
    f.text(360 + width + 6, y + 17, seconds(first.value), { size: 12, weight: 700, hue: first.hue });
    f.text(366, y + 33, first.note, { size: 11, serif: true, hue: 'ink-soft' });
  });
  f.text(56, 336, '每个点：一次运行。黑线：中位数。每个 task 均运行 sleep infinity。', { size: 11, serif: true, hue: 'ink-soft' });
});
