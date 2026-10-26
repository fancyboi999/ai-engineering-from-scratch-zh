'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  ['版本', '0.31.0', '正在运行的版本'],
  ['正在使用的 模型 runner', 'V2', '当前使用的 模型 runner'],
  ['注意力后端', 'FLASH_ATTN', '用于 attention 的 kernel'],
  ['模型加载情况', '56.93 GiB, 330 s', '权重占用的内存'],
  ['可用 KV cache 内存', '31.32 GiB', 'KV cache 剩余内存'],
  ['GPU KV cache 容量', '234,960 token', '可容纳的用户数'],
];

module.exports = figure('fig-1-2', {
  height: 346,
  title: '每次启动后要看的六行日志',
  desc: 'DGX Spark 使用 vLLM 0.31.0 和 Qwen3-30B-A3B 时的启动日志：版本 0.31.0、V2 模型 runner、FLASH_ATTN attention backend、加载权重 56.93 GiB 耗时 330 秒、KV cache 剩余 31.32 GiB、缓存池 234,960 个 token。',
}, f => {
  f.kicker(20, 18, '日志行');
  f.kicker(250, 18, '实测值');
  f.kicker(410, 18, '说明');
  rows.forEach(([line, value, decides], index) => {
    const y = 30 + index * 50;
    f.box({ x: 20, y, w: 218, h: 38, hue: 'blue', title: line, titleSize: 11.5, align: 'left' });
    f.text(250, y + 24, value, { size: 12, weight: 700, hue: index === 5 ? 'green' : 'ink' });
    f.text(410, y + 24, decides, { size: 11.5, serif: true, hue: 'ink-soft' });
  });
  f.text(20, 338, '每次启动后、接入流量前，先检查这些日志。', { size: 11, serif: true, hue: 'ink-soft' });
});
