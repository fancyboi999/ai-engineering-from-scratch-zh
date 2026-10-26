'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  ['GPU idle, log grows', 'count 503 lines', 'read the first error'],
  ['FlashAttention 3 error', 'compute capability', 'not Hopper: no FA3'],
  ['Ray OutOfMemoryError', 'memory at the kill', 'use a smaller model'],
  ['step times differ', 'heat pauses', 'compare clean steps'],
  ['attention name rejected', 'the ValueError list', 'pick a listed name'],
];

module.exports = figure('fig-7-1', {
  height: 360,
  title: '从观察到的现象开始',
  desc: '我们运行中出现的五种症状，以及每种情况的首要检查项和修复方法。GPU 空闲但日志增长表示 engine 已退出。FlashAttention 3 错误表示 GPU 不是 Hopper，因为镜像中的 FA3 只为 Hopper 构建。Ray 内存不足错误表示节点内存已满。步骤耗时变化表示可能受 heat pause 影响。trainer 拒绝 attention 名称表示已安装的 transformers 库不支持该名称。',
}, f => {
  f.kicker(20, 28, 'symptom', { hue: 'rose' });
  f.kicker(240, 28, 'first check', { hue: 'amber' });
  f.kicker(440, 28, 'fix', { hue: 'green' });
  rows.forEach(([symptom, check, fix], i) => {
    const y = 42 + i * 58;
    const a = f.box({ x: 20, y, w: 190, h: 44, hue: 'rose', title: symptom, titleSize: 11.5 });
    const b = f.box({ x: 240, y, w: 166, h: 44, hue: 'amber', title: check, titleSize: 11.5, weight: 400 });
    const c = f.box({ x: 440, y, w: 180, h: 44, hue: 'green', title: fix, titleSize: 11.5, weight: 400 });
    f.arrow([a.x + a.w, y + 22], [b.x - 1, y + 22], { style: 'call' });
    f.arrow([b.x + b.w, y + 22], [c.x - 1, y + 22], { style: 'call' });
  });
  f.text(20, 342, '第 7.1 节列出了我们遇到的所有症状，以及 issue 报告中的另外六项。', { size: 12, serif: true });
});
