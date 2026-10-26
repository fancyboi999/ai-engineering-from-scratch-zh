'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4-gpu1.json')).load;
const tpot = (key, x) => runs[key].points.find(p => p.x === x).median_tpot_ms.median;

module.exports = figure('fig-4-2', {
  height: 320,
  title: '单用户使用 n-gram speculation 后，每 token 耗时约降至三分之一',
  desc: 'NVIDIA L4 使用 Qwen3-8B、小型 KV 缓存池、两个随机种子和随机提示词时，每个输出 token 的耗时中位数。单用户时，不使用 speculation 为 241.7 ms，使用 n-gram 为 76.6 ms。四用户时分别为 272.6 ms 和 101.3 ms。四次运行的 GPU 时钟均为 375 至 443 MHz。',
}, f => {
  const c = chart(f, { x: 66, y: 50, w: 540, h: 200, yDomain: [0, 300], xDomain: [0, 1], yTicks: [0, 100, 200, 300], yLabel: '每 token 耗时中位数，ms' });
  c.bars([
    { name: '1 个用户，不使用', value: tpot('vllm-fast-b', 1), hue: 'grey', label: '241.7' },
    { name: '1 个用户，n-gram', value: tpot('vllm-ngram', 1), hue: 'green', label: '76.6' },
    { name: '4 个用户，不使用', value: tpot('vllm-fast-b', 4), hue: 'grey', label: '272.6' },
    { name: '4 个用户，n-gram', value: tpot('vllm-ngram', 4), hue: 'green', label: '101.3' },
  ], { width: 70 });
  f.text(66, 306, '数值越低越快。使用随机提示词，未记录 acceptance counter。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
