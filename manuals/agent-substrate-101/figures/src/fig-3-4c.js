'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/footprint-x86.json'));
const full = data.with_25_suspended_actors;
const empty = data.after_delete;
const held = data.local_snapshot_per_actor.reduce((sum, row) => sum + row.x, 0) * (full.actors / data.local_snapshot_per_actor.length);
const mib = value => value.toLocaleString('en-US');
const rows = [
  { name: '节点本地快照', key: 'node_snapshots_mib', hue: 'violet', note: '随 actor 一同删除' },
  { name: '节点快照缓存', key: 'node_snapshot_cache_mib', hue: 'violet', note: '未缩小' },
  { name: '对象存储', key: 'object_store_mib', hue: 'teal', note: '黄金快照保留' },
];
const X0 = 204;
const X1 = 572;
const MAX = 12000;
const px = value => X0 + (value / MAX) * (X1 - X0);

module.exports = figure('fig-3-4c', {
  height: 282,
  title: '25 个挂起 actor 的磁盘占用，以及删除后释放的空间',
  desc: `水平柱状图展示 x86 服务器客户机上三处 du 统计的 MiB 数，对比存在 ${full.actors} 个共持有 ${mib(held)} MiB 内存的挂起 actor 时与删除这些 actor 之后。节点本地快照：先为 ${mib(full.node_snapshots_mib)} MiB，删除后为 ${mib(empty.node_snapshots_mib)} MiB。节点快照缓存：先为 ${mib(full.node_snapshot_cache_mib)} MiB，删除后仍为 ${mib(empty.node_snapshot_cache_mib)} MiB。对象存储：先为 ${mib(full.object_store_mib)} MiB，删除后为 ${mib(empty.object_store_mib)} MiB（即五个模板的黄金快照）。虚线标出 ${mib(held)} MiB。`,
}, f => {
  f.rect(20, 10, 14, 10, { fill: color('ink-soft'), stroke: 'none' });
  f.text(40, 19, `含 ${full.actors} 个挂起的 actor`, { size: 11, hue: 'ink-soft' });
  f.rect(250, 10, 14, 10, { fill: color('paper'), stroke: color('ink-soft') });
  f.text(270, 19, '删除这些 actor 后', { size: 11, hue: 'ink-soft' });

  f.rule(px(held), 34, px(held), 216, { hue: 'ink', dash: 'dashed' });
  f.text(px(held) - 6, 46, `${mib(held)} MiB：${full.actors} 个 actor 持有的总内存`, { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });

  rows.forEach((row, index) => {
    const y = 60 + index * 52;
    const before = full[row.key];
    const after = empty[row.key];
    f.text(X0 - 10, y + 12, row.name, { size: 11.5, anchor: 'end', weight: 700 });
    f.text(X0 - 10, y + 28, row.note, { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
    f.rect(X0, y, px(before) - X0, 15, { fill: color(`${row.hue}-ink`), stroke: 'none' });
    f.text(px(before) + 6, y + 12, mib(before), { size: 11.5, hue: row.hue, weight: 700, knock: px(before) < px(held) });
    f.rect(X0, y + 18, Math.max(px(after) - X0, 1), 15, { fill: color(`${row.hue}-fill`), stroke: color(`${row.hue}-ink`) });
    f.text(px(after) + 6, y + 30, mib(after), { size: 11.5, hue: row.hue });
  });

  f.rule(X0, 34, X0, 216, { hue: 'ink' });
  f.rule(X0, 216, X1, 216, { hue: 'ink' });
  for (let tick = 0; tick <= MAX; tick += 2000) {
    f.rule(px(tick), 216, px(tick), 220, { hue: 'ink' });
    f.text(px(tick), 233, mib(tick), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(X1 + 30, 233, 'MiB', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 256, '0、50、200、500、1,000 MiB 随机字节各 5 个 actor，创建后经过 3 至 8 分钟。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 272, '对象存储为每个 actor 存一份快照，并为每个模板存一份黄金快照。', { size: 11, serif: true, hue: 'ink-soft' });
});
