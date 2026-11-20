'use strict';

const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/long-threads-x86-real.json'));
const variants = [
  { key: 'none', hue: 'plum', name: '无摘要' },
  { key: 'tok6000_keep1500', hue: 'blue', name: '6,000 token，保留 1,500' },
  { key: 'msgs60_keep7', hue: 'teal', name: '60 条消息，保留 7' },
  { key: 'msgs20_keep1', hue: 'green', name: '20 条消息，保留 1' },
];
const v = key => data.variants[key];
const s = ms => ms / 1000;
const mid = block => { const [a, b] = block.turns.split('-').map(Number); return (a + b) / 2; };
const medians = key => v(key).blocks.map(block => s(block.turn_p50_ms));
const triggered = variants.filter(variant => variant.key !== 'none');
const low = Math.min(...triggered.flatMap(variant => medians(variant.key)));
const high = Math.max(...triggered.flatMap(variant => medians(variant.key)));
const full = v('none').full_context_turns;
const slow = full.map(turn => turn.turn_s);

module.exports = figure('fig-5-5', {
  height: 380,
  title: 'Qwen3 4B 上 200 轮的每轮耗时，有无摘要的对比',
  desc: `点图，展示每 25 轮为一块的每轮耗时中位数，纵轴为 1 到 1,000 秒的对数刻度，每个变体在 x86 服务器虚拟机上运行一次。没有摘要时，中位数从 ${s(v('none').blocks[0].turn_p50_ms).toFixed(1)} s 增长到 ${s(v('none').blocks[v('none').blocks.length - 1].turn_p50_ms).toFixed(1)} s，运行在第 ${v('none').turns} 轮之后停止。空心圆圈标出它的第 ${full[0].turn} 到 ${full[full.length - 1].turn} 轮，此时 prompt 已达 ${v('none').prompt_tokens_max.toLocaleString('en-US')} 个 token，每轮耗时 ${Math.min(...slow).toFixed(0)} 到 ${Math.max(...slow).toFixed(0)} s。设置了触发条件后，200 轮里每块的中位数都保持在 ${low.toFixed(1)} 到 ${high.toFixed(1)} s 之间。每条线后面的阴影带覆盖每块中各轮的第 10 到第 90 百分位，其顶部是包含一次摘要调用的轮。`,
}, f => {
  const c = chart(f, { x: 70, y: 40, w: 380, h: 250, yScale: 'log10', xDomain: [0, 200], yDomain: [1, 1000], xTicks: [0, 25, 50, 75, 100, 125, 150, 175, 200], yTicks: [1, 3, 10, 30, 100, 300, 1000], yLabel: '每轮耗时中位数（秒）', xLabel: '轮序号', yFormat: t => String(t) });
  variants.forEach(variant => c.band(v(variant.key).blocks.map(block => [mid(block), s(block.turn_p10_ms)]), v(variant.key).blocks.map(block => [mid(block), s(block.turn_p90_ms)]), { hue: variant.hue, opacity: 0.12 }));
  const ends = [];
  variants.forEach(variant => {
    const points = v(variant.key).blocks.map(block => [mid(block), s(block.turn_p50_ms)]);
    c.series(points, { hue: variant.hue, r: 2.8 });
    if (variant.key !== 'none') ends.push({ ...variant, y: c.py(points[points.length - 1][1]) });
  });
  full.forEach(turn => f.emit(`<circle cx="${c.px(turn.turn).toFixed(1)}" cy="${c.py(turn.turn_s).toFixed(1)}" r="3.2" fill="${color('paper')}" stroke="${color('plum-ink')}" stroke-width="1.4"/>`));
  f.text(c.px(full[full.length - 1].turn) + 10, c.py(Math.max(...slow)) + 4, `无摘要，第 ${full[0].turn} 到 ${full[full.length - 1].turn} 轮`, { size: 11, hue: 'plum', knock: true });
  f.text(c.px(full[full.length - 1].turn) + 10, c.py(Math.max(...slow)) + 18, `上下文已满，运行停止`, { size: 11, hue: 'plum', knock: true });
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i += 1) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  ends.forEach(end => f.text(c.px(200) + 10, end.y + 4, end.name, { size: 11, hue: end.hue }));
  f.text(20, 340, '每个变体运行一次，使用 PostgresSaver，Qwen3 4B 跑在 CPU 上。每个点是 25 轮的中位数，', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 356, '每个空心圆圈是一轮。阴影带覆盖每块的第 10 到第 90 百分位。', { size: 11, serif: true, hue: 'ink-soft' });
});
