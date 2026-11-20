'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/concurrency-x86-real.json'));
const levels = [1, 4, 16, 64];
const setups = [
  { config: 'single', hue: 'olive', name: '单个连接', dash: 'dashed' },
  { config: 'pool20', hue: 'teal', name: '20 个连接的连接池' },
];
const reps = (config, n, key) => data.cells[`${config} ${n}`].reps.map(rep => rep[key]);
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const list = (config, n, key, digits) => reps(config, n, key).map(value => value.toFixed(digits)).join(' and ');

function panel(f, c, key) {
  setups.forEach(setup => {
    c.series(levels.map(n => [n, mean(reps(setup.config, n, key))]), { hue: setup.hue, dash: setup.dash, dots: false });
    levels.forEach(n => reps(setup.config, n, key).forEach((value, j) => f.dot(c.px(n) + (setup.config === 'single' ? -3 : 3) + (j ? 1.5 : -1.5), c.py(value), { hue: setup.hue, r: 3 })));
  });
}

module.exports = figure('fig-5-2b', {
  height: 370,
  title: '同一个 AsyncPostgresSaver 上，每秒运行数与检查点写入 p99 随线程数的变化',
  desc: `两幅点图，横轴是同时运行的线程数 1、4、16 和 64，对数刻度，每个点两次运行，在 x86 服务器虚拟机上用 CPU 上的 Qwen3 4B。左：每秒运行数。单个连接在 1 个线程时为 ${list('single', 1, 'runs_per_s', 2)}，64 个线程时为 ${list('single', 64, 'runs_per_s', 2)}。20 个连接的连接池在 1 个线程时为 ${list('pool20', 1, 'runs_per_s', 2)}，64 个线程时为 ${list('pool20', 64, 'runs_per_s', 2)}。右：aput 的 p99，单位 ms，对数刻度。64 个线程时，单个连接为 ${list('single', 64, 'aput_p99_ms', 0)} ms，连接池为 ${list('pool20', 64, 'aput_p99_ms', 0)} ms。`,
}, f => {
  const left = chart(f, { x: 60, y: 40, w: 220, h: 230, xScale: 'log2', xDomain: [0.8, 80], yDomain: [0, 0.3], xTicks: levels, yTicks: [0, 0.1, 0.2, 0.3], yLabel: '每秒运行数', xLabel: '同时运行的线程数' });
  panel(f, left, 'runs_per_s');
  const right = chart(f, { x: 380, y: 40, w: 220, h: 230, xScale: 'log2', yScale: 'log10', xDomain: [0.8, 80], yDomain: [1, 1000], xTicks: levels, yTicks: [1, 10, 100, 1000], yLabel: 'aput p99，毫秒', xLabel: '同时运行的线程数' });
  panel(f, right, 'aput_p99_ms');
  legend(f, setups, 60, 318);
  f.text(60, 344, `每个点是一次运行。${data.runs_total} 次运行中有 ${data.runs_right_total} 次回答正确，错误 ${data.errors_total} 次。`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(60, 360, 'p99 是在客户端计时的，所以包含了事件循环的等待时间。', { size: 11, serif: true, hue: 'ink-soft' });
});
