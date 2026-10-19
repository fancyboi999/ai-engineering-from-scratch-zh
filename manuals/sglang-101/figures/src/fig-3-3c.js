'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, legend, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/l4.json')).prefix;
const series = [
  { key: 'default', name: "基数缓存开启", hue: 'green' },
  { key: 'no-radix-cache', name: '--disable-radix-cache', hue: 'rose' },
];

module.exports = figure('fig-3-3c', {
  height: 340,
  title: "共享 prompt 越长，树节省越多",
  desc: "NVIDIA L4 上 Qwen3-8B 的首 token 时间中位数对共享 system prompt 长度，每点三个种子，对数刻度。开启基数缓存时中位数保持 349 至 479 ms，关闭时从无共享 prompt 的 379 ms 增至共享 4,096 token 的 14,706 ms。",
}, f => {
  const c = chart(f, { x: 70, y: 64, w: 536, h: 222, xDomain: [0, 4096], yScale: 'log10', yDomain: [100, 30000], xTicks: [0, 1024, 2048, 3072, 4096], yTicks: [100, 300, 1000, 3000, 10000, 30000], xLabel: "共享 system prompt，token 数", yLabel: "TTFT 中位数，ms（对数刻度）" });
  for (const s of series) {
    const points = runs[s.key].points;
    c.band(points.map(p => [p.x, p.median_ttft_ms.min]), points.map(p => [p.x, p.median_ttft_ms.max]), { hue: s.hue });
    c.series(points.map(p => [p.x, p.median_ttft_ms.median]), { hue: s.hue, name: s.key });
    const last = points[points.length - 1];
    c.note(last.x, last.median_ttft_ms.median, `${Math.round(last.median_ttft_ms.median).toLocaleString('en-US')} ms`, { dx: -8, dy: -10, anchor: 'end', hue: s.hue });
  }
  legend(f, series, 70, 22);
});
