'use strict';

const { figure } = require('../figkit.js');

module.exports = figure('tpl-tree', {
  height: 254,
  title: '一棵归属树',
  desc: '根会话拥有三个子项：generate 任务、tool 任务和分叉会话。tool 任务拥有子会话，子会话又拥有 generate 任务，因此取消 tool 任务会影响其下的所有子项。',
}, f => {
  const root = f.box({ x: 230, y: 16, w: 180, h: 42, hue: 'blue', title: 'conversation 1', sub: '根节点' });
  const children = [
    f.box({ x: 20, y: 110, w: 180, h: 44, hue: 'amber', title: 'task 9 · generate', sub: '一次模型调用' }),
    f.box({ x: 230, y: 110, w: 180, h: 44, hue: 'amber', title: 'task 12 · tool', sub: '一次工具调用' }),
    f.box({ x: 440, y: 110, w: 180, h: 44, hue: 'blue', title: 'conversation 10', sub: '在 entry 8 处分叉' }),
  ];
  f.path(`M${root.cx} 58 V84 H${children[0].cx} V110`, { style: 'call', hue: 'ink-mute', head: false });
  f.path(`M${root.cx} 84 V110`, { style: 'call', hue: 'ink-mute', head: false });
  f.path(`M${root.cx} 84 H${children[2].cx} V110`, { style: 'call', hue: 'ink-mute', head: false });
  const child = f.box({ x: 230, y: 198, w: 180, h: 44, hue: 'blue', title: 'conversation 14', sub: '归 task 12 所有' });
  f.box({ x: 440, y: 198, w: 180, h: 44, hue: 'amber', title: 'task 15 · generate', sub: '子项执行' });
  f.path(`M${child.cx} 154 V198`, { style: 'call', hue: 'ink-mute', head: false });
  f.path('M410 220 H440', { style: 'call', hue: 'ink-mute', head: false });
  f.text(328, 180, '拥有', { size: 11, serif: true, hue: 'ink-soft' });
});
