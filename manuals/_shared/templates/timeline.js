'use strict';

const { figure, color } = require('../figkit.js');

module.exports = figure('tpl-timeline', {
  height: 236,
  title: '同一提交轴上的两条轨道',
  desc: '两条轨道沿编号提交轴从左向右展开。实线条表示任务运行，斜线填充条表示等待；玫红停止线穿过两条轨道，之后的虚线条表示任务恢复执行。',
}, f => {
  f.kicker(20, 64, '轨道 1');
  f.kicker(20, 134, '轨道 2');
  f.text(100, 44, '已提交', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.rect(100, 54, 140, 12, { fill: color('amber-ink'), stroke: 'none' });
  f.hatchRect(240, 54, 80, 12);
  f.rect(320, 54, 60, 12, { fill: color('amber-ink'), stroke: 'none' });
  f.rect(420, 54, 120, 12, { fill: 'none', stroke: color('amber-ink'), dash: 'dashed' });
  f.text(480, 44, '已恢复', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.rect(140, 124, 120, 12, { fill: color('amber-ink'), stroke: 'none' });
  f.rect(260, 124, 120, 12, { fill: color('amber-ink'), stroke: 'none' });
  f.rect(420, 124, 80, 12, { fill: 'none', stroke: color('amber-ink'), dash: 'dashed' });
  f.text(200, 114, '无需等待', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.rule(400, 26, 400, 186, { hue: 'rose', dash: 'dashed', width: 1.4 });
  f.text(400, 18, '进程停止', { size: 11, hue: 'rose', anchor: 'middle', weight: 700 });
  f.rule(60, 196, 620, 196, { hue: 'ink' });
  for (let k = 0; k <= 14; k += 1) {
    const x = 60 + k * 40;
    f.rule(x, 192, x, 200, { hue: 'ink' });
    f.text(x, 214, String(k * 4 + 1), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.kicker(20, 232, '提交序号');
});
