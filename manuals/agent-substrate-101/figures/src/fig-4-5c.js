'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const restore = load(path.join(__dirname, '../../capture/lab/summary/restore-limit-x86.json'));
const alone = restore.single_restores.worker_restore_seconds;
const bursts = restore.bursts;
const columns = [{ label: '单次', seconds: alone.runs, hue: 'green' }, ...bursts.map((burst, index) => ({ label: `突发 ${index + 1}`, seconds: burst.worker_restore_seconds, hue: 'violet', burst }))];
const medians = bursts.map(burst => burst.worker_restore_seconds_median);
const flight = bursts.map(burst => burst.in_flight_median);
const rates = bursts.map(burst => burst.restores_per_second);
const sizes = bursts.map(burst => burst.restores);

module.exports = figure('fig-4-5c', {
  height: 368,
  title: '单个 actor 的 worker 恢复耗时：单独执行与突发并发对比',
  desc: `${restore.node_cpus} vCPU 单节点上 atelet 记录的共 ${alone.n + sizes.reduce((sum, size) => sum + size, 0)} 次恢复。单独执行时，${alone.n} 次 worker 内部恢复的中位耗时为 ${alone.median.toFixed(2)} s。在 ${bursts.length} 次规模为 ${Math.min(...sizes)} 至 ${Math.max(...sizes)} 的恢复突发中，同时执行的恢复数中位数为 ${Math.min(...flight)} 至 ${Math.max(...flight)}，恢复耗时中位数为 ${Math.min(...medians).toFixed(1)} 至 ${Math.max(...medians).toFixed(1)} s，每次突发每秒完成 ${Math.min(...rates).toFixed(0)} 至 ${Math.max(...rates).toFixed(0)} 次恢复。`,
}, f => {
  f.rule(22, 18, 34, 18, { hue: 'violet', width: 2.4 });
  f.text(40, 22, '一次突发：中位数、中间半数箱体、5% 至 95% 竖线', { size: 11, hue: 'violet' });

  f.dot(26, 40, { hue: 'green', r: 2 });
  f.text(36, 44, '单独恢复一次', { size: 11, hue: 'green' });
  f.text(200, 44, '突发上方数字：同时恢复数的中位数', { size: 11, hue: 'ink-soft' });

  const plot = chart(f, { x: 50, y: 82, w: 560, h: 236, xDomain: [-0.5, columns.length - 0.5], yDomain: [0, 4], xTicks: columns.map((_, index) => index), yTicks: [0, 0.5, 1, 2, 3, 4], xFormat: index => columns[index].label, yLabel: '每个 actor 的 worker 恢复耗时，秒' });
  const at = (sorted, q) => sorted[Math.round(q * (sorted.length - 1))];
  columns.forEach(({ seconds, hue, burst }, index) => {
    const cx = plot.px(index);
    if (!burst) {
      seconds.forEach((value, n) => f.dot(cx + (((n * 0.6180339887) % 1) - 0.5) * 30, plot.py(value), { hue, r: 1.6 }));
      return;
    }
    const sorted = seconds.slice().sort((a, b) => a - b);
    f.rule(cx, plot.py(at(sorted, 0.05)), cx, plot.py(at(sorted, 0.95)), { hue, width: 1.2 });
    f.rect(cx - 13, plot.py(at(sorted, 0.75)), 26, plot.py(at(sorted, 0.25)) - plot.py(at(sorted, 0.75)), { fill: color('violet-fill'), stroke: color('violet-ink') });
    f.rule(cx - 13, plot.py(at(sorted, 0.5)), cx + 13, plot.py(at(sorted, 0.5)), { hue, width: 2.4 });
    f.text(cx, plot.py(4) + 12, String(burst.in_flight_median), { size: 11, anchor: 'middle', hue: 'ink' });
  });
  f.text(plot.px(0), plot.py(alone.max) - 22, `${alone.median.toFixed(2)} s`, { size: 11, anchor: 'middle', serif: true, hue: 'green' });

  f.text(330, 356, `${Math.min(...sizes)} 至 ${Math.max(...sizes)} 并发恢复突发；每次突发每秒完成 ${Math.min(...rates).toFixed(0)} 至 ${Math.max(...rates).toFixed(0)} 次恢复`, { size: 11.5, serif: true, anchor: 'middle', hue: 'ink-soft' });
});
