'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const runs = load(path.join(__dirname, '../../capture/gpu/summary/miles-gb10-lab.json')).runs;
const gain = key => { const r = runs[key].per_step.slice(0, 24); const m = rows => rows.reduce((a, x) => a + x.reward, 0) / rows.length; return m(r.slice(16, 24)) - m(r.slice(0, 8)); };
const items = [
  { name: '4', key: 'e2-n4', hue: 'olive' },
  { name: '8a', key: 'plain-48', hue: 'green' },
  { name: '8b', key: 'plain-48-s2', hue: 'green' },
  { name: '8c', key: 'plain-48-s3', hue: 'green' },
  { name: '16', key: 'e2-n16', hue: 'teal' },
].map(i => ({ ...i, value: gain(i.key), label: `+${gain(i.key).toFixed(3)}` }));

module.exports = figure('fig-3-1', {
  height: 330,
  title: '每个 prompt 答案更多，24 步内的学习效果相近',
  desc: `前 24 步的 reward 增幅，即第 16 至 23 步平均值减去第 0 至 7 步平均值。分别比较每个 prompt 生成 4、8 和 16 个答案的配置。4 个答案：+${gain('e2-n4').toFixed(3)}。8 个答案的三个随机种子：+${gain('plain-48').toFixed(3)}、+${gain('plain-48-s2').toFixed(3)}、+${gain('plain-48-s3').toFixed(3)}。16 个答案：+${gain('e2-n16').toFixed(3)}。`,
}, f => {
  const c = chart(f, { x: 60, y: 40, w: 560, h: 210, xDomain: [0, 1], yDomain: [0, 0.12], yTicks: [0, 0.12], yFormat: v => v.toFixed(2), yLabel: 'reward gain over 24 steps' });
  c.bars(items, { width: 60 });
  f.text(340, 284, '每个 prompt 的答案数', { size: 11.5, anchor: 'middle', serif: true, hue: 'ink-soft' });
  f.text(60, 316, '8a、8b、8c 分别使用随机种子 1234、2、3。', { size: 12, serif: true });
});
