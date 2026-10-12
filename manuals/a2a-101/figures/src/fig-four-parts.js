'use strict';

const { figure, color, measure } = require('../../../_shared/figkit.js');

const rows = [
  {
    member: 'raw',
    value: 'LS0tIGEvcGF5bWVudHMvcmVmdW5kcy5weQor',
    note: "236 个 base64 字符的前 36 个",
    media: 'filename "refunds.diff"   mediaType "text/x-diff"',
    from: "planner 发送，五行 diff · 06-input-required.http",
    hue: 'violet',
  },
  {
    member: 'text',
    value: '"Which base branch should I compare this diff against?"',
    media: "mediaType 缺失：套件视为 text/plain",
    from: "code-reviewer 的 status.message · 06-input-required.http",
    hue: 'blue',
  },
  {
    member: 'data',
    value: '"base": "main"',
    note: "另有 findings，两个对象含 file、line、severity、finding",
    media: 'mediaType "application/json"',
    from: "code-reviewer 的 review.json 产物 part 2 · 06-input-required.http",
    hue: 'blue',
  },
  {
    member: 'url',
    value: '"https://example.com/screenshot.png"',
    media: 'mediaType "image/png"',
    from: "planner 发送 · 11-errors.http",
    hue: 'violet',
    rejected: true,
  },
];

module.exports = figure('fig-four-parts', {
  height: 384,
  title: "四种 part",
  desc: "顶部：part 恰好包含 text、raw、url、data 四个内容成员之一，每种还可带 mediaType、filename、metadata。下方为采集中的四个 part，按发送顺序排列：planner 用 raw base64 发送媒体类型 text/x-diff 的 refunds.diff 文件，code-reviewer 以 text 发送问题，以 application/json 的 data part 发送审查发现，以及 code-reviewer 用 -32005 CONTENT_TYPE_NOT_SUPPORTED 拒绝的 image/png url part。",
}, f => {
  f.kicker(20, 18, "一个 part 恰好包含一项");
  f.kicker(344, 18, "每种都有的可选字段");
  ['text', 'raw', 'url', 'data'].forEach((member, index) => f.box({ x: 20 + index * 76, y: 26, w: 68, h: 30, hue: 'green', title: member }));
  [['mediaType', 344, 92], ['filename', 444, 84], ['metadata', 536, 84]].forEach(([field, x, w]) => f.box({ x, y: 26, w, h: 30, hue: 'green', title: field, weight: 400 }));
  f.kicker(20, 76, "采集中的四个 part，按发送顺序");
  let beat = 0;
  rows.forEach((row, index) => {
    const y = 84 + index * 74;
    f.beat(++beat);
    f.box({ x: 20, y, w: 68, h: 66, hue: 'green', title: row.member, titleSize: 13 });
    f.rect(88, y, 532, 66, { fill: color('paper'), stroke: color('panel-edge') });
    const first = f.text(100, y + 21, row.value, { size: 11.5 });
    if (row.note) f.text(first.right + 10, y + 21, row.note, { size: 11, serif: true, hue: 'ink-soft' });
    f.text(100, y + 39, row.media, { size: 11, hue: 'green' });
    f.text(100, y + 57, row.from, { size: 11, serif: true, hue: row.hue });
    if (row.rejected) {
      f.beat(++beat);
      f.box({ x: 396, y: y + 9, w: 214, h: 48, hue: 'rose', title: 'CONTENT_TYPE_NOT_SUPPORTED', titleSize: 12, sub: "以错误 -32005 拒绝" });
    }
  });
  for (const row of rows) if (measure(row.from, 11, true) > 510) throw new Error("fig-four-parts：来源行过宽");
});
