'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 84, name: "平台团队", sub: "A2A 之外", hue: 'grey' },
  { x: 262, name: 'planner', sub: '客户端', hue: 'violet' },
  { x: 548, name: 'deployer', sub: "端口 41243", hue: 'blue' },
];
const rows = [
  [1, 2, 'call', 'GET /.well-known/agent-card.json', null],
  [2, 1, 'reply', "公开卡片", "extendedAgentCard: true，方案 bearer"],
  [1, 2, 'call', 'GetExtendedAgentCard', "无 Authorization 头"],
  [2, 1, 'fail', 'HTTP 401 Unauthorized', 'WWW-Authenticate: Bearer realm="deployer"'],
  [0, 1, 'effect', 'bearer token', "A2A 之外签发"],
  [1, 2, 'call', 'GetExtendedAgentCard', 'Authorization: Bearer dpl_test_7c1e4b'],
  [2, 1, 'reply', "扩展卡片", "技能 deploy、rollback，无签名"],
];

module.exports = figure('fig-extended-card', {
  height: 420,
  title: "获取扩展卡片",
  desc: "三条生命线：A2A 之外的平台团队、planner、deployer。七步依序出现。planner 读取声明 extendedAgentCard true 和 bearer 方案的公开卡片，无 Authorization 头调用 GetExtendedAgentCard，得到 HTTP 401 和 WWW-Authenticate: Bearer realm=\"deployer\"。平台团队在 A2A 之外签发 bearer token，planner 带 token 再调用，得到技能为 deploy、rollback 且不带签名的扩展卡片。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 132, h: 40, hue: lane.hue, title: lane.name, titleSize: 12, sub: lane.sub, anchor: 'middle' });
    f.lifeline(lane.x, 50, 408);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 84 + index * 48;
    f.beat(index + 1);
    f.step(20, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX: (x1 + x2) / 2 });
  });
})
  // 保留冻结背景几何，只替换最终 SVG 中的完整文字节点。
  .replace(">bearer token</text>", ">bearer 令牌</text>");
