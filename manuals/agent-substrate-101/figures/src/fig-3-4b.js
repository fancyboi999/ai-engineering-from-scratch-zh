'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/validation-fidelity-x86.json'));
const level = name => data.levels.find(l => l.fidelity === `SNAPSHOT_FIDELITY_${name}`);
const two = value => (Math.round(value * 100) / 100).toFixed(2);
const size = snapshot => (snapshot.kib < 1024 ? `${snapshot.kib} KiB` : `${snapshot.mib.toFixed(1)} MiB`);
const column = (name, x, keeps, resume) => {
  const l = level(name);
  const c = l.after_last_resume;
  return { name, x, keeps, resume, median: `${two(l.resume_node.seconds.median)} s（${l.resume_node.seconds.n} 次中位）`, snapshot: `快照 ${size(l.node_snapshot)}`, seen: [`内存 ${c.memory_count}，根文件 ${c.rootfs_count}，`, `持久卷 ${c.volume_count}`], level: l };
};
const columns = [
  column('VOLUMES', 150, [true, false, false], '新进程'),
  column('ROOTFS', 310, [true, true, false], '新进程'),
  column('MEMORY', 470, [true, true, true], '原进程继续'),
];
const calls = columns[0].level.requests;
const said = columns.map(c => `${c.name}：计数 ${c.seen.join('')}${c.median}，${c.snapshot}`).join('；');
const layers = [
  ['持久卷', 'durableDir 挂载'],
  ['根文件系统', '启动后的写入'],
  ['进程内存', '进程与 RAM'],
];

module.exports = figure('fig-3-4b', {
  height: 370,
  title: '各快照保真度分别保留什么',
  desc: `三列对应三种快照保真度级别。SNAPSHOT_FIDELITY_VOLUMES 仅保留持久卷，恢复时启动新进程。SNAPSHOT_FIDELITY_ROOTFS 保留持久卷与根文件系统写入，恢复时同样启动新进程。SNAPSHOT_FIDELITY_MEMORY 同时保留持久卷、根文件系统写入与进程内存，因此原进程继续运行。下方各行给出 x86 服务器客户机上每种级别各一个 actor 在夹杂挂起的 ${calls} 次调用后的三项计数、节点恢复中位数及快照大小：${said}。`,
}, f => {
  f.kicker(20, 18, '层级');
  columns.forEach(column => {
    f.text(column.x + 75, 18, column.name, { size: 12, weight: 700, anchor: 'middle' });
  });
  layers.forEach(([title, sub], row) => {
    const y = 30 + row * 58;
    f.text(20, y + 22, title, { size: 12, weight: 700 });
    f.text(20, y + 38, sub, { size: 11, serif: true, hue: 'ink-soft' });
    columns.forEach(column => {
      const kept = column.keeps[row];
      f.box({ x: column.x, y, w: 150, h: 48, hue: kept ? 'teal' : 'grey', dash: kept ? undefined : 'dashed', title: kept ? '保留' : '丢失', weight: kept ? 700 : 400 });
    });
  });
  f.kicker(20, 222, '恢复时');
  f.kicker(20, 280, '计数');
  f.text(20, 296, `${calls} 次调用后`, { size: 11, serif: true, hue: 'ink-soft' });
  columns.forEach(c => {
    f.text(c.x + 75, 222, c.resume, { size: 11.5, weight: 700, anchor: 'middle', hue: 'ink' });
    f.text(c.x + 75, 238, c.median, { size: 11, serif: true, anchor: 'middle', hue: 'violet' });
    f.text(c.x + 75, 254, c.snapshot, { size: 11, serif: true, anchor: 'middle', hue: 'teal' });
    c.seen.forEach((line, index) => f.text(c.x + 75, 280 + index * 16, line, { size: 11, serif: true, anchor: 'middle', hue: 'ink-soft' }));
  });
  f.rule(20, 264, 620, 264, { hue: 'ink-mute', opacity: 0.4 });
  f.text(20, 326, '枚举名均带前缀 SNAPSHOT_FIDELITY_。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 342, '右侧每个级别都包含其左侧级别保留的内容。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 358, '计数为 1 表示在最后一次恢复时重新开始计数。', { size: 11, serif: true, hue: 'ink-soft' });
});
