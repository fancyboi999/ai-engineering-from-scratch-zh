'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const agent = load(path.join(__dirname, '../../capture/lab/summary/demos-x86.json')).stateful_agent;
const after = kind => agent[kind].turns.find(turn => turn.phase === 'resumed');
const memory = after('memory');
const volumes = after('volumes');
const rows = [
  ['对话消息数', `${memory.memory_turns}/${memory.db_turns} 条消息`, true, `${volumes.memory_turns}/${volumes.db_turns} 条消息`, true],
  ['启动时从 SQLite 加载', `${memory.rehydrated_from_db} 条消息`, true, `${volumes.rehydrated_from_db} 条消息`, true],
  ['变量中的便签', memory.note ? '保留' : '丢失', Boolean(memory.note), volumes.note ? '保留' : '丢失', Boolean(volumes.note)],
  ['/tmp 下的临时文件', memory.scratch_file ? '保留' : '丢失', memory.scratch_file, volumes.scratch_file ? '保留' : '丢失', volumes.scratch_file],
  ['进程存活时长', `${memory.process_age_s} s，原进程`, true, `${volumes.process_age_s} s，新进程`, false],
  ['本轮耗时', `${memory.seconds.toFixed(2)} s`, true, `${volumes.seconds.toFixed(2)} s`, false],
];

module.exports = figure('fig-9-2', {
  height: 318,
  title: '两种快照保真度下挂起后首轮调用时 agent 保有的状态',
  desc: `第二台 x86 服务器客户机上同一 agent 在挂起后首轮调用时的两列对比。在内存保真度下，它保有 ${memory.memory_turns} 条消息、便签、/tmp 下的文件以及已存活 ${memory.process_age_s} 秒的原进程，该轮耗时 ${memory.seconds.toFixed(2)} 秒。在卷保真度下，它因启动时从 SQLite 重新加载 ${volumes.rehydrated_from_db} 条消息而保有 ${volumes.memory_turns} 条消息，但丢失了便签与 /tmp 文件，新进程仅存活 ${volumes.process_age_s} 秒，该轮耗时 ${volumes.seconds.toFixed(2)} 秒。`,
}, f => {
  const left = 214;
  const right = 430;
  f.box({ x: left, y: 16, w: 196, h: 40, hue: 'green', title: '内存保真度', sub: 'SNAPSHOT_FIDELITY_MEMORY' });
  f.box({ x: right, y: 16, w: 196, h: 40, hue: 'teal', title: '卷保真度', sub: 'SNAPSHOT_FIDELITY_VOLUMES' });
  rows.forEach(([name, a, aOk, b, bOk], index) => {
    const y = 72 + index * 40;
    f.rule(16, y - 6, 626, y - 6, { hue: 'ink-mute', opacity: 0.25 });
    f.text(16, y + 16, name, { size: 12, weight: 700 });
    f.dot(left + 10, y + 12, { hue: aOk ? 'green' : 'rose', r: 4 });
    f.text(left + 22, y + 16, a, { size: 11.5, hue: aOk ? 'green' : 'rose' });
    f.dot(right + 10, y + 12, { hue: bOk ? 'green' : 'rose', r: 4 });
    f.text(right + 22, y + 16, b, { size: 11.5, hue: bOk ? 'green' : 'rose' });
  });
});
