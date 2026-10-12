'use strict';

const { figure } = require('../../../_shared/figkit.js');

const LEFT = { x: 20, w: 300 };
const RIGHT = { x: 350, w: 270 };
const H = 46;
const ROWS = [30, 100, 170, 240, 310, 380, 450, 520, 590];
const MID = LEFT.x + LEFT.w / 2;

function stage(f, row, options) {
  return f.box({ x: LEFT.x, y: ROWS[row], w: LEFT.w, h: H, titleSize: 12, ...options });
}

function side(f, row, options) {
  return f.box({ x: RIGHT.x, y: ROWS[row], w: RIGHT.w, h: H, titleSize: 12, ...options });
}

function down(f, from, to, label) {
  f.arrow([MID, from.y + from.h], [MID, to - 1], { style: 'call', label });
}

function fail(f, row) {
  f.arrow([LEFT.x + LEFT.w, ROWS[row] + H / 2], [RIGHT.x - 1, ROWS[row] + H / 2], { style: 'fail' });
}

module.exports = figure('fig-server-parts', {
  height: 656,
  title: "按请求经过顺序排列的服务器组件",
  desc: "SendStreamingMessage 请求从 Handler.jsonrpc 或 Handler.rest 进入套件服务器。先经过 authenticate，错误 token 返回 HTTP 401；check_version 返回 VersionNotSupportedError -32009；卡片能力检查返回 UnsupportedOperationError -32004。随后 Agent.send 验证消息，在 Agent.tasks 保存 TASK_STATE_SUBMITTED 任务。Agent.work 在线程运行 agent 逻辑 behavior。Agent.apply 将每个事件写入任务记录，Agent.broadcast 将其复制到各订阅者队列，由 Handler.pump 写为 SSE data 帧，也复制到 Agent.deliver，由它向各 webhook URL POST。",
}, f => {
  f.kicker(LEFT.x, 18, "请求，从上到下");
  f.kicker(RIGHT.x, 18, "检查失败返回什么");

  f.beat(1);
  const request = stage(f, 0, { hue: 'violet', title: "SendStreamingMessage 请求", sub: 'POST /a2a/jsonrpc, A2A-Version: 1.0' });
  const handler = stage(f, 1, { hue: 'blue', title: 'Handler.jsonrpc, Handler.rest', sub: "每绑定一个方法，相同检查" });
  down(f, request, ROWS[1]);

  f.beat(2);
  const auth = stage(f, 2, { hue: 'blue', title: 'authenticate', sub: "bearer token，仅 deployer" });
  down(f, handler, ROWS[2]);
  side(f, 2, { hue: 'rose', dash: 'dashed', title: 'HTTP 401', sub: 'WWW-Authenticate: Bearer' });
  fail(f, 2);

  f.beat(3);
  const version = stage(f, 3, { hue: 'blue', title: 'check_version', sub: "A2A-Version 必须为 1.0" });
  down(f, auth, ROWS[3]);
  side(f, 3, { hue: 'rose', dash: 'dashed', title: 'VersionNotSupportedError', sub: '-32009, FAILED_PRECONDITION' });
  fail(f, 3);

  f.beat(4);
  const capability = stage(f, 4, { hue: 'blue', title: 'card["capabilities"]', sub: 'streaming, pushNotifications' });
  down(f, version, ROWS[4]);
  side(f, 4, { hue: 'rose', dash: 'dashed', title: 'UnsupportedOperationError', sub: "-32004，推送为 -32003" });
  fail(f, 4);

  f.beat(5);
  const send = stage(f, 5, { hue: 'blue', title: 'Agent.send', sub: "validate_message，随后一个任务" });
  down(f, capability, ROWS[5]);
  const store = side(f, 5, { hue: 'teal', title: 'Agent.tasks', sub: "任务记录，TASK_STATE_SUBMITTED" });
  f.arrow([send.x + send.w, send.cy], [store.x - 1, store.cy], { style: 'write' });

  f.beat(6);
  const work = stage(f, 6, { hue: 'plum', title: 'Agent.work, behavior', sub: "agent 逻辑，独立线程" });
  down(f, send, ROWS[6], "每请求一个线程");

  f.beat(7);
  const apply = stage(f, 7, { hue: 'indigo', title: 'Agent.apply, Agent.broadcast', sub: "先记录，再发给各订阅者" });
  down(f, work, ROWS[7], "生成事件");
  f.path(`M${apply.x + apply.w} ${apply.cy} H335 V${store.cy + 10} H${store.x - 1}`, { style: 'write' });
  f.text(346, apply.cy - 6, "写入任务", { size: 11, serif: true, hue: 'ink-soft', knock: true });

  f.beat(8);
  const pump = stage(f, 8, { hue: 'indigo', title: 'Handler.pump', sub: "各 SSE 流的 data: 帧" });
  const deliver = side(f, 8, { hue: 'indigo', title: 'Agent.deliver', sub: "POST 到各 webhook URL" });
  f.arrow([MID, apply.y + apply.h], [MID, pump.y - 1], { style: 'event', label: "每个事件" });
  f.path(`M${apply.x + 250} ${apply.y + apply.h} V578 H${deliver.cx} V${deliver.y - 1}`, { style: 'event' });
  f.text(deliver.cx - 100, 574, "每个事件", { size: 11.5, hue: 'indigo', knock: true });
});
