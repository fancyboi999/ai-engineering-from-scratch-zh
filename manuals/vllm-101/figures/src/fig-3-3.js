'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/gb10.json')).mixed;
const at = (key, field) => runs[key].points.find(p => p.x === 0.5)[field].median;
const bar = (key, field, name, hue) => ({ name, value: at(key, field), hue, label: Math.round(at(key, field)).toLocaleString('en-US') });

module.exports = figure('fig-3-3', {
  height: 330,
  title: 'DGX Spark 每秒 0.5 个请求时的较大 token 预算',
  desc: 'NVIDIA GB10 使用 vLLM 和 Qwen3-30B-A3B，提示词为 1,024 至 4,096 token，输出为 64 至 256 token，请求速率每秒 0.5 个，三个随机种子。预算为 2,048 token 时，首 token 中位延迟为 1,145 ms，P99 ITL 为 574 ms。预算为 16,384 token 时，首 token 为 906 ms，P99 ITL 为 798 ms。',
}, f => {
  f.text(66, 30, '首 token 中位延迟，ms', { size: 12, hue: 'ink' });
  const a = chart(f, { x: 66, y: 50, w: 220, h: 210, yDomain: [0, 1500], xDomain: [0, 1], yTicks: [0, 750, 1500], yFormat: v => v.toLocaleString('en-US'), yLabel: '' });
  a.bars([bar('vllm-mnbt-2048', 'median_ttft_ms', '2,048', 'grey'), bar('vllm-mnbt-16384', 'median_ttft_ms', '16,384', 'blue')], { width: 60 });
  f.text(366, 30, 'P99 ITL，ms', { size: 12, hue: 'ink' });
  const b = chart(f, { x: 366, y: 50, w: 220, h: 210, yDomain: [0, 1000], xDomain: [0, 1], yTicks: [0, 500, 1000], yFormat: v => v.toLocaleString('en-US'), yLabel: '' });
  b.bars([bar('vllm-mnbt-2048', 'p99_itl_ms', '2,048', 'grey'), bar('vllm-mnbt-16384', 'p99_itl_ms', '16,384', 'blue')], { width: 60 });
  f.text(66, 312, '两项指标均越低越好。柱形按 --max-num-batched-tokens 标记。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
