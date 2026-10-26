'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-1', {
  height: 400,
  title: '三个问题决定并行布局',
  desc: '先判断模型和所需 KV cache 是否能放进一块 GPU。可以的话，使用 data parallelism 复制模型；不可以的话，判断拆分后的模型是否能放进单机。放不进单机时，在机器间使用 pipeline parallelism，并在每台机器内使用 tensor parallelism。能放进单机时，再判断 GPU 是否有 NVLink，且 GPU 数能否整除模型结构。满足时使用 tensor parallelism，否则在单机内使用 pipeline parallelism。',
}, f => {
  const q1 = f.box({ x: 170, y: 20, w: 300, h: 48, hue: 'amber', title: '模型和缓存能放进一块 GPU？' });
  const dp = f.box({ x: 20, y: 120, w: 200, h: 54, hue: 'blue', title: 'data 并行', sub: '--data-parallel-size N' });
  const q2 = f.box({ x: 330, y: 120, w: 290, h: 48, hue: 'amber', title: '拆分后的模型能放进单机？' });
  const q3 = f.box({ x: 200, y: 226, w: 250, h: 48, hue: 'amber', title: '有 NVLink 且可均匀拆分？' });
  const ppx = f.box({ x: 466, y: 226, w: 154, h: 54, hue: 'violet', title: 'pipeline + tensor', sub: '跨机器' });
  const tp = f.box({ x: 150, y: 330, w: 190, h: 54, hue: 'violet', title: 'tensor 并行', sub: '--tensor-parallel-size' });
  const pp = f.box({ x: 360, y: 330, w: 200, h: 54, hue: 'violet', title: 'pipeline 并行', sub: '--pipeline-parallel-size' });
  f.path('M240 68 V96 H120 V119', { style: 'call' });
  f.text(150, 90, '是', { size: 11.5, hue: 'green', weight: 700, knock: true });
  f.path('M400 68 V96 H475 V119', { style: 'call' });
  f.text(438, 90, '否', { size: 11.5, hue: 'rose', weight: 700, knock: true });
  f.path('M400 168 V198 H325 V225', { style: 'call' });
  f.text(366, 192, '是', { size: 11.5, hue: 'green', weight: 700, knock: true });
  f.path('M560 168 V198 H543 V225', { style: 'call' });
  f.text(574, 192, '否', { size: 11.5, hue: 'rose', weight: 700, knock: true });
  f.path('M290 274 V302 H245 V329', { style: 'call' });
  f.text(266, 296, '是', { size: 11.5, hue: 'green', weight: 700, knock: true });
  f.path('M380 274 V302 H460 V329', { style: 'call' });
  f.text(420, 296, '否', { size: 11.5, hue: 'rose', weight: 700, knock: true });
  f.text(20, 214, '提高模型输出，', { size: 11.5, serif: true, hue: 'ink-soft' });
  f.text(20, 230, '前提是模型放得下。', { size: 11.5, serif: true, hue: 'ink-soft' });
});
