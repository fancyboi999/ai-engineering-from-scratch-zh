'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/lab/summary/resume-x86.json'));
const first = runs.new_actor_first_call.points;
const later = runs.node_local.points;
const last = first[first.length - 1];
const mid = first.find(p => p.x === 500);
const small = first.find(p => p.x === 200);
const lastLater = later[later.length - 1];
const two = value => (Math.round(value * 100) / 100).toFixed(2);
const medians = points => points.map(p => `${p.x} MiB 为 ${two(p.seconds.median)} s`).join('、');
const sorted = p => p.runs.slice().sort((a, b) => a - b).map(two).join('、');

module.exports = figure('fig-3-1b', {
  height: 352,
  title: '新 actor 的首次调用耗时与模板内存的关系',
  desc: `x86 服务器客户机上，新 actor 首次请求（需恢复黄金快照）耗时秒数对模板所持内存 MiB 的关系。25 个新 actor 各为一个圆点，每种规格 5 个，实线连接中位数：${medians(first)}。500 MiB 的 5 次首次调用耗时 ${sorted(mid)} s，1000 MiB 的 5 次耗时 ${sorted(last)} s。另一条线展示单个 actor 从节点本地快照连续恢复 10 次的中位数，在 1000 MiB 时为 ${two(lastLater.seconds.median)} s。`,
}, f => {
  const c = chart(f, { x: 46, y: 40, w: 440, h: 270, xDomain: [0, 1000], yDomain: [0, 14], xTicks: [0, 50, 200, 500, 1000], yTicks: [0, 2, 4, 6, 8, 10, 12, 14], xFormat: v => String(v), xLabel: '模板持有的内存，MiB', yLabel: '客户端从请求到回复的耗时，秒' });
  c.series(later.map(p => [p.x, p.seconds.median]), { hue: 'violet', name: 'later resume', dots: false });
  c.series(first.map(p => [p.x, p.seconds.median]), { hue: 'teal', name: 'first call', dots: false });
  for (const p of first) {
    const x = c.px(p.x) + (p.x === 0 ? 5 : 0);
    f.rule(x, c.py(p.seconds.max), x, c.py(p.seconds.min), { hue: 'teal', opacity: 0.45 });
    for (const v of p.runs) f.dot(x, c.py(v), { hue: 'teal', r: 2.4 });
  }

  const lx = c.px(1000) + 14;
  f.text(lx, c.py(last.seconds.max) + 4, `${two(last.seconds.max)} s 最慢`, { size: 11, serif: true, hue: 'teal' });
  f.text(lx, c.py(last.seconds.median) + 4, '首次调用', { size: 11.5, weight: 700, hue: 'teal' });
  f.text(lx, c.py(last.seconds.median) + 19, `${two(last.seconds.median)} s（${last.seconds.n} 次中位）`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(lx, c.py(last.seconds.min) + 4, `${two(last.seconds.min)} s 最快`, { size: 11, serif: true, hue: 'teal' });
  f.text(lx, c.py(lastLater.seconds.median) + 8, '后续恢复', { size: 11.5, weight: 700, hue: 'violet' });
  f.text(lx, c.py(lastLater.seconds.median) + 23, `${two(lastLater.seconds.median)} s（${lastLater.seconds.n} 次中位）`, { size: 11, serif: true, hue: 'ink-soft' });

  f.text(c.px(500), c.py(10) + 16, '500 MiB 的 5 个新 actor：', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(c.px(500), c.py(10) + 30, `${sorted(mid)} s`, { size: 11, serif: true, hue: 'teal', anchor: 'middle' });
  f.leader([c.px(110), c.py(6) + 36], [c.px(200), c.py(small.seconds.median)], { hue: 'teal' });
  f.text(c.px(20), c.py(6) + 16, '200 MiB 以内首次调用', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(c.px(20), c.py(6) + 30, `保持在 ${Math.ceil(small.seconds.max * 10) / 10} s 以下`, { size: 11, serif: true, hue: 'ink-soft' });

  f.dot(c.px(20) + 3, c.py(13) - 4, { hue: 'teal', r: 2.4 });
  f.text(c.px(20) + 12, c.py(13), '单个新 actor 的首次调用', { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(c.px(20), c.py(13) + 10, c.px(20) + 18, c.py(13) + 10, { hue: 'ink-soft', width: 1.8 });
  f.text(c.px(20) + 24, c.py(13) + 14, '单一规格的中位数', { size: 11, serif: true, hue: 'ink-soft' });
});
