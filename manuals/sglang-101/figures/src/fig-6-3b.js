'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-3b', {
  height: 236,
  title: "一次传输的 KVPoll 状态",
  desc: "一行四状态：Bootstrapping 1、WaitingForInput 2、Transferring 3、Success 4，依次前进。下方 Failed 0 可由 bootstrap、等待、传输三阶段到达。",
}, f => {
  const states = [
    { x: 20, title: 'Bootstrapping', sub: 'KVPoll 1' },
    { x: 176, title: 'WaitingForInput', sub: 'KVPoll 2' },
    { x: 332, title: 'Transferring', sub: 'KVPoll 3' },
    { x: 488, title: 'Success', sub: 'KVPoll 4' },
  ];
  f.kicker(20, 22, "一个请求、一次传输");
  const boxes = states.map((state, index) => f.box({ x: state.x, y: 34, w: 140, h: 50, hue: index === 3 ? 'teal' : 'amber', title: state.title, titleSize: 12, sub: [state.sub] }));
  for (let i = 0; i < boxes.length - 1; i += 1) {
    f.arrow(boxes[i].right(), [boxes[i + 1].x - 1, boxes[i].cy], { style: 'state' });
  }
  const failed = f.box({ x: 230, y: 164, w: 180, h: 50, hue: 'rose', title: 'Failed', sub: ['KVPoll 0'] });
  for (let i = 0; i < 3; i += 1) {
    f.arrow(boxes[i].bottom(), [failed.x + 30 + i * 60, failed.y - 1], { style: 'fail' });
  }
});
