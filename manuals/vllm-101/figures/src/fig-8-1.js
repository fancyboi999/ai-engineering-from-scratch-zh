'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-8-1', {
  height: 270,
  title: '使用 -tp 4 时，服务器会运行六个进程',
  desc: 'vllm serve 会启动一个 API server 进程，以及一个运行 scheduler 和 KV cache manager 的 engine core 进程。Engine core 为每块 GPU 启动一个 GPU worker；tensor parallel size 为 4 时会启动四个 worker。总计六个进程。',
}, f => {
  const api = f.box({ x: 230, y: 20, w: 180, h: 48, hue: 'blue', title: 'API server', sub: 'HTTP、分词器' });
  const core = f.box({ x: 230, y: 104, w: 180, h: 48, hue: 'blue', title: 'engine core', sub: '调度器、KV 管理器' });
  f.arrow([320, 68], [320, 103], { style: 'event', label: 'ZeroMQ', labelX: 328 });
  for (let i = 0; i < 4; i += 1) {
    const x = 32 + i * 150;
    f.box({ x, y: 196, w: 126, h: 48, hue: 'violet', title: `worker ${i}`, sub: `GPU ${i}，rank ${i}` });
    f.path(`M320 152 V174 H${x + 63} V195`, { style: 'call' });
  }
  f.text(20, 264, '进程数：1 个 API server + 1 个 engine core + 4 个 worker = 共 6 个。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
