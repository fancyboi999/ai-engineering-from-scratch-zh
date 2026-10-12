'use strict';

const { figure } = require('../figkit.js');

module.exports = figure('tpl-comparison', {
  height: 236,
  title: '一次请求的两种回答',
  desc: '左右两列并排展示。左侧服务器直接回复消息，客户端一次拿到全部回答，无需继续跟踪；右侧返回任务，客户端拿到 ID 后持续跟踪，直到任务完成。',
}, f => {
  f.kicker(20, 18, 'A · 返回消息');
  f.kicker(336, 18, 'B · 返回任务');
  f.rule(320, 8, 320, 228, { dash: 'dashed' });
  const left = [
    { hue: 'violet', title: '请求', sub: '输入一条消息' },
    { hue: 'blue', title: '消息回复', sub: '立即返回全部回答' },
    { hue: 'grey', title: '无需跟踪', sub: '无 ID、无状态', dash: 'dashed' },
  ];
  const right = [
    { hue: 'violet', title: '请求', sub: '输入一条消息' },
    { hue: 'amber', title: '任务，状态 working', sub: '用 ID 跟踪' },
    { hue: 'amber', title: '任务，状态 completed', sub: '附带产物' },
  ];
  [[left, 20], [right, 336]].forEach(([column, x]) => {
    column.forEach((item, index) => {
      const y = 30 + index * 70;
      f.box({ x, y, w: 284, h: 44, ...item });
      if (index < column.length - 1) f.arrow([x + 142, y + 44], [x + 142, y + 69], { style: index === 0 ? 'call' : 'state' });
    });
  });
});
