'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/lab/summary/suspend-x86.json'));
const fast = runs.async.points;
const slow = runs.sync.points;
const fastLast = fast[fast.length - 1];
const slowLast = slow[slow.length - 1];
const gap = slowLast.seconds.median - fastLast.seconds.median;
const total = [...fast, ...slow].reduce((sum, p) => sum + p.runs.length, 0);
const two = value => (Math.round(value * 100) / 100).toFixed(2);
const medians = points => points.map(p => `${p.x} MiB 为 ${two(p.seconds.median)} s`).join('、');

module.exports = figure('fig-3-3b', {
  height: 352,
  title: '同步挂起给调用方增加的等待时间',
  desc: `x86 服务器客户机上，kubectl ate suspend actor 返回耗时秒数与 actor 所持随机内存 MiB 的关系。共 ${total} 次挂起各为一个小点，实线连接中位数。默认的异步挂起在快照写入节点后即返回，中位数为：${medians(fast)}（每种规格 10 次）。加上 --mode sync 后命令在上传至对象存储完成后才返回，中位数为：${medians(slow)}（每种规格 5 次）。在 1000 MiB 时同步挂起多耗时 ${gap.toFixed(1)} s。`,
}, f => {
  const c = chart(f, { x: 46, y: 40, w: 440, h: 270, xDomain: [0, 1000], yDomain: [0, 8], xTicks: [0, 50, 200, 500, 1000], yTicks: [0, 2, 4, 6, 8], xFormat: v => String(v), xLabel: 'actor 持有的内存，MiB', yLabel: 'kubectl ate suspend actor 返回耗时，秒' });
  const strip = (points, hue, dx) => {
    for (const p of points) {
      const x = c.px(p.x) + (p.x === 0 ? dx + 6 : dx);
      f.rule(x, c.py(p.seconds.max), x, c.py(p.seconds.min), { hue, opacity: 0.45 });
      for (const v of p.runs) f.dot(x, c.py(v), { hue, r: 1.9 });
    }
  };
  c.series(slow.map(p => [p.x, p.seconds.median]), { hue: 'teal', name: 'sync', dots: false });
  c.series(fast.map(p => [p.x, p.seconds.median]), { hue: 'violet', name: 'async', dots: false });
  strip(slow, 'teal', 4);
  strip(fast, 'violet', -4);

  const lx = c.px(1000) + 14;
  f.text(lx, c.py(slowLast.seconds.median) + 4, '--mode sync', { size: 11.5, weight: 700, hue: 'teal' });
  f.text(lx, c.py(slowLast.seconds.median) + 19, `${two(slowLast.seconds.median)} s（${slowLast.seconds.n} 次中位）`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(lx, c.py(slowLast.seconds.median) + 33, '上传完成后返回', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(lx, c.py(fastLast.seconds.median) + 4, '异步（默认）', { size: 11.5, weight: 700, hue: 'violet' });
  f.text(lx, c.py(fastLast.seconds.median) + 19, `${two(fastLast.seconds.median)} s（${fastLast.seconds.n} 次中位）`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(lx, c.py(fastLast.seconds.median) + 33, '快照写入节点即回', { size: 11, serif: true, hue: 'ink-soft' });

  const bx = c.px(1000) - 22;
  f.path(`M${bx} ${c.py(fastLast.seconds.median) - 5} V${c.py(slowLast.seconds.median) + 5}`, { hue: 'ink-soft', both: true, width: 1, packet: false });
  f.text(bx - 8, c.py((slowLast.seconds.median + fastLast.seconds.median) / 2) + 4, `多等 ${gap.toFixed(1)} s`, { size: 11, serif: true, hue: 'ink-soft', anchor: 'end', knock: true });
  f.text(bx - 8, c.py((slowLast.seconds.median + fastLast.seconds.median) / 2) + 18, '等待上传完成', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end', knock: true });

  f.dot(c.px(20) + 3, c.py(7.4) - 4, { hue: 'ink-soft', r: 1.9 });
  f.text(c.px(20) + 12, c.py(7.4), '单次挂起', { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(c.px(20) + 74, c.py(7.4) - 4, c.px(20) + 92, c.py(7.4) - 4, { hue: 'ink-soft', width: 1.8 });
  f.text(c.px(20) + 98, c.py(7.4), '单一规格中位数', { size: 11, serif: true, hue: 'ink-soft' });
});
