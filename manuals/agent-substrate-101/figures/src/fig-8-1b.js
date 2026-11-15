'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const store = load(path.join(__dirname, '../../capture/lab/summary/object-store-x86.json'));
const places = [
  { key: 'incluster:0', name: '集群内' },
  { key: 'external:0', name: '集群外' },
  { key: 'external:20', name: '+20 ms' },
  { key: 'external:100', name: '+100 ms' },
];
const sizes = [0, 200, 1000];
const cell = (place, mib) => store.cycles.find(item => `${item.store}:${item.added_round_trip_ms}` === place && item.mib === mib);
const panels = [
  { field: 'resume_from_store_seconds', name: '从 bucket 恢复耗时（秒）', x: 56, hue: 'teal' },
  { field: 'suspend_sync_seconds', name: '同步挂起耗时（秒）', x: 356, hue: 'amber' },
];
const two = value => value.toFixed(2);
const far = cell('external:20', 1000);
const near = cell('external:0', 1000);
const cycles = store.cycles.reduce((sum, item) => sum + item.resume_from_store_seconds.n, 0);

module.exports = figure('fig-8-1b', {
  height: 356,
  title: '集群外 bucket 以及增加 20 或 100 ms 往返延迟时的耗时',
  desc: `两个面板绘制单台客户机上全部 ${cycles} 轮循环的实测数据。当 bucket 位于集群外且无额外延迟时，从 bucket 恢复 1,000 MiB 的中位耗时为 ${two(near.resume_from_store_seconds.median)} 秒；增加 20 ms 往返延迟后增至 ${two(far.resume_from_store_seconds.median)} 秒，同步挂起中位耗时则从 ${two(near.suspend_sync_seconds.median)} 秒增至 ${two(far.suspend_sync_seconds.median)} 秒。在 +100 ms 条件下，仅测量了内存无额外数据的 actor。`,
}, f => {
  f.dot(26, 18, { hue: 'ink-soft', r: 1.9 });
  f.text(36, 22, '单轮循环', { size: 11, hue: 'ink-soft' });
  f.rule(120, 18, 138, 18, { hue: 'ink-soft', width: 1.8 });
  f.text(146, 22, '同体积中位数', { size: 11, hue: 'ink-soft' });
  f.text(620, 22, '未测量：+100 ms 下的 200 与 1,000 MiB', { size: 11, serif: true, anchor: 'end', hue: 'ink-soft' });

  for (const panel of panels) {
    const c = chart(f, { x: panel.x, y: 70, w: 226, h: 232, xDomain: [-0.4, 3.4], yDomain: [0, 12], xTicks: [0, 1, 2, 3], yTicks: [0, 2, 4, 6, 8, 10, 12], xFormat: index => places[index].name, yLabel: panel.name });
    for (const mib of sizes) {
      const points = [];
      places.forEach((place, index) => {
        const item = cell(place.key, mib);
        if (!item) return;
        const runs = item[panel.field];
        points.push([index, runs.median]);
        runs.runs.forEach((value, n) => f.dot(c.px(index) + (n - (runs.runs.length - 1) / 2) * 3.4, c.py(value), { hue: panel.hue, r: 1.8 }));
      });
      c.series(points, { hue: panel.hue, dots: false, width: 1.6 });
      const [lastX, lastY] = points[points.length - 1];
      f.text(c.px(lastX) + 12, c.py(lastY) + (mib === 1000 ? -9 : 4), `${mib.toLocaleString('en-US')} MiB`, { size: 11, weight: 700, hue: panel.hue });
    }
  }
  f.text(320, 344, 'bucket 所在位置，以及节点与 bucket 之间增加的往返延迟', { size: 11.5, serif: true, anchor: 'middle', hue: 'ink-soft' });
});
