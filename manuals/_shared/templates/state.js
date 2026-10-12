'use strict';

const { figure } = require('../figkit.js');

module.exports = figure('tpl-state', {
  height: 262,
  title: '任务的状态机',
  desc: '任务从 pending 进入 running，可暂停到 waiting 后再恢复，也可进入 completed、failed 或 canceled 三种终态之一。双边框表示终态，虚线边框表示中断态。',
}, f => {
  f.kicker(20, 82, '活动状态');
  f.kicker(470, 18, '终态');
  f.box({ x: 20, y: 100, w: 124, h: 40, hue: 'amber', title: 'pending' });
  f.box({ x: 180, y: 100, w: 124, h: 40, hue: 'amber', title: 'running' });
  f.box({ x: 180, y: 196, w: 124, h: 40, hue: 'amber', title: 'waiting', dash: 'dashed' });
  f.box({ x: 470, y: 30, w: 150, h: 40, hue: 'green', title: 'completed', double: true });
  f.box({ x: 470, y: 100, w: 150, h: 40, hue: 'rose', title: 'failed', double: true });
  f.box({ x: 470, y: 170, w: 150, h: 40, hue: 'grey', title: 'canceled', double: true });
  f.arrow([144, 120], [179, 120], { style: 'state' });
  f.text(162, 94, '预留', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.path('M304 120 H380', { style: 'state', head: false });
  f.path('M380 120 V50 H469', { style: 'state' });
  f.path('M380 120 H469', { style: 'state' });
  f.path('M380 120 V190 H469', { style: 'state' });
  f.text(430, 44, 'ok', { size: 11.5, hue: 'amber', anchor: 'middle' });
  f.text(430, 114, 'error', { size: 11.5, hue: 'amber', anchor: 'middle' });
  f.text(430, 184, 'abort', { size: 11.5, hue: 'amber', anchor: 'middle' });
  f.line(212, 140, 212, 195, { style: 'state' });
  f.line(272, 196, 272, 141, { style: 'state' });
  f.text(204, 172, '需要输入', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
  f.text(280, 172, '输入到达', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 256, '双边框：终态 · 虚线边框：中断态', { size: 11, serif: true, hue: 'ink-soft' });
});
