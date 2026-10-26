'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 80, name: "客户端", hue: 'olive' },
  { x: 240, name: 'TokenizerManager', hue: 'blue' },
  { x: 400, name: '调度器', hue: 'blue' },
  { x: 560, name: 'detokenizer', hue: 'blue' },
];

const rows = [
  [0, 1, 'call', "POST，stream true"],
  [1, 2, 'event', "已分词请求"],
  [2, 3, 'event', "新 token ID"],
  [3, 1, 'event', "新文本"],
  [1, 0, 'event', "SSE 输出块"],
  [2, 2, 'state', "暂存可能的停止前缀"],
  [2, 2, 'state', "停止字符串匹配，结束"],
  [2, 3, 'event', "最后 ID，finish_reason stop"],
  [3, 1, 'event', "裁去停止字符串的文本"],
  [1, 0, 'reply', "最后输出块，再发 [DONE]"],
];

module.exports = figure('fig-2-5', {
  height: 492,
  title: "带停止字符串的流式请求",
  desc: "四条生命线：客户端、TokenizerManager、scheduler、detokenizer。客户端发送流式请求，scheduler 将 token ID 发给 detokenizer，后者把文本作为 SSE 输出块送回客户端。Scheduler 暂存尾部可能构成停止字符串开头的文本，匹配停止字符串后结束，detokenizer 在最后输出块前裁去停止文本。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 140, h: 30, hue: lane.hue, title: lane.name, titleSize: 12, anchor: 'middle' });
    f.lifeline(lane.x, 40, 484);
  }
  rows.forEach(([from, to, style, label], index) => {
    const y = 76 + index * 41;
    f.step(20, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    if (from === to) {
      f.dot(x1, y, { hue: 'amber', r: 4 });
      f.text(x1 + 12, y + 4, label, { size: 11, hue: 'amber', knock: true });
      return;
    }
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, labelX: (x1 + x2) / 2 });
  });
});
