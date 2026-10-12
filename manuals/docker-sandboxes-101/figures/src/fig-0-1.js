'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { title: 'sbx', sub: 'CLI', hue: 'blue' },
  { title: 'sandboxd', sub: '宿主守护进程', hue: 'blue' },
  { title: '策略存储', sub: '本地策略', hue: 'teal' },
  { title: '沙箱 VM', sub: '客户机', hue: 'blue' },
  { title: 'proxy :3128', sub: '在宿主', hue: 'indigo' },
  { title: 'example.com', sub: '外部', hue: 'grey' },
  { title: 'Model Runner', sub: ':12434', hue: 'plum' },
];
const cx = index => 52 + index * 89;

const rows = [
  [3, 4, 'call', 'CONNECT example.com:443', '调用 · 墨色实线'],
  [4, 3, 'fail', '403 Forbidden', '失败 · 玫红虚线'],
  [0, 1, 'call', 'allow network', '调用 · 墨色实线'],
  [1, 2, 'write', 'example.com [tcp]', '持久写入 · 青绿实线'],
  [1, 0, 'reply', 'Rule added', '回复 · 墨色虚线'],
  [3, 4, 'call', 'CONNECT example.com:443', '同一调用，现允许'],
  [4, 5, 'effect', 'tunnel to :443', '外部副作用 · 橄榄虚线'],
  [3, 6, 'model', 'POST chat/completions', '模型调用 · 梅紫实线'],
  [6, 3, 'event', 'chat.completion.chunk', '流 · 靛蓝点线'],
  [1, 3, 'state', 'running到stopped', '状态迁移 · 琥珀虚线'],
];

module.exports = figure('fig-0-1', {
  height: 540,
  title: '如何读本手册时序图',
  desc: '七条生命线：sbx CLI、sandboxd、本地策略存储、沙箱 VM、3128宿主代理、example.com、12434 Model Runner。十行展示八种箭头：CONNECT 为墨色实线调用，403 为玫红虚线失败，policy allow 为调用，example.com [tcp] 为青绿实线持久写，Rule added 为墨色虚线回复；第二次 CONNECT 后的隧道是橄榄虚线外部副作用，POST chat/completions 为梅紫模型调用，chat.completion.chunk 为靛蓝点线流，running 到 stopped 为琥珀虚线状态迁移。',
}, f => {
  lanes.forEach((lane, index) => {
    f.box({ x: cx(index), y: 8, w: 86, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11, anchor: 'middle', pad: 3 });
    f.lifeline(cx(index), 48, 532);
  });
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 84 + index * 46;
    f.beat(index + 1);
    f.step(16, y, index + 1, { hue: style === 'fail' ? 'rose' : undefined });
    const x1 = cx(from);
    const x2 = cx(to);
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note });
  });
});
