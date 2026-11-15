'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/validation-parallel-x86.json'));
const points = data.points;
const first = points[0];
const last = points[points.length - 1];
const total = points.reduce((sum, p) => sum + p.requests, 0);
const served = points.reduce((sum, p) => sum + p.ok, 0);
const two = value => (Math.round(value * 100) / 100).toFixed(2);
const more = Math.round((last.seconds.median / first.seconds.median - 1) * 100);
const medians = points.map(p => `${p.x} 并发为 ${two(p.seconds.median)} s`).join('、');
const slots = data.workers_before.cpu_millicores_capacity / 1000;

module.exports = figure('fig-4-4b', {
  height: 352,
  title: '恢复耗时与同一时刻并发恢复数的关系',
  desc: `带 gVisor、池容量为 ${slots} 个 actor 的 x86 服务器客户机上，向已挂起 50 MiB actor 发一次请求的耗时秒数与同一时刻并发请求数的关系。共 ${total} 个请求各为一个小点（每档并发跑五轮），实线连接中位数。${total} 个请求中 ${served} 个返回 200。中位数依次为：${medians}。${last.x} 并发的 ${last.requests} 个请求中最慢耗时 ${two(last.seconds.max)} s。虚线标出 0.5 s。`,
}, f => {
  const c = chart(f, { x: 46, y: 40, w: 420, h: 270, xScale: 'log2', xDomain: [0.8, 20], yDomain: [0, 0.6], xTicks: points.map(p => p.x), yTicks: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6], xFormat: v => String(v), yFormat: v => v.toFixed(1), xLabel: '同一时刻并发恢复数（每个挂起 actor 发一次请求）', yLabel: '客户端从请求到回复的耗时，秒' });

  f.rule(c.px(0.8), c.py(0.5), c.px(20), c.py(0.5), { hue: 'ink-soft', dash: 'dashed' });
  c.series(points.map(p => [p.x, p.seconds.median]), { hue: 'violet', dots: false });
  for (const p of points) {
    const sorted = [...p.runs].sort((a, b) => a - b);
    sorted.forEach((v, i) => f.dot(c.px(p.x) + ((i % 7) - 3) * 2.2, c.py(v), { hue: 'violet', r: 1.7 }));
    f.text(c.px(p.x), c.py(p.seconds.max) - 9, `${two(p.seconds.median)} s`, { size: 11, hue: 'violet', anchor: 'middle', weight: 700 });
    f.text(c.px(p.x), c.py(0.04), `${p.ok}/${p.requests}`, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  }

  const right = c.px(20) + 14;
  f.text(right, c.py(last.seconds.median) - 10, `${last.x} 并发`, { size: 11.5, weight: 700, hue: 'violet' });
  f.text(right, c.py(last.seconds.median) + 5, `${two(last.seconds.median)} s（${last.seconds.n} 次中位）`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right, c.py(last.seconds.median) + 20, `比 1 并发慢 ${more}%`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right, c.py(last.seconds.median) + 35, `最慢 ${two(last.seconds.max)} s`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right, c.py(0.5) + 4, '0.5 s', { size: 11.5, weight: 700, hue: 'ink-soft' });
  f.text(right, c.py(0.04), '返回 200 / 发送数', { size: 11, serif: true, hue: 'ink-soft' });

  f.dot(c.px(0.8) + 15, c.py(0.56) - 4, { hue: 'ink-soft', r: 1.7 });
  f.text(c.px(0.8) + 24, c.py(0.56), '单次请求', { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(c.px(0.8) + 92, c.py(0.56) - 4, c.px(0.8) + 110, c.py(0.56) - 4, { hue: 'ink-soft', width: 1.8 });
  f.text(c.px(0.8) + 116, c.py(0.56), '单档并发中位数', { size: 11, serif: true, hue: 'ink-soft' });
});
