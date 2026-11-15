'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/lab/summary/cpu-limit-x86.json'));
const of = threads => runs.points.filter(point => point.threads === threads);
const single = of(1);
const four = of(4);
const at = (points, x) => points.find(point => point.x === x);
const two = value => value.toFixed(2);
const one = value => value.toFixed(1);
const cores = points => points.map(point => `${point.x} 下 ${two(point.host_cores_used.median)} 核`).join('、');
const slow = at(single, 250).wall_seconds.median / at(single, 1000).wall_seconds.median;
const seen = runs.seen_inside_the_actor['250'].num_cpu;
const total = runs.points.reduce((sum, point) => sum + point.runs.length, 0);

module.exports = figure('fig-4-1b', {
  height: 340,
  title: '四种 CPU 上限下 actor 实际使用的宿主核心数',
  desc: `固定工作负载在 1 线程与 4 线程下使用的宿主核心数对模板 cpuMillicores 上限的关系图，每点运行三次，共 ${total} 次。1 线程中位数为：${cores(single)}；4 线程中位数为：${cores(four)}。虚线标出配额上限本身。实测点紧贴该虚线，低于 2000 millicores 时 4 线程并未比 1 线程获得更多 CPU。同一工作负载在 250 millicores 下耗时 ${one(at(single, 250).wall_seconds.median)} s，在 1000 下耗时 ${one(at(single, 1000).wall_seconds.median)} s。所有上限下程序均看到 ${seen} 个 CPU。`,
}, f => {
  const c = chart(f, { x: 52, y: 40, w: 400, h: 240, xDomain: [0, 2000], yDomain: [0, 2.2], xTicks: [250, 500, 1000, 2000], xFormat: v => String(v), yTicks: [0, 0.5, 1, 1.5, 2], xLabel: '模板的 resources.limits.cpuMillicores', yLabel: 'actor cgroup 使用的宿主核心数' });
  f.rule(c.px(0), c.py(0), c.px(2000), c.py(2.0), { hue: 'ink-soft', dash: 'dashed' });
  c.series(four.map(point => [point.x, point.host_cores_used.median]), { hue: 'violet', name: '4 threads', dash: 'dashed', dots: false });
  c.series(single.map(point => [point.x, point.host_cores_used.median]), { hue: 'violet', name: '1 thread', dots: false });
  for (const point of four) for (const run of point.runs) f.dot(c.px(point.x) + 4, c.py(run.host_cores_used), { hue: 'violet', r: 2.4 });
  for (const point of single) for (const run of point.runs) f.dot(c.px(point.x) - 4, c.py(run.host_cores_used), { hue: 'violet', r: 2.4 });

  const right = c.px(2000) + 14;
  f.text(right, c.py(at(four, 2000).host_cores_used.median) + 4, '4 线程', { size: 11.5, weight: 700, hue: 'violet' });
  f.text(right, c.py(at(four, 2000).host_cores_used.median) + 19, `2000 下 ${two(at(four, 2000).host_cores_used.median)} 核`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right, c.py(at(single, 2000).host_cores_used.median) + 4, '1 线程', { size: 11.5, weight: 700, hue: 'violet' });
  f.text(right, c.py(at(single, 2000).host_cores_used.median) + 19, `2000 下 ${two(at(single, 2000).host_cores_used.median)} 核，`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right, c.py(at(single, 2000).host_cores_used.median) + 33, '单线程跑满单核', { size: 11, serif: true, hue: 'ink-soft' });

  f.text(c.px(1300), c.py(0.25) + 4, '细虚线：配额上限', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(c.px(60), c.py(2.0) + 16, `250、500、1000 下为 ${two(at(single, 250).host_cores_used.median)}、${two(at(single, 500).host_cores_used.median)}、${two(at(single, 1000).host_cores_used.median)} 核，`, { size: 11, serif: true, hue: 'violet' });
  f.text(c.px(60), c.py(2.0) + 30, '1 线程与 4 线程相同', { size: 11, serif: true, hue: 'violet' });
  f.text(c.px(60), c.py(1.5) + 16, `同一负载：250 下 ${one(at(single, 250).wall_seconds.median)} s，1000 下 ${one(at(single, 1000).wall_seconds.median)} s`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(c.px(60), c.py(1.5) + 30, `250 下耗时为 ${one(slow)} 倍`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(52, 332, `每点代表一次运行，每档各跑三次。所有上限下程序均看到 ${seen} 个 CPU。`, { size: 11, serif: true, hue: 'ink-soft' });
});
