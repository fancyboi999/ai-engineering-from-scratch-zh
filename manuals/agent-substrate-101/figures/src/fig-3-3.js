'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/lab/summary/resume-x86.json'));
const node = runs.node_local.points;
const store = runs.object_store.points;
const at = (points, x) => points.find(p => p.x === x);
const slope = points => (at(points, 1000).seconds.median - at(points, 0).seconds.median);
const nodeLast = at(node, 1000);
const storeLast = at(store, 1000);
const outlier = Math.max(...nodeLast.runs);
const outlierIndex = nodeLast.runs.indexOf(outlier) + 1;
const total = [...node, ...store].reduce((sum, p) => sum + p.runs.length, 0);
const two = value => (Math.round(value * 100) / 100).toFixed(2);
const medians = points => points.map(p => `${p.x} MiB 为 ${two(p.seconds.median)} s`).join('、');

module.exports = figure('fig-3-3', {
  height: 352,
  title: '恢复耗时与 actor 所持内存的关系',
  desc: `带 gVisor 的 x86 服务器客户机上，向已挂起 actor 发一次请求的耗时秒数与其所持随机内存 MiB 的关系。共 ${total} 次恢复各绘为一个小点，实线连接中位数。从节点本地快照恢复的中位数为：${medians(node)}（每种规格 10 次）；1000 MiB 下有一次耗时 ${two(outlier)} s，其余 9 次至多 ${two(Math.max(...nodeLast.runs.filter(v => v !== outlier)))} s。从同集群对象存储恢复的中位数为：${medians(store)}（每种规格 5 次）。虚线标出 0.5 s：节点路径在 200 MiB 以上超过该线，对象存储路径在 50 MiB 以上超过该线。`,
}, f => {
  const c = chart(f, { x: 46, y: 40, w: 440, h: 270, xDomain: [0, 1000], yDomain: [0, 6], xTicks: [0, 50, 200, 500, 1000], yTicks: [0, 1, 2, 3, 4, 5, 6], xFormat: v => String(v), xLabel: 'actor 持有的内存，MiB', yLabel: '客户端从请求到回复的耗时，秒' });
  const strip = (points, hue, dx) => {
    for (const p of points) {
      const x = c.px(p.x) + (p.x === 0 ? dx + 6 : dx);
      f.rule(x, c.py(p.seconds.max), x, c.py(p.seconds.min), { hue, opacity: 0.45 });
      for (const v of p.runs) f.dot(x, c.py(v), { hue, r: 1.9 });
    }
  };

  f.rule(c.px(0), c.py(0.5), c.px(1000), c.py(0.5), { hue: 'ink-soft', dash: 'dashed' });
  c.series(store.map(p => [p.x, p.seconds.median]), { hue: 'teal', name: 'object store', dots: false });
  c.series(node.map(p => [p.x, p.seconds.median]), { hue: 'violet', name: 'node', dots: false });
  strip(store, 'teal', 4);
  strip(node, 'violet', -4);

  f.text(c.px(1000) + 14, c.py(storeLast.seconds.median) + 4, '对象存储', { size: 11.5, weight: 700, hue: 'teal' });
  f.text(c.px(1000) + 14, c.py(storeLast.seconds.median) + 19, `${two(storeLast.seconds.median)} s（${storeLast.seconds.n} 次中位）`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(c.px(1000) + 14, c.py(nodeLast.seconds.median) + 4, '节点本地', { size: 11.5, weight: 700, hue: 'violet' });
  f.text(c.px(1000) + 14, c.py(nodeLast.seconds.median) + 19, `${two(nodeLast.seconds.median)} s（${nodeLast.seconds.n} 次中位）`, { size: 11, serif: true, hue: 'ink-soft' });

  f.text(c.px(1000) - 14, c.py(outlier) - 6, `${two(outlier)} s，节点本地第 ${outlierIndex}/${nodeLast.seconds.n} 次`, { size: 11, serif: true, hue: 'violet', anchor: 'end' });

  f.text(c.px(660), c.py(2.5) + 4, `约 ${Math.round(slope(store))} ms / MiB`, { size: 11, serif: true, hue: 'teal' });
  f.text(c.px(700), c.py(0.75) + 4, `约 ${Math.round(slope(node))} ms / MiB`, { size: 11, serif: true, hue: 'violet' });

  f.text(c.px(1000) + 14, c.py(0.5) + 4, '0.5 s', { size: 11.5, weight: 700, hue: 'ink-soft' });
  f.text(c.px(1000) + 14, c.py(0.5) + 19, '项目宣称值', { size: 11, serif: true, hue: 'ink-soft' });

  f.dot(c.px(20) + 3, c.py(5.6) - 4, { hue: 'ink-soft', r: 1.9 });
  f.text(c.px(20) + 12, c.py(5.6), '单次恢复', { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(c.px(20) + 74, c.py(5.6) - 4, c.px(20) + 92, c.py(5.6) - 4, { hue: 'ink-soft', width: 1.8 });
  f.text(c.px(20) + 98, c.py(5.6), '单一规格中位数', { size: 11, serif: true, hue: 'ink-soft' });

  const cross = [c.px(200) - 4, c.py(at(node, 200).seconds.median)];
  f.leader([c.px(70), c.py(4) + 38], cross, { hue: 'violet' });
  f.text(c.px(20), c.py(4) + 17, '节点本地 200 MiB 内低于 0.5 s', { size: 11, serif: true, hue: 'violet' });
  f.text(c.px(20), c.py(4) + 31, '对象存储 50 MiB 内低于 0.5 s', { size: 11, serif: true, hue: 'teal' });
});
