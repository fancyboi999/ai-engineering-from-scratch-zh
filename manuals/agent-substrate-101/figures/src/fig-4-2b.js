'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const summary = name => load(path.join(__dirname, '../../capture/lab/summary', name));
const sizes = [0, 200, 500];
const micro = summary('microvm-x86.json').node_local.points.filter(p => sizes.includes(p.x));
const gvisor = summary('resume-x86.json').node_local.points.filter(p => sizes.includes(p.x));
const at = (points, x) => points.find(p => p.x === x);
const two = value => (Math.round(value * 100) / 100).toFixed(2);
const slope = points => (at(points, 500).seconds.median - at(points, 0).seconds.median) / 500 * 1000;
const medians = points => points.map(p => `${p.x} MiB 为 ${two(p.seconds.median)} s`).join('、');
const total = [...micro, ...gvisor].reduce((sum, p) => sum + p.runs.length, 0);
const fixed = at(micro, 0).seconds.median - at(gvisor, 0).seconds.median;

module.exports = figure('fig-4-2b', {
  height: 352,
  title: '两种沙箱类别下恢复耗时与所持内存的关系',
  desc: `x86 服务器客户机上从节点本地快照恢复时，向挂起 actor 发一次请求的耗时秒数与其所持随机内存 MiB 的关系。共 ${total} 次恢复各为一个小点（每种规格与沙箱类别各 10 次），线条连接中位数。microvm 类别的中位数为：${medians(micro)}；gvisor 类别的中位数为：${medians(gvisor)}。microvm 起点高出 ${two(fixed)} s，但斜率约为一半，因此两条线在略高于 200 MiB 处交叉。`,
}, f => {
  const c = chart(f, { x: 46, y: 40, w: 430, h: 270, xDomain: [0, 500], yDomain: [0, 1.4], xTicks: [0, 100, 200, 300, 400, 500], yTicks: [0, 0.2, 0.4, 0.6, 0.8, 1, 1.2, 1.4], xFormat: v => String(v), yFormat: v => v.toFixed(1), xLabel: 'actor 持有的内存，MiB', yLabel: '客户端从请求到回复的耗时，秒' });
  const strip = (points, hue, dx) => {
    for (const p of points) {
      const x = c.px(p.x) + (p.x === 0 ? dx + 11 : dx);
      f.rule(x, c.py(p.seconds.max), x, c.py(p.seconds.min), { hue, opacity: 0.45 });
      for (const v of p.runs) f.dot(x, c.py(v), { hue, r: 1.9 });
    }
  };

  c.series(gvisor.map(p => [p.x, p.seconds.median]), { hue: 'ink-soft', dash: 'dashed', dots: false });
  c.series(micro.map(p => [p.x, p.seconds.median]), { hue: 'violet', dots: false });
  strip(gvisor, 'ink-soft', -5);
  strip(micro, 'violet', 5);

  const right = c.px(500) + 16;
  const g500 = at(gvisor, 500).seconds;
  const m500 = at(micro, 500).seconds;
  f.text(right, c.py(g500.median) - 10, 'gvisor', { size: 11.5, weight: 700, hue: 'ink-soft' });
  f.text(right, c.py(g500.median) + 5, `${two(g500.median)} s（${g500.n} 次中位）`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right, c.py(g500.median) + 20, `约 ${slope(gvisor).toFixed(1)} ms / MiB`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right, c.py(m500.median) + 4, 'microvm', { size: 11.5, weight: 700, hue: 'violet' });
  f.text(right, c.py(m500.median) + 19, `${two(m500.median)} s（${m500.n} 次中位）`, { size: 11, serif: true, hue: 'violet' });
  f.text(right, c.py(m500.median) + 34, `约 ${slope(micro).toFixed(1)} ms / MiB`, { size: 11, serif: true, hue: 'violet' });

  f.text(c.px(0) + 24, c.py(0.5) + 4, `microvm ${two(at(micro, 0).seconds.median)} s`, { size: 11, serif: true, hue: 'violet' });
  f.text(c.px(0) + 24, c.py(0.1) + 4, `gvisor ${two(at(gvisor, 0).seconds.median)} s`, { size: 11, serif: true, hue: 'ink-soft' });

  f.text(c.px(215), c.py(0.3) - 3, `200 MiB 时：${two(at(micro, 200).seconds.median)} s 与 ${two(at(gvisor, 200).seconds.median)} s`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(c.px(215), c.py(0.3) + 11, '超过此规格后中位数交叉', { size: 11, serif: true, hue: 'ink-soft' });

  f.dot(c.px(15) + 3, c.py(1.32) - 4, { hue: 'ink-soft', r: 1.9 });
  f.text(c.px(15) + 12, c.py(1.32), '单次恢复', { size: 11, serif: true, hue: 'ink-soft' });
  f.rule(c.px(15) + 74, c.py(1.32) - 4, c.px(15) + 92, c.py(1.32) - 4, { hue: 'ink-soft', width: 1.8 });
  f.text(c.px(15) + 98, c.py(1.32), '单一规格中位数', { size: 11, serif: true, hue: 'ink-soft' });
});
