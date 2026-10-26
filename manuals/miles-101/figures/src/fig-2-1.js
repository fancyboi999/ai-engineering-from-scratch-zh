'use strict';

const { figure } = require('../../../_shared/figkit.js');
const { chart, legend } = require('../../../_shared/chart.js');

const NODE = 121.69;
const LIMIT = 0.95 * NODE;
const items = [
  { name: '0.6B', value: 0.6 * 16, hue: 'blue', label: '约 10 GB' },
  { name: '1.7B', value: 1.7 * 16, hue: 'blue', label: '约 27 GB' },
  { name: '4B', value: 4 * 16, hue: 'blue', label: '约 64 GB' },
  { name: '4B，第 1 次', value: 115.86, hue: 'rose', label: ' ' },
  { name: '4B，第 2 次', value: 119.18, hue: 'rose', label: ' ' },
];

module.exports = figure('fig-2-1', {
  height: 340,
  title: '1.7B 能运行短步骤，4B 则不能',
  desc: '蓝色柱表示 Adam 全量微调的 trainer 状态估算值，按每个参数 16 字节计算，未包含激活值和 engine。玫红色柱表示 Ray 停止两次 4B 训练时读取的节点内存：内存比例为 0.4 时占用 115.86 GB，设为 0.2 时占用 119.18 GB；节点总内存为 121.69 GB。Ray 会在使用率超过 95%（约 115.6 GB）时停止 worker。',
}, f => {
  const c = chart(f, { x: 60, y: 56, w: 560, h: 210, xDomain: [0, 1], yDomain: [0, 130], yTicks: [0, 30, 60, 90, 120], yLabel: 'GB' });
  f.rule(60, c.py(NODE), 620, c.py(NODE), { hue: 'ink' });
  f.text(64, c.py(NODE) - 5, '节点内存：121.7 GB', { size: 11, hue: 'ink-soft' });
  f.line(60, c.py(LIMIT), 620, c.py(LIMIT), { style: 'fail', head: false, packet: false });
  f.text(64, c.py(LIMIT) + 14, 'Ray 会在节点内存超过 95% 时停止 worker', { size: 11, hue: 'rose', knock: true });
  c.bars(items, { width: 60 });
  c.note(0.7, 70, '115.9 GB', { anchor: 'middle', hue: 'rose', serif: false });
  c.note(0.9, 70, '119.2 GB', { anchor: 'middle', hue: 'rose', serif: false });
  legend(f, [{ name: 'trainer 状态估算值', hue: 'blue' }, { name: 'Ray 停止时的节点内存', hue: 'rose' }], 60, 22);
  f.text(60, 324, '降低 engine 内存仍无法运行 4B。所有测试都将答案上限设为 256 token。', { size: 12, serif: true });
});
