'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

module.exports = figure('fig-finding-an-agent', {
  height: 462,
  title: "从主机到经过检查的调用",
  desc: "三个阶段从上到下逐步绘制。首先 planner 找 code-reviewer 卡片：直接配置给出主机，GET /.well-known/agent-card.json 返回卡片，注册中心是套件未使用的第三条途径。其次选择接口 0，即 /a2a/jsonrpc 上的 JSON-RPC 1.0，跳过 HTTP+JSON 接口 1。最后读取能力标志：streaming 为 true，pushNotifications 缺失。忽略缺失标志的 CreateTaskPushNotificationConfig 调用以 -32003 失败。",
}, f => {
  f.kicker(20, 18, "1 · 找到卡片");
  f.kicker(20, 176, "2 · 选支持的首个接口");
  f.kicker(20, 284, "3 · 可选调用前检查标志");
  const config = f.box({ x: 20, y: 35, w: 180, h: 46, hue: 'violet', title: "直接配置", titleSize: 12, sub: "端口 41241、41242、41243" });

  f.beat(1);
  const wellKnown = f.box({ x: 245, y: 28, w: 150, h: 60, hue: 'blue', title: "well-known URI", titleSize: 12, sub: ['GET /.well-known/', 'agent-card.json'] });
  f.arrow([config.x + config.w, 58], [wellKnown.x - 1, 58], { style: 'call', label: 'GET' });

  f.beat(2);
  const card = f.box({ x: 460, y: 35, w: 160, h: 46, hue: 'blue', title: 'code-reviewer', titleSize: 12, sub: "agent 卡片" });
  f.arrow([wellKnown.x + wellKnown.w, 58], [card.x - 1, 58], { style: 'reply', label: '200 OK' });

  f.beat(3);
  const registry = f.box({ x: 20, y: 100, w: 180, h: 46, hue: 'grey', dash: 'dashed', title: "注册中心或目录", titleSize: 12, sub: "无标准查询 API" });
  f.path(`M${registry.x + registry.w} 123 H430 V72 H${card.x - 1}`, { style: 'reply', hue: 'grey', packet: false });
  f.text(315, 127, "或查询注册中心", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle', knock: true });

  f.beat(4);
  f.rule(540, card.y + card.h, 540, 188, { dash: 'dashed' });
  f.rect(20, 188, 600, 30, { hue: 'violet' });
  f.text(32, 207, '[0] JSONRPC, "1.0", http://localhost:41242/a2a/jsonrpc', { size: 11 });
  f.text(610, 207, '已选', { size: 11, serif: true, hue: 'violet', anchor: 'end', weight: 700 });
  f.rect(20, 224, 600, 30, { fill: color('paper'), stroke: color('ink-mute'), dash: 'dashed' });
  f.text(32, 243, '[1] HTTP+JSON, "1.0", http://localhost:41242/a2a/rest', { size: 11, hue: 'ink-mute' });
  f.text(610, 243, "跳过：不是 JSON-RPC", { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });

  f.beat(5);
  f.box({ x: 20, y: 294, w: 290, h: 46, hue: 'blue', title: 'streaming: true', titleSize: 12, sub: 'SendStreamingMessage, SubscribeToTask' });
  f.box({ x: 330, y: 294, w: 290, h: 46, hue: 'blue', dash: 'dashed', title: "pushNotifications：缺失", titleSize: 12, sub: "四种推送配置操作都失败" });

  f.beat(6);
  f.text(20, 368, "11-errors.http 第 6 次交换仍然调用：", { size: 11, serif: true, hue: 'ink-soft' });
  const planner = f.box({ x: 20, y: 380, w: 110, h: 72, hue: 'violet', title: 'planner', titleSize: 12, sub: '客户端' });
  const reviewer = f.box({ x: 490, y: 380, w: 130, h: 72, hue: 'blue', title: 'code-reviewer', titleSize: 12, sub: '/a2a/jsonrpc' });
  f.arrow([planner.x + planner.w, 400], [reviewer.x - 1, 400], { style: 'call', label: 'CreateTaskPushNotificationConfig' });

  f.beat(7);
  f.arrow([reviewer.x, 436], [planner.x + planner.w + 1, 436], { style: 'fail', label: '-32003 PUSH_NOTIFICATION_NOT_SUPPORTED' });
});
