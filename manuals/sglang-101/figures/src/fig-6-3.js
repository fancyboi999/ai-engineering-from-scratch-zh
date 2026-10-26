'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 84, name: "客户端", hue: 'olive' },
  { x: 242, name: "网关", hue: 'blue' },
  { x: 400, name: "预填充", sub: "引导服务 :8998", hue: 'blue' },
  { x: 558, name: "解码", hue: 'blue' },
];

const rows = [
  [0, 1, 'call', 'POST /generate', null],
  [1, 2, 'call', "请求 + bootstrap_room", "一个随机 63 位数"],
  [1, 3, 'call', "同请求、同 room", "同时发送"],
  [3, 2, 'call', "/route，然后发送槽位地址", "decode 先预留 KV 槽"],
  [2, 3, 'write', "RDMA 写入 KV 页", "prefill 前向完成后"],
  [3, 0, 'event', "token 流", "decode 服务客户端"],
];

module.exports = figure('fig-6-3', {
  height: 380,
  title: "一个分离服务请求",
  desc: "四条生命线：客户端、网关、带 8998 端口 bootstrap 服务的 prefill 服务器、decode 服务器。客户端向网关发送请求，网关同时向 prefill/decode 发送请求和 bootstrap room。Decode 查询 prefill rank，发送预留 KV 槽位地址；prefill 前向后通过 RDMA 写入 KV 页；decode 向客户端流式发送 token。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 132, h: lane.sub ? 44 : 30, hue: lane.hue, title: lane.name, sub: lane.sub ? [lane.sub] : undefined, anchor: 'middle' });
    f.lifeline(lane.x, lane.sub ? 54 : 40, 370);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 92 + index * 48;
    f.beat(index + 1);
    f.step(16, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX: (x1 + x2) / 2 });
  });
});
