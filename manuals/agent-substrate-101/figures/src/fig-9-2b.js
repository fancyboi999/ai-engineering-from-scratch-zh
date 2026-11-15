'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const agent = load(path.join(__dirname, '../../capture/lab/summary/demos-x86.json')).stateful_agent;
const groups = [
  { label: '运行中 actor', kind: 'memory', name: '内存保真度', phase: 'warm', hue: 'green' },
  { label: '运行中 actor', kind: 'volumes', name: '卷保真度', phase: 'warm', hue: 'teal' },
  { label: '挂起之后', kind: 'memory', name: '内存保真度', phase: 'resumed', hue: 'green' },
  { label: '挂起之后', kind: 'volumes', name: '卷保真度', phase: 'resumed', hue: 'teal' },
].map(group => ({ ...group, values: agent[group.kind].turns.filter(turn => turn.phase === group.phase).map(turn => turn.seconds) }));
const TOP = 36;
const BOTTOM = 256;
const MAX = 6;
const py = seconds => BOTTOM - (seconds / MAX) * (BOTTOM - TOP);
const xs = [140, 270, 420, 540];
const two = value => value.toFixed(2);
const range = values => `${two(Math.min(...values))} 至 ${two(Math.max(...values))} s`;

module.exports = figure('fig-9-2b', {
  height: 318,
  title: '不同快照保真度与 actor 状态下的单轮 agent 耗时',
  desc: `第二台 x86 服务器客户机上使用模拟模型时单轮 agent 调用的客户端耗时（秒）。在运行中的 actor 上，内存保真度单轮耗时 ${range(groups[0].values)}，卷保真度耗时 ${range(groups[1].values)}（各 ${groups[0].values.length} 轮）。挂起恢复后，内存保真度单轮耗时 ${range(groups[2].values)}，卷保真度耗时 ${range(groups[3].values)}（各 ${groups[2].values.length} 轮）。`,
}, f => {
  for (let s = 0; s <= MAX; s += 1) {
    f.rule(70, py(s), 600, py(s), { hue: 'ink-mute', opacity: s === 0 ? 1 : 0.2 });
    f.text(60, py(s) + 4, String(s), { size: 11, anchor: 'end', hue: 'ink-soft' });
  }
  f.text(70, 22, '单轮客户端耗时（秒）', { size: 11.5, serif: true, hue: 'ink-soft' });
  groups.forEach((group, index) => {
    const x = xs[index];
    group.values.forEach((value, n) => f.dot(x + (n - (group.values.length - 1) / 2) * 9, py(value), { hue: group.hue, r: 3.4 }));
    const top = py(Math.max(...group.values));
    f.text(x, top - 24, group.name, { size: 11.5, weight: 700, hue: group.hue, anchor: 'middle', knock: true });
    f.text(x, top - 10, range(group.values), { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle', knock: true });
  });
  f.text(205, BOTTOM + 20, '在运行中 actor 上执行一轮', { size: 12, weight: 700, anchor: 'middle' });
  f.text(480, BOTTOM + 20, '触发 actor 恢复的一轮', { size: 12, weight: 700, anchor: 'middle' });
  f.text(205, BOTTOM + 36, `每种保真度各 ${groups[0].values.length} 轮`, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(480, BOTTOM + 36, `每种保真度各 ${groups[2].values.length} 轮`, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
});
