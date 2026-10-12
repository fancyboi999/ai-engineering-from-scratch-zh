'use strict';

const { figure } = require('../figkit.js');

module.exports = figure('tpl-decision', {
  height: 272,
  title: '失败位置决定结果',
  desc: '从左向右依次为校验、准备、存储、应用和发布。前两步失败则回滚，存储拒绝则返回拒绝；存储结果不确定或应用失败会使进程不可继续使用。底行说明各情况下一步如何处理。',
}, f => {
  f.kicker(20, 18, '失败位置');
  const phases = [['校验', '输入有误'], ['准备', '拥有者、ID'], ['存储', '后端'], ['应用', '内存状态'], ['发布', '观察者']];
  phases.forEach(([title, sub], index) => f.box({ x: 20 + index * 120, y: 26, w: 110, h: 46, hue: index === 2 ? 'teal' : 'grey', title, sub }));
  f.box({ x: 20, y: 118, w: 230, h: 54, hue: 'teal', title: '已回滚', sub: '未存储，也未展示' });
  f.box({ x: 260, y: 118, w: 110, h: 54, hue: 'teal', title: '已拒绝', sub: '拒绝，状态安全' });
  f.box({ x: 380, y: 118, w: 230, h: 54, hue: 'rose', title: '不可继续使用', sub: '结果未知，停止' });
  f.arrow([75, 72], [75, 117], { style: 'call' });
  f.arrow([195, 72], [195, 117], { style: 'call' });
  f.arrow([300, 72], [300, 117], { style: 'call' });
  f.path('M330 72 V94 H420 V117', { style: 'fail' });
  f.arrow([435, 72], [435, 117], { style: 'fail' });
  f.box({ x: 20, y: 212, w: 350, h: 48, hue: 'grey', title: '继续', sub: '下次提交正常运行' });
  f.box({ x: 380, y: 212, w: 230, h: 48, hue: 'grey', title: '重新打开', sub: '先关闭，再打开' });
  f.arrow([135, 172], [135, 211], { style: 'reply' });
  f.arrow([315, 172], [315, 211], { style: 'reply' });
  f.arrow([495, 172], [495, 211], { style: 'reply' });
});
