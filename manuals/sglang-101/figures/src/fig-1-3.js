'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 70, name: "客户端", hue: 'olive', w: 110 },
  { x: 220, name: 'TokenizerManager', hue: 'blue' },
  { x: 390, name: 'Scheduler', hue: 'blue' },
  { x: 560, name: 'Detokenizer', hue: 'blue' },
];

module.exports = figure('fig-1-3', {
  height: 470,
  title: "一个 /generate 请求经过三个进程",
  desc: "四条生命线：客户端、tokenizer manager、scheduler、detokenizer。客户端发送五 token prompt，tokenizer manager 经 ZMQ 发送 ID。Scheduler 匹配两个缓存 token、prefill 三个，68 ms 后返回首 token。随后十一个 decode 步，detokenizer 返回文本，端到端 725 ms。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: lane.w || 150, h: 30, hue: lane.hue, title: lane.name, titleSize: 12, anchor: 'middle' });
    f.lifeline(lane.x, 40, 462);
  }
  const rows = [
    [0, 1, 'call', 'POST /generate', 'The capital of France is'],
    [1, 2, 'event', "5 个 token ID", "一条 ZMQ 消息"],
    [2, 2, null, 'match_prefix', "2 个 token 已缓存"],
    [2, 2, null, 'prefill', "3 个新 token"],
    [2, 3, 'event', "首 token", "请求后 68 ms"],
    [2, 3, 'event', "后续 11 个 token", "decode 步骤，657 ms"],
    [3, 1, 'event', 'text', 'Paris. The capital of Italy is'],
    [1, 0, 'reply', '200 OK', 'e2e_latency 0.725 s'],
  ];
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 74 + index * 48;
    f.beat(index + 1);
    f.step(16, y, index + 1);
    const x1 = lanes[from].x;
    if (from === to) {
      const hue = label === 'match_prefix' ? 'green' : 'plum';
      f.box({ x: x1 - 66, y: y - 16, w: 132, h: 40, hue, title: label, sub: note });
      return;
    }
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX: (x1 + x2) / 2 });
  });
});
