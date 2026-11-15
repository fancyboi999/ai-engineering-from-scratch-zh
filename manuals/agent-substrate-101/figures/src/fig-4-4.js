'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const lab = path.join(__dirname, '../../capture/lab');
const data = load(path.join(lab, 'summary/parking-x86.json'));
const trace = Object.fromEntries(data.parking_trace.map(row => [row.event, row]));
const seconds = event => Number(trace[event].fields[1]);
const freed = (Date.parse(trace['suspend-p1-done'].t) - Date.parse(trace['p3-request-start'].t)) / 1000;
const run = data.load_run;
const refused = fs.readFileSync(path.join(lab, 'I-capacity/01-unplanned-full-pool-503.tsv'), 'utf8').trim().split('\n')
  .map(line => line.split('\t')).filter(cells => cells[3] === '503').map(cells => Number(cells[4]));
refused.push(seconds('p3-no-free-worker'));
const free = [seconds('p1'), seconds('p2')];
const served = seconds('p3-served-after-park');

const X0 = 170;
const PER_SECOND = 74;
const BUDGET = 5;
const AXIS = 252;
const x = s => X0 + s * PER_SECOND;
const two = s => s.toFixed(2);

module.exports = figure('fig-4-4', {
  height: 300,
  title: '池满时的请求表现与 5 秒暂存预算',
  desc: `0 至 6 秒时间轴上的四行对比，5 秒暂存预算处绘有虚线。发往有空闲 worker 池的两个请求分别在 ${two(Math.min(...free))} s 与 ${two(Math.max(...free))} s 返回 200。发往满池的 ${refused.length} 个请求各自等待 ${two(Math.min(...refused))} 至 ${two(Math.max(...refused))} s 后返回 503。一个暂存的请求在 ${two(served)} s 返回 200，因为等待 ${two(freed)} s 时腾出了一个 worker。在 ${run.seconds} s 压测运行中，${run.requests} 个请求完成了 ${run.ok} 个，平均耗时 ${two(run.ok_average_seconds)} s，最慢 ${two(run.ok_slowest_seconds)} s。`,
}, f => {
  const rows = [
    { name: '有空闲 worker', note: 'p1 与 p2，无等待', hue: 'green', end: Math.max(...free), dots: free, label: `${two(Math.min(...free))} 与 ${two(Math.max(...free))} s 返回 200` },
    { name: '池已满', note: `${refused.length} 个请求，无空闲 worker`, hue: 'rose', end: Math.max(...refused), dots: refused, label: `${two(Math.min(...refused))} 至 ${two(Math.max(...refused))} s 返回 503`, above: true },
    { name: '池已满', note: 'p3 等待时 p1 挂起', hue: 'green', end: served, dots: [served], label: `${two(served)} s 返回 200`, mark: freed },
    { name: '压测运行，30 s', note: `完成 ${run.ok} / ${run.requests}`, hue: 'green', end: run.ok_slowest_seconds, dots: [run.ok_slowest_seconds], label: `最慢 ${two(run.ok_slowest_seconds)} s`, average: run.ok_average_seconds, light: true },
  ];
  for (let s = 1; s <= 6; s += 1) f.rule(x(s), 34, x(s), AXIS, { hue: 'ink-mute', opacity: 0.2 });
  f.rule(x(BUDGET), 26, x(BUDGET), AXIS, { hue: 'amber', dash: 'dashed', width: 1.4 });
  f.text(x(BUDGET) - 6, 22, '暂存预算 5 s', { size: 11, hue: 'amber', anchor: 'end', weight: 700 });
  rows.forEach((row, index) => {
    const y = 48 + index * 52;
    f.text(20, y + 8, row.name, { size: 12, weight: 700 });
    f.text(20, y + 24, row.note, { size: 11, serif: true, hue: 'ink-soft' });
    f.rect(x(0), y, row.end * PER_SECOND, 16, { fill: color(`${row.hue}-fill`), stroke: color(`${row.hue}-ink`), dash: row.light ? 'dashed' : undefined });
    for (const s of row.dots) f.dot(x(s), y + 8, { hue: row.hue, r: 3.2 });
    if (row.above) f.text(x(BUDGET) - 8, y - 6, row.label, { size: 11.5, hue: row.hue, weight: 700, anchor: 'end', knock: true });
    else f.text(x(row.end) + 10, y + 12, row.label, { size: 11.5, hue: row.hue, weight: 700, knock: true });
    if (row.mark) {
      f.rule(x(row.mark), y - 5, x(row.mark), y + 21, { hue: 'violet', width: 1.6 });
      f.text(x(row.mark), y + 34, `${two(row.mark)} s 腾出 worker，${two(row.end - row.mark)} s 后返回`, { size: 11, hue: 'violet', anchor: 'middle', knock: true });
    }
    if (row.average) {
      f.rule(x(row.average), y - 5, x(row.average), y + 21, { hue: 'green', width: 1.6 });
      f.text(x(row.average) + 6, y + 34, `平均 ${two(row.average)} s`, { size: 11, hue: 'green', knock: true });
    }
  });
  f.rule(x(0), 34, x(0), AXIS, { hue: 'ink' });
  f.rule(x(0), AXIS, x(6), AXIS, { hue: 'ink' });
  for (let s = 0; s <= 6; s += 1) {
    f.rule(x(s), AXIS, x(s), AXIS + 5, { hue: 'ink' });
    f.text(x(s), AXIS + 18, String(s), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(x(3), AXIS + 38, '从请求发出到收到响应的秒数', { size: 11.5, serif: true, hue: 'ink-soft', anchor: 'middle' });
});
