'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 130, title: '客户端', sub: "生成的 stub", hue: 'violet' },
  { x: 500, title: 'A2AService', sub: 'lf.a2a.v1', hue: 'blue' },
];

const rows = [
  [0, 1, 'call', 'SendStreamingMessage(SendMessageRequest)', 'metadata: a2a-version, a2a-extensions'],
  [1, 0, 'event', 'StreamResponse { task }', "服务器创建的 Task"],
  [1, 0, 'event', 'StreamResponse { status_update }', 'TaskStatusUpdateEvent'],
  [1, 0, 'event', 'StreamResponse { artifact_update }', "TaskArtifactUpdateEvent，一个分块"],
  [1, 0, 'event', 'StreamResponse { status_update }', "终态 TaskState"],
  [1, 0, 'reply', "rpc 状态", "流随 rpc 结束"],
];

module.exports = figure('fig-grpc-call', {
  height: 352,
  title: "gRPC 上的一次 SendStreamingMessage",
  desc: "两条生命线的时序图：客户端 stub 和包 lf.a2a.v1 中的 A2AService。客户端发送一次 SendStreamingMessage rpc，包含 SendMessageRequest 和 a2a-version、a2a-extensions metadata 键。服务器用 StreamResponse 消息流回答：先是 task，再是 status_update 和 artifact_update 负载，最后是带终态的 status_update。rpc 状态结束流。套件没有 gRPC 采集，因此图中只用 proto 名称。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 8, w: 150, h: 38, hue: lane.hue, title: lane.title, sub: lane.sub, anchor: 'middle' });
    f.lifeline(lane.x, 46, 340);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 84 + index * 48;
    f.beat(index + 1);
    f.step(24, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX: (x1 + x2) / 2 });
  });
});
