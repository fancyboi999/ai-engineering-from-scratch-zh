'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 100, w: 150, title: '客户端', sub: "A2A 客户端", hue: 'violet' },
  { x: 430, w: 210, title: "Research Assistant Agent", sub: "§4.6.1 示例卡片", hue: 'blue' },
];

const rows = [
  { y: 84, from: 0, to: 1, style: 'call', label: 'GET /.well-known/agent-card.json', note: "客户端读 capabilities.extensions" },
  { y: 128, from: 1, to: 0, style: 'reply', label: "卡片：capabilities.extensions", note: "citations/v1 和 geolocation/v1" },
  { y: 172, from: 0, to: 1, style: 'call', label: 'POST /message:send', note: 'A2A-Extensions: geolocation/v1', extra: "metadata 以 URI 为键：latitude、longitude" },
  { y: 232, from: 1, to: 0, style: 'reply', label: "200 OK，回传 A2A-Extensions", note: "指南建议 SHOULD，SDK 各异" },
  { y: 276, from: 0, to: 1, style: 'call', label: "POST /message:send，无 A2A-Extensions", note: "卡片标记扩展为必需时" },
  { y: 320, from: 1, to: 0, style: 'fail', label: 'ExtensionSupportRequiredError', note: '-32008, HTTP 400, FAILED_PRECONDITION' },
];

module.exports = figure('fig-extension-activation', {
  height: 372,
  title: "激活扩展与缺少必需扩展的错误",
  desc: "两条生命线：客户端和规范 §4.6.1 示例卡片的 Research Assistant Agent。客户端获取卡片，读取 capabilities.extensions 下两个扩展：https://standards.org/extensions/citations/v1 和 https://example.com/extensions/geolocation/v1。发送消息时，A2A-Extensions 头指定 geolocation 扩展，metadata 在该 URI 下保存 latitude、longitude。agent 回答 200 并回传头，这是扩展指南建议，但 SDK 各异。第二条消息没有该头，若卡片标记扩展为必需，则得到 ExtensionSupportRequiredError，代码 -32008。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 8, w: lane.w, h: 38, hue: lane.hue, title: lane.title, sub: lane.sub, anchor: 'middle' });
    f.lifeline(lane.x, 46, 360);
  }
  rows.forEach((row, index) => {
    f.beat(index + 1);
    f.step(24, row.y, index + 1);
    const x1 = lanes[row.from].x;
    const x2 = lanes[row.to].x;
    const labelX = (x1 + x2) / 2;
    f.arrow([x1, row.y], [x2 + (x2 > x1 ? -1 : 1), row.y], { style: row.style, label: row.label, note: row.note, labelX });
    if (row.extra) f.text(labelX, row.y + 30, row.extra, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle', knock: true });
  });
});
