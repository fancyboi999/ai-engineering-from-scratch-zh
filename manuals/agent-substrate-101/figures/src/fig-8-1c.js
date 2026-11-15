'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const store = load(path.join(__dirname, '../../capture/lab/summary/remote-store-x86.json'));
const places = [
  { key: 'remote:0:0', name: '明文' },
  { key: 'remote-tls:0:0', name: 'TLS' },
  { key: 'remote:0:100', name: '100 Mbit/s' },
  { key: 'remote:0:20', name: '20 Mbit/s' },
  { key: 'remote:100:0', name: '+100 ms' },
];
const sizes = [0, 200, 1000];
const cell = (place, mib) => store.cycles.find(item => `${item.store}:${item.added_round_trip_ms}:${item.rate_mbit}` === place && item.mib === mib);
const panels = [
  { field: 'seconds_to_first_200', name: '请求至首个 200 的耗时（秒）', x: 56, hue: 'teal', limit: true },
  { field: 'suspend_sync_seconds', name: '同步挂起耗时（秒）', x: 362, hue: 'amber', limit: false },
];
const top = 70;
const tall = 240;
const power = exponent => (10 ** exponent).toLocaleString('en-US');
const remote = store.cycles.filter(item => item.store !== 'local');
const cycles = remote.reduce((sum, item) => sum + item.suspend_sync_seconds.n, 0);
const late = remote.reduce((sum, item) => sum + (item.first_answer_codes['504'] || 0), 0);
const plain = cell('remote:0:0', 1000);
const slow = cell('remote:0:20', 200);

module.exports = figure('fig-8-1c', {
  height: 390,
  title: '另一台客户机上的 bucket：对数坐标下每轮循环的耗时',
  desc: `两个面板绘制 bucket 位于另一台客户机时全部 ${cycles} 轮循环的实测耗时（10 的幂次对数刻度）。不做流量整形时，发往 1,000 MiB actor 的请求拿到首个 200 的中位耗时为 ${plain.seconds_to_first_200.median.toFixed(1)} 秒。限速 20 Mbit/s 时，200 MiB actor 拿到首个 200 的中位耗时为 ${slow.seconds_to_first_200.median.toFixed(1)} 秒，同步挂起中位耗时为 ${slow.suspend_sync_seconds.median.toFixed(1)} 秒。共有 ${late} 轮循环首次响应在 10 秒后返回 504，后续重试请求返回 200。`,
}, f => {
  f.dot(26, 18, { hue: 'ink-soft', r: 1.9 });
  f.text(36, 22, '单轮循环', { size: 11, hue: 'ink-soft' });
  f.rule(110, 18, 128, 18, { hue: 'ink-soft', width: 1.8 });
  f.text(136, 22, '5 轮循环中位数', { size: 11, hue: 'ink-soft' });
  f.rule(300, 18, 318, 18, { hue: 'rose', width: 1.4, dash: 'dashed' });
  f.text(326, 22, '路由器在 10 s 后返回 504', { size: 11, hue: 'ink-soft' });

  for (const panel of panels) {
    const c = chart(f, { x: panel.x, y: top, w: 230, h: tall, xDomain: [-0.5, 4.5], yDomain: [-1, 3], xTicks: [0, 1, 2, 3, 4], yTicks: [-1, 0, 1, 2, 3], xFormat: () => '', yFormat: power, yLabel: panel.name });
    places.forEach((place, index) => f.text(c.px(index), top + tall + (index % 2 ? 31 : 17), place.name, { size: 11, anchor: 'middle', hue: 'ink-soft' }));
    if (panel.limit) f.rule(c.px(-0.5), c.py(1), c.px(4.5), c.py(1), { hue: 'rose', width: 1.4, dash: 'dashed' });
    for (const mib of sizes) {
      places.forEach((place, index) => {
        const item = cell(place.key, mib);
        if (!item) return;
        const runs = item[panel.field];
        const middle = c.py(Math.log10(runs.median));
        runs.runs.forEach((value, n) => f.dot(c.px(index) + (n - (runs.runs.length - 1) / 2) * 3.4, c.py(Math.log10(value)), { hue: panel.hue, r: 1.8 }));
        if (runs.n > 1) f.rule(c.px(index) - 12, middle, c.px(index) + 12, middle, { hue: panel.hue, width: 1.4 });
        f.text(c.px(index), c.py(Math.log10(runs.max)) - 8, mib.toLocaleString('en-US'), { size: 11, weight: 700, anchor: 'middle', hue: panel.hue });
      });
    }
  }
  f.text(320, 362, '从节点通往另一台客户机上 bucket 的网络路径', { size: 11.5, serif: true, anchor: 'middle', hue: 'ink-soft' });
  f.text(320, 378, '每组上方的数字为 actor 内存中的数据体积（MiB）', { size: 11, serif: true, anchor: 'middle', hue: 'ink-soft' });
});
