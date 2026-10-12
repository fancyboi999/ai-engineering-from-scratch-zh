'use strict';

const { figure, measure } = require('../../../_shared/figkit.js');

const LINE = 15;
const SIZE = 11;

function panel(f, x, y, w, h, hue, lines) {
  f.rect(x, y, w, h, { hue });
  lines.forEach((line, index) => {
    const baseline = y + 18 + index * LINE;
    let cursor = x + 12 + (line.indent || 0) * SIZE * 0.6;
    for (const piece of line.pieces) {
      f.text(cursor, baseline, piece.text, { size: SIZE, weight: piece.bold ? 700 : undefined, italic: piece.italic, serif: piece.serif, hue: piece.hue });
      cursor += measure(piece.text, SIZE, piece.serif);
    }
  });
  return { x, y, w, h, cx: x + w / 2, bottom: y + h };
}

const heightOf = count => count * LINE + 14;
const code = (text, indent = 0) => ({ pieces: [{ text }], indent });
const bold = (text, indent = 0) => ({ pieces: [{ text, bold: true }], indent });
const typed = (key, type, close, indent = 0) => ({ pieces: [{ text: key }, { text: type, italic: true, hue: 'ink-soft' }, { text: close }], indent });
const note = text => ({ pieces: [{ text, serif: true, hue: 'ink-soft' }] });

const requestLines = [
  [code('POST /a2a/jsonrpc'), code('A2A-Version: 1.0'), code('"jsonrpc": "2.0", "id": 1,'), code('"method": "GetTask",'), code('"params": {"id": "00000000"}')],
  [code('GET /a2a/rest/tasks/00000000'), code('A2A-Version: 1.0'), note("无请求体：ID 在路径中")],
];

const replyLines = [
  [bold('HTTP/1.1 200 OK'), code('Content-Type: application/json'), code('"jsonrpc": "2.0", "id": 1,'), code('"error": {'), bold('"code": -32001,', 2), code('"message": "Task not found",', 2), typed('"data": [', 'ErrorInfo', ']', 2)],
  [bold('HTTP/1.1 404 Not Found'), code('Content-Type: application/a2a+json'), code('"error": {'), bold('"code": 404,', 2), code('"status": "NOT_FOUND",', 2), code('"message": "Task not found",', 2), typed('"details": [', 'ErrorInfo', ']', 2)],
];

const shared = [
  note("google.rpc.ErrorInfo，两种绑定的同一对象"),
  code('"@type": "type.googleapis.com/google.rpc.ErrorInfo",'),
  bold('"reason": "TASK_NOT_FOUND",'),
  code('"domain": "a2a-protocol.org",'),
  code('"metadata": {"taskId": "00000000"}'),
];

module.exports = figure('fig-task-not-found', {
  height: 396,
  title: "两种 JSON 绑定中的同一错误",
  desc: "两列。左侧，向 /a2a/jsonrpc POST 任务 00000000 的 JSON-RPC GetTask，得到 HTTP 200 OK，error 含 code -32001、message Task not found、data 数组。右侧，相同查找 GET /a2a/rest/tasks/00000000 得到 HTTP 404 Not Found 和 google.rpc.Status 体，含 code 404、status NOT_FOUND、相同 message、details 数组。data 与 details 连线指向共享框 google.rpc.ErrorInfo，reason 为 TASK_NOT_FOUND，domain 为 a2a-protocol.org，metadata 中为任务 ID。",
}, f => {
  f.kicker(20, 18, 'A · JSON-RPC');
  f.kicker(334, 18, 'B · HTTP+JSON');
  const columns = [20, 334];
  const width = 286;
  const requestTop = 30;
  const requestHeight = heightOf(5);
  const replyTop = requestTop + requestHeight + 22;
  const replyHeight = heightOf(7);
  const sharedTop = replyTop + replyHeight + 36;
  const labels = ['data[0]', 'details[0]'];
  f.rule(320, requestTop, 320, replyTop + replyHeight, { dash: 'dashed' });
  const replies = [];
  columns.forEach((x, side) => {
    f.beat(side * 2 + 1);
    const request = panel(f, x, requestTop, width, requestHeight, 'violet', requestLines[side]);
    f.beat(side * 2 + 2);
    f.arrow([request.cx, request.bottom], [request.cx, replyTop - 1], { style: 'reply' });
    replies.push(panel(f, x, replyTop, width, replyHeight, 'rose', replyLines[side]));
  });
  f.beat(5);
  replies.forEach((reply, side) => {
    f.rule(reply.cx, reply.bottom, reply.cx, sharedTop, { hue: 'ink-soft', width: 1.2 });
    f.text(reply.cx + 8, (reply.bottom + sharedTop) / 2 + 4, labels[side], { size: 11.5 });
  });
  panel(f, 20, sharedTop, 600, heightOf(shared.length), 'rose', shared);
});
