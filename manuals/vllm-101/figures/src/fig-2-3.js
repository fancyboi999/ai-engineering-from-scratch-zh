'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-3', {
  height: 252,
  title: '在 DGX Spark 上，vLLM 使用统一内存池中的一部分',
  desc: 'GB10 共报告 121.7 GiB 内存。比例设为 0.75 时，vLLM 使用 91.3 GiB：56.93 GiB 用于权重、31.32 GiB 用于 KV cache，约 3 GiB 用于启动 profile 和 CUDA graph。其余 30.4 GiB 留给操作系统、文件页缓存和其他程序。',
}, f => {
  const total = 121.7;
  const scale = 600 / total;
  const parts = [
    { gib: 56.93, hue: 'violet', label: '权重', value: '56.93 GiB' },
    { gib: 31.32, hue: 'green', label: 'KV cache', value: '31.32 GiB' },
    { gib: 3.05, hue: 'amber', label: 'profile 和 graph', value: 'about 3 GiB' },
    { gib: 30.4, hue: 'grey', label: '操作系统、文件页缓存和其他程序', value: '30.4 GiB' },
  ];
  f.kicker(20, 18, 'CPU 与 GPU 共用 121.7 GiB 内存池');
  let x = 20;
  const spans = parts.map(p => { const w = p.gib * scale; const span = { x, w }; x += w; return span; });
  parts.forEach((p, i) => f.rect(spans[i].x, 30, spans[i].w - (i < 3 ? 2 : 0), 46, { hue: p.hue, dash: p.hue === 'grey' ? 'dashed' : undefined }));
  f.rule(20, 92, 20 + 91.3 * scale, 92, { hue: 'blue', width: 2 });
  f.text(20, 108, 'vLLM 使用 91.3 GiB，--gpu-memory-utilization 0.75', { size: 11.5, weight: 700, hue: 'blue' });
  parts.forEach((p, i) => {
    const y = 140 + i * 26;
    f.rect(20, y - 10, 12, 12, { hue: p.hue });
    f.text(42, y, p.value, { size: 12, weight: 700 });
    f.text(170, y, p.label, { size: 11.5, serif: true, hue: 'ink-soft' });
  });
});
