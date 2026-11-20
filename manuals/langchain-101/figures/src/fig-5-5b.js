'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/checkpoint-cost-x86.json'));
const steps = [10, 100, 1000, 5000];
const channels = [
  { key: 'plain', hue: 'plum', name: '普通，add_messages' },
  { key: 'delta100', hue: 'teal', name: 'DeltaChannel，每 100 步' },
  { key: 'delta1000', hue: 'indigo', name: 'DeltaChannel，每 1,000 步' },
];
const cell = (channel, n) => data.cells[`postgres ${channel} ${n}`];
const median = values => {
  const s = [...values].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

module.exports = figure('fig-5-5b', {
  height: 360,
  title: '一个线程的存储量随步数的变化，普通通道与 DeltaChannel 对比',
  desc: `双对数点图，展示一个线程的存储量（MB）与步数（10 到 5,000）的关系，使用 x86 服务器虚拟机上的 PostgresSaver。普通通道存储 ${cell('plain', 10).thread_mb[0]}、${cell('plain', 100).thread_mb[0]}、${cell('plain', 1000).thread_mb[0]} 和 ${cell('plain', 5000).thread_mb[0]} MB。每 100 步做一次快照的 DeltaChannel 在 5,000 步时存储 ${cell('delta100', 5000).thread_mb[0]} MB，每 1,000 步做一次快照的存储 ${cell('delta1000', 5000).thread_mb[0]} MB。`,
}, f => {
  const c = chart(f, { x: 70, y: 40, w: 370, h: 250, xScale: 'log10', yScale: 'log10', xDomain: [7, 7000], yDomain: [0.01, 10000], xTicks: steps, yTicks: [0.01, 0.1, 1, 10, 100, 1000, 10000], yLabel: '一个线程的存储量（MB）', xLabel: '步数', yFormat: t => (t >= 1000 ? `${t / 1000}k` : String(t)) });
  const ends = [];
  channels.forEach(channel => {
    const points = steps.map(n => [n, median(cell(channel.key, n).thread_mb)]);
    c.series(points, { hue: channel.hue, dots: false });
    steps.forEach(n => cell(channel.key, n).thread_mb.forEach((value, j) => f.dot(c.px(n) + (j - 1) * 4, c.py(value), { hue: channel.hue, r: 2.8 })));
    ends.push({ ...channel, y: c.py(points[points.length - 1][1]) });
  });
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  ends.forEach(end => f.text(c.px(7000) + 8, end.y + 4, end.name, { size: 11, hue: end.hue }));
  f.text(70, 346, '每个点是一次运行，持久性模式 sync，每步一条 400 个字符的消息。', { size: 11, serif: true, hue: 'ink-soft' });
});
