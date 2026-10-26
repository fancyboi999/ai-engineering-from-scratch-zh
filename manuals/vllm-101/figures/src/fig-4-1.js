'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).load;
const out = (key, x) => runs[key].points.find(p => p.x === x).output_throughput.median;
const bar = (key, x, name, hue) => ({ name, value: out(key, x), hue, label: out(key, x).toFixed(1) });

module.exports = figure('fig-4-1', {
  height: 344,
  title: '900 MHz 锁频时，EAGLE3 在单用户与 32 用户下的输出吞吐',
  desc: 'NVIDIA L4 上使用 Qwen3-8B、SM 时钟锁定 900 MHz 时，输出 token/s 的中位数；每根柱子对应两个随机种子，测试日期为 2026-10-22。单用户时，draft 深度 1、3、5 的吞吐分别为 22.4、31.3、31.7 token/s。未展示单用户且未启用 speculation 的运行，因为其时钟降到了 210 MHz。32 个用户时，未启用 speculation、深度 1、3、5 的吞吐分别为 208.8、271.1、333.6、289.5 token/s。',
}, f => {
  f.text(66, 30, '单用户，输出 tok/s', { size: 12, hue: 'ink' });
  const a = chart(f, { x: 66, y: 50, w: 210, h: 210, yDomain: [0, 40], xDomain: [0, 1], yTicks: [0, 20, 40], yLabel: '' });
  a.bars([
    bar('vllm-lock-eagle3-k1', 1, 'k = 1', 'blue'),
    bar('vllm-lock-eagle3-k3', 1, 'k = 3', 'green'),
    bar('vllm-lock-eagle3-k5', 1, 'k = 5', 'violet'),
  ], { width: 40 });
  f.text(356, 30, '32 个用户，输出 tok/s', { size: 12, hue: 'ink' });
  const b = chart(f, { x: 356, y: 50, w: 250, h: 210, yDomain: [0, 400], xDomain: [0, 1], yTicks: [0, 200, 400], yLabel: '' });
  b.bars([
    bar('vllm-lock-b', 32, '未启用', 'grey'),
    bar('vllm-lock-eagle3-k1', 32, 'k = 1', 'blue'),
    bar('vllm-lock-eagle3-k3', 32, 'k = 3', 'green'),
    bar('vllm-lock-eagle3-k5', 32, 'k = 5', 'violet'),
  ], { width: 40 });
  f.text(66, 306, '输出越高越好。k 表示 draft 深度。', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(66, 324, '单用户且未启用 speculation 的数据未列出：时钟降到了 210 MHz。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
