'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { title: '客户端', sub: 'curl', hue: 'olive' },
  { title: 'atenet-router', sub: '数据平面', hue: 'indigo' },
  { title: 'ate-api-server', sub: '控制平面', hue: 'blue' },
  { title: 'Postgres', sub: 'actor 行', hue: 'teal' },
  { title: 'worker pod', sub: 'my-counter-1', hue: 'violet' },
  { title: '外部主机', sub: '非 Substrate', hue: 'olive' },
];
const cx = index => 60 + index * 104;

const rows = [
  [0, 1, 'call', 'POST /, ate-target-actor', '调用 · 墨色实线'],
  [2, 3, 'write', 'worker 分配行', '持久写入 · 青绿实线'],
  [2, 4, 'state', 'SUSPENDED 到 RUNNING', '状态迁移 · 琥珀虚线'],
  [1, 4, 'event', 'CONNECT 隧道，端口 8443', '流 · 靛蓝点线'],
  [4, 5, 'model', 'POST 到 mock-llm:8080', '模型调用 · 梅紫实线'],
  [4, 5, 'effect', 'GET https://example.org/, 200', '外部副作用 · 橄榄虚线'],
  [1, 0, 'reply', '200, count 1, 0.36 s', '回复 · 墨色虚线'],
  [1, 0, 'fail', '503 无可用 worker', '失败 · 玫红虚线'],
];

module.exports = figure('fig-0-1', {
  height: 470,
  title: '如何阅读本手册的时序图',
  desc: '六条生命线：客户端、atenet-router、ate-api-server、Postgres、运行 my-counter-1 的 worker pod 与外部主机。八个编号行展示八种箭头样式：带 ate-target-actor 头的 POST 为墨色实线调用，worker 分配行为青绿实线持久写入，SUSPENDED 到 RUNNING 为琥珀虚线状态迁移，端口 8443 的 CONNECT 隧道为靛蓝点线流，发往 mock-llm 的 POST 为梅紫实线模型调用，发往 example.org 的 GET 为橄榄虚线外部副作用，0.36 s 返回 count 1 的 200 为墨色虚线回复，503 无可用 worker 为玫红虚线失败。',
}, f => {
  lanes.forEach((lane, index) => {
    f.box({ x: cx(index), y: 8, w: 100, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11, anchor: 'middle', pad: 3 });
    f.lifeline(cx(index), 48, 460);
  });
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 84 + index * 48;
    f.beat(index + 1);
    f.step(16, y, index + 1, { hue: style === 'fail' ? 'rose' : undefined });
    const x1 = cx(from);
    const x2 = cx(to);
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note });
  });
});
