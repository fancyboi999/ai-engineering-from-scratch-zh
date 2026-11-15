'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const SLOT = 30;
const GAP = 6;

function slots(f, x, y, count, perRow, style, size = SLOT) {
  for (let i = 0; i < count; i += 1) {
    const cx = x + (i % perRow) * (size + GAP);
    const cy = y + Math.floor(i / perRow) * (size + GAP);
    f.rect(cx, cy, size, size, style);
  }
}

module.exports = figure('fig-4-5', {
  height: 330,
  title: '每个 worker 可运行的 actor 数取决于该 worker 上报的 CPU',
  desc: '左右两列。左列中，两个上限为 2 CPU 的 worker 各自上报 2000 millicores，各容纳两个声明 1 CPU 的 actor；第 5 个 actor 没有空位，请求在 5.06 s 后返回 503。右列中，16 vCPU 节点上一个未设上限的 kagent worker 上报 16000 millicores；同时发起 24 个轮次时，16 个 actor 运行，8 个等待。',
}, f => {
  f.kicker(20, 18, '设上限：cpu 2, memory 3Gi');
  f.kicker(336, 18, '未设上限，16 vCPU 节点');
  f.rule(320, 8, 320, 322, { dash: 'dashed' });

  const running = { fill: color('green-fill'), stroke: color('green-ink') };
  const waiting = { fill: 'none', stroke: color('amber-ink'), dash: 'dashed' };
  const refused = { fill: color('rose-fill'), stroke: color('rose-ink'), dash: 'dashed' };

  f.rect(20, 34, 130, 92, { hue: 'violet' });
  f.text(85, 52, 'worker bzgjd', { size: 11.5, anchor: 'middle', weight: 700 });
  slots(f, 49, 62, 2, 2, running);
  f.text(85, 114, 'CPU 2000/2000', { size: 11, anchor: 'middle', hue: 'ink-soft' });
  f.rect(162, 34, 130, 92, { hue: 'violet' });
  f.text(227, 52, 'worker f65dl', { size: 11.5, anchor: 'middle', weight: 700 });
  slots(f, 191, 62, 2, 2, running);
  f.text(227, 114, 'CPU 2000/2000', { size: 11, anchor: 'middle', hue: 'ink-soft' });

  slots(f, 49, 150, 1, 1, refused);
  f.text(90, 162, '第 5 个 actor b0-5', { size: 11.5, weight: 700, hue: 'rose' });
  f.text(90, 178, '5.06 s 后返回 503', { size: 11, hue: 'rose' });
  f.text(20, 218, '容量：2 worker x 2 CPU = 4 个 actor', { size: 11.5 });
  f.text(20, 236, '每个 actor 声明 1000 millicores', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 252, '内存并非瓶颈：512Mi / 3008Mi', { size: 11, serif: true, hue: 'ink-soft' });

  f.rect(336, 34, 284, 196, { hue: 'violet' });
  f.text(478, 52, 'worker kagent-default', { size: 11.5, anchor: 'middle', weight: 700 });
  slots(f, 345, 62, 16, 8, running, 28);
  f.text(478, 146, 'CPU 16000/16000，16 个轮次运行', { size: 11, anchor: 'middle', hue: 'ink-soft' });
  slots(f, 345, 162, 8, 8, waiting, 28);
  f.text(478, 210, '其余 8 个轮次等待空闲 CPU', { size: 11, anchor: 'middle', hue: 'amber' });
  f.text(336, 252, '24 个轮次同时发起，全部完成', { size: 11.5 });
  f.text(336, 270, 'kagent 实测耗时 4.3 至 7.8 s', { size: 11, serif: true, hue: 'ink-soft' });

  const legend = [[running, '运行中 actor，1 CPU', 20], [waiting, '等待中', 180], [refused, '被拒绝', 256]];
  for (const [style, label, x] of legend) {
    f.rect(x, 298, 14, 12, style);
    f.text(x + 20, 308, label, { size: 11, serif: true, hue: 'ink-soft' });
  }
});
