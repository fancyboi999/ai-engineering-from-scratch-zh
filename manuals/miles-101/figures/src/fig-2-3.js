'use strict';

const { figure } = require('../../../_shared/figkit.js');

const NODE = 121.69;
const parts = [
  { gb: 36.77, hue: 'blue', title: '训练器进程', sub: '36.8 GB' },
  { gb: 2.73 + 1.33, hue: 'violet', title: '引擎', sub: '4.1 GB' },
  { gb: 115.86 - 36.77 - 2.73 - 1.33, hue: 'grey', title: '其他已用内存', sub: '75.0 GB' },
  { gb: NODE - 115.86, hue: 'green', title: '空闲', sub: '5.8 GB' },
];

module.exports = figure('fig-2-3', {
  height: 300,
  title: 'Ray 读取整台 GB10 的内存',
  desc: 'Ray 停止第一次 4B 训练时读取的内存占用，以一条 121.69 GB 的长条表示。训练器进程使用了 36.77 GB，引擎进程使用了 4.06 GB。已使用的 115.86 GB 中，其余内存没有出现在进程列表里。我们判断其中大部分是 GPU 分配。空闲内存为 5.83 GB。',
}, f => {
  const x0 = 20;
  const w = 600;
  const scale = w / NODE;
  let x = x0;
  f.kicker(20, 30, 'Ray 停止训练器时的节点内存，121.7 GB');
  parts.forEach((p, i) => {
    const pw = p.gb * scale;
    f.rect(x, 48, pw, 56, { hue: p.hue, dash: p.hue === 'green' ? 'dashed' : undefined });
    const labelY = i % 2 ? 154 : 132;
    f.leader([x + pw / 2, 104], [x + pw / 2, labelY - 13]);
    f.text(Math.min(Math.max(x + pw / 2, 70), 570), labelY, `${p.title}, ${p.sub}`, { size: 11.5, anchor: 'middle', hue: p.hue === 'grey' ? 'ink-soft' : p.hue });
    x += pw;
  });
  const limit = x0 + 0.95 * NODE * scale;
  f.line(limit, 40, limit, 112, { style: 'fail', head: false, packet: false });
  f.text(limit - 4, 40, '使用率超过 95% 时停止', { size: 11, anchor: 'end', hue: 'rose' });
  f.text(20, 210, 'GB10 上的 GPU 和 CPU 共用此内存。', { size: 12, serif: true });
  f.text(20, 234, '我们的判断：GPU 分配也计入已用内存，因此 Ray 停止是实际警告。', { size: 12, serif: true });
  f.text(20, 270, '进程大小是 Ray 列出的主要进程常驻内存。', { size: 11, serif: true, hue: 'ink-soft' });
});
