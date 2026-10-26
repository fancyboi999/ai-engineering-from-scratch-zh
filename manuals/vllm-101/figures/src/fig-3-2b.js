'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const prefix = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).prefix;
const series = [
  { key: 'vllm', name: '开启前缀缓存（默认）', hue: 'green' },
  { key: 'vllm-no-prefix-cache', name: '关闭前缀缓存', hue: 'rose' },
];

module.exports = figure('fig-3-2b', {
  height: 340,
  title: '开启缓存后，不同共享长度的首 token 延迟都约为 400 ms',
  desc: 'NVIDIA L4 使用 Qwen3-8B、8 个用户、三个随机种子时，首 token 延迟中位数随共享 system prompt 长度变化，采用对数刻度。开启缓存时为 375 至 488 ms。关闭缓存时，1,024 token 长度达到 1,213 ms，4,096 token 长度达到 13,353 ms，且此时 GPU 时钟也下降。',
}, f => {
  const c = chart(f, { x: 70, y: 64, w: 536, h: 216, xDomain: [0, 4096], yScale: 'log10', yDomain: [300, 20000], xTicks: [0, 1024, 2048, 3072, 4096], xFormat: v => v.toLocaleString('en-US'), yTicks: [300, 1000, 3000, 10000], xLabel: '共享 system prompt 长度，token', yLabel: 'TTFT 中位数，ms（对数刻度）' });
  for (const s of series) {
    const pts = prefix[s.key].points;
    c.band(pts.map(p => [p.x, p.median_ttft_ms.min]), pts.map(p => [p.x, p.median_ttft_ms.max]), { hue: s.hue });
    c.series(pts.map(p => [p.x, p.median_ttft_ms.median]), { hue: s.hue });
  }
  c.note(4096, 13353, '13,353', { dx: -6, dy: -8, anchor: 'end', hue: 'rose' });
  c.note(1024, 1213, '1,213', { dx: 10, dy: 4, hue: 'rose', knock: true });
  legend(f, series, 70, 22);
});
