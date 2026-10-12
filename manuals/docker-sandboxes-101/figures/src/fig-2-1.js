'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-1', {
  height: 300,
  title: '本地沙箱的四种状态',
  desc: '四态：不存在、running、stopped、已移除。create/run 从不存在到运行；stop 和自动停止到 stopped；run --name、exec、ports 恢复运行；rm/prune 从 stopped 到移除；rm --force 或 run --rm 从运行到移除。名称为录制的 m101-demo 与 m101-demo-2。',
}, f => {
  const absent = f.box({ x: 20, y: 70, w: 120, h: 64, hue: 'grey', dash: 'dashed', title: 'absent', sub: ['sbx ls 中无记录'] });
  const running = f.box({ x: 240, y: 70, w: 140, h: 64, hue: 'amber', title: 'running', sub: ['m101-demo', 'm101-demo-2'] });
  const removed = f.box({ x: 500, y: 70, w: 120, h: 64, hue: 'grey', double: true, title: 'removed', sub: ['从 sbx ls 消失'] });
  const stopped = f.box({ x: 240, y: 210, w: 140, h: 64, hue: 'amber', dash: 'dashed', title: 'stopped', sub: ['状态保留'] });
  f.arrow(absent.right(), [running.x - 1, absent.cy], { style: 'state', label: 'sbx create', note: 'sbx run' });
  f.arrow(running.right(), [removed.x - 1, running.cy], { style: 'state', label: 'sbx rm --force', note: 'sbx run --rm' });
  f.arrow([262, running.y + running.h], [262, stopped.y - 1], { style: 'state', label: 'sbx stop', note: '或自动停止' });
  f.arrow([358, stopped.y], [358, running.y + running.h + 1], { style: 'state', label: 'sbx run --name', note: 'sbx exec, sbx ports' });
  f.path(`M${stopped.x + stopped.w} ${stopped.cy} H560 V${removed.y + removed.h + 1}`, { style: 'state' });
  f.text(470, stopped.cy - 6, 'sbx rm', { size: 11.5, hue: 'amber', anchor: 'middle', knock: true });
  f.text(470, stopped.cy + 15, 'sbx prune，仅 stopped', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle', knock: true });
  f.text(20, 292, '虚线边框：无运行 microVM · 双边框：无残留记录', { size: 11, serif: true, hue: 'ink-soft' });
});
