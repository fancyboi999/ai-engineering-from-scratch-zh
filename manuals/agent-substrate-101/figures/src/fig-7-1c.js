'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/kagent-turns-x86.json'));
const alone = data.client_seconds['A-spaced'].median;
const eight = data.runs.client_seconds['parallel-P8'].slice().sort((a, b) => a - b);
const many = data.runs.client_seconds['parallel-P24'].slice().sort((a, b) => a - b);
const full = Math.max(...data.parallel_workers.map(sample => sample.actors));
const capacity = data.parallel_workers[0].cpu_capacity_millicores / 1000;
const TOP = 44;
const HEIGHT = 216;
const yTicks = [0, 2, 4, 6, 8];

module.exports = figure('fig-7-1c', {
  height: 334,
  title: '可容纳 16 个 actor 的单个 worker 上的并行 kagent 轮次',
  desc: `单个 worker pod 上两组测试每轮次的客户端耗时（按最快到最慢排序）。同时启动的 8 个轮次耗时 ${eight[0].toFixed(2)} 至 ${eight[7].toFixed(2)} 秒。同时启动的 24 个轮次中，前 16 个耗时 ${many[0].toFixed(2)} 至 ${many[15].toFixed(2)} 秒，后 8 个耗时 ${many[16].toFixed(2)} 至 ${many[23].toFixed(2)} 秒，因为该 worker 最多同时运行 ${full} 个 actor。单独执行单轮次耗时 ${alone.toFixed(2)} 秒。`,
}, f => {
  const left = chart(f, { x: 56, y: TOP, w: 150, h: HEIGHT, xDomain: [0.25, 8.75], yDomain: [0, 9], xTicks: [1, 8], yTicks, xLabel: '8 个并发轮次', yLabel: '每轮次的客户端耗时（秒）' });
  const right = chart(f, { x: 262, y: TOP, w: 352, h: HEIGHT, xDomain: [0.25, 24.75], yDomain: [0, 9], xTicks: [1, 8, 16, 24], yTicks, xLabel: '24 个并发轮次（按耗时排序）' });

  f.rect(right.px(16.5), TOP, right.px(24.75) - right.px(16.5), HEIGHT, { hue: 'violet', stroke: 'none' });
  f.rule(right.px(16.5), TOP, right.px(16.5), TOP + HEIGHT, { hue: 'violet', dash: 'dashed' });
  f.text(right.px(16.5) - 6, TOP + 14, `${full} 个 actor 运行：预留 ${capacity}/${capacity} CPU`, { size: 11, serif: true, anchor: 'end', hue: 'violet' });
  f.text(right.px(16.5) + 6, TOP + 14, '8 个轮次等待', { size: 11, serif: true, hue: 'violet' });
  f.rule(left.px(0.25), left.py(alone), left.px(8.75), left.py(alone), { hue: 'plum', dash: 'dashed' });
  f.rule(right.px(0.25), right.py(alone), right.px(24.75), right.py(alone), { hue: 'plum', dash: 'dashed' });
  f.text(right.px(0.25) + 8, right.py(alone) + 15, `单独一轮：${alone.toFixed(2)} s`, { size: 11, serif: true, hue: 'plum' });

  eight.forEach((value, index) => f.dot(left.px(index + 1), left.py(value), { hue: 'plum', r: 3 }));
  many.forEach((value, index) => f.dot(right.px(index + 1), right.py(value), { hue: 'plum', r: 3 }));

  f.text(left.px(8) + 6, left.py(eight[7]) + 24, `${eight[7].toFixed(2)} s`, { size: 11.5, weight: 700, anchor: 'end', hue: 'plum' });
  f.text(right.px(16), right.py(many[15]) + 24, `${many[15].toFixed(2)} s`, { size: 11.5, weight: 700, anchor: 'end', hue: 'plum' });
  f.text(right.px(24) + 4, right.py(many[23]) + 24, `${many[23].toFixed(2)} s`, { size: 11.5, weight: 700, anchor: 'end', hue: 'plum' });
  f.text(56, 322, '每个点：使用模拟模型的一个轮次。全部 32 个轮次均已完成。', { size: 11, serif: true, hue: 'ink-soft' });
});
