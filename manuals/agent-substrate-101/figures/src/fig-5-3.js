'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-3', {
  height: 348,
  title: 'actor JWT 如何送达被 actor 调用的服务',
  desc: '四条生命线时序图：actor session-01a1cf43、出站网关 atenet-egress、ate-api-server 以及端口 8083 上的服务 kagent-controller。actor 发送普通 HTTP 请求；网关匹配出站规则后，以受众 kagent-runtime 和有效期 300 秒调用 MintActorJwt，用所得令牌替换 authorization 头并转发请求；服务返回 200。actor 全程不持有该令牌。',
}, f => {
  const lanes = [
    { x: 104, hue: 'green', title: 'actor', sub: 'session-01a1cf43' },
    { x: 256, hue: 'indigo', title: 'atenet-egress', sub: '出站网关' },
    { x: 408, hue: 'blue', title: 'ate-api-server', sub: '使用 ES256 签名' },
    { x: 560, hue: 'plum', title: 'kagent-controller', sub: '端口 8083' },
  ];
  lanes.forEach(lane => {
    f.box({ x: lane.x, y: 16, w: 140, h: 44, hue: lane.hue, title: lane.title, sub: lane.sub, anchor: 'middle', titleSize: 12, pad: 6 });
    f.lifeline(lane.x, 60, 340);
  });
  const [actor, gw, api, svc] = lanes.map(lane => lane.x);
  f.step(20, 92, 1);
  f.arrow([actor, 92], [gw - 1, 92], { style: 'call', label: 'HTTP 请求', note: '不带凭据' });
  f.step(20, 148, 2);
  f.box({ x: gw, y: 126, w: 190, h: 44, hue: 'indigo', anchor: 'middle', pad: 6, sub: ['匹配规则：http，端口 8083', 'effect: actorJwt'] });
  f.step(20, 204, 3);
  f.arrow([gw, 204], [api - 1, 204], { style: 'call', label: 'MintActorJwt', note: 'kagent-runtime, 300 s' });
  f.arrow([api, 248], [gw + 1, 248], { style: 'reply', label: 'token' });
  f.step(20, 290, 4);
  f.arrow([gw, 290], [svc - 1, 290], { style: 'call', label: 'authorization: Bearer token', labelX: 408 });
  f.arrow([svc, 326], [actor + 1, 326], { style: 'reply', label: '200', labelX: 180 });
});
