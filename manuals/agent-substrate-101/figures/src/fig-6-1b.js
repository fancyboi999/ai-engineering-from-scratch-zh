'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const lab = path.join(__dirname, '../../capture/lab/G-dataplane');
function probes(dataplane) {
  const text = fs.readFileSync(path.join(lab, dataplane, 'ingress-auth/51-rightid-results.txt'), 'utf8');
  const out = {};
  for (const match of text.matchAll(/### \d+-rightid-([a-z0-9-]+)\n[\s\S]*?code=(\d+) t=([0-9.]+)/g)) out[match[1]] = { code: match[2], s: Number(match[3]).toFixed(3) };
  return out;
}
const envoy = probes('envoy');
const agw = probes('agentgateway');
const served = p => [`${p['https-443'].s} s 返回 200`, `经 8444 为 ${p['connect-8444'].s} s`, 'green'];
const missing = (p, key, body) => [`${p[key].s} s 返回 ${p[key].code}`, body, 'rose'];

const groups = [
  {
    name: '在 TLS 层被拒绝：无 HTTP 状态码',
    rows: [
      { caller: ['无客户端证书', '未携带证书的 pod'], envoy: ['连接中断', 'curl: Broken pipe', 'rose'], agw: ['TLS 告警', 'certificate required', 'rose'] },
      { caller: ['身份不在允许列表中', 'ns/probe/sa/default'], envoy: ['TLS 告警', 'certificate unknown', 'rose'], agw: ['连接重置', 'reset by peer，无告警', 'rose'] },
    ],
  },
  {
    name: '允许的身份 atenet-client：返回 HTTP 响应',
    rows: [
      { caller: ['actor my-counter-1', 'ACTOR_STATE_RUNNING'], envoy: served(envoy), agw: served(agw) },
      { caller: ['actor does-not-exist', 'atespace 中无此 actor'], envoy: missing(envoy, 'unknown-actor', 'body: actor not found'), agw: missing(agw, 'unknown-actor', 'body: ingress failed') },
      { caller: ['缺少路由头', '未传 ate-target-actor'], envoy: missing(envoy, 'no-header', 'body: invalid actor reference'), agw: missing(agw, 'no-header', 'body: ingress failed') },
    ],
  },
];

module.exports = figure('fig-6-1b', {
  height: 358,
  title: '两种数据平面下调用 atenet-router 看到的响应',
  desc: `分两组的五种请求情形，对比 Envoy 数据平面与 agentgateway 数据平面的结果。第一组在 TLS 层拒绝调用方，无 HTTP 状态码：无客户端证书时 Envoy 断开连接，agentgateway 发送告警 certificate required；身份不在允许列表中时 Envoy 发送告警 certificate unknown，agentgateway 重置连接。第二组使用允许的身份 atenet-client，均返回 HTTP 响应：访问 my-counter-1 时 Envoy 用 ${envoy['https-443'].s} s 返回 200，agentgateway 用 ${agw['https-443'].s} s 返回 200；访问不存在的 actor 或未传路由头均返回 404。`,
}, f => {
  f.kicker(16, 18, '请求情况');
  f.kicker(232, 18, 'Envoy 数据平面');
  f.kicker(438, 18, 'agentgateway 数据平面');
  let y = 30;
  groups.forEach((group, g) => {
    f.rule(16, y + 4, 624, y + 4, { opacity: 0.5 });
    f.text(16, y + 20, group.name, { size: 11.5, weight: 700, hue: g === 0 ? 'rose' : undefined });
    y += 30;
    for (const row of group.rows) {
      const tls = g === 0;
      f.box({ x: 16, y, w: 196, h: 44, hue: 'olive', title: row.caller[0], sub: row.caller[1], titleSize: 11.5, pad: 8 });
      [[row.envoy, 232], [row.agw, 438]].forEach(([cell, x]) => {
        f.box({ x, y, w: 186, h: 44, hue: cell[2], title: cell[0], sub: cell[1], titleSize: 11.5, pad: 6, dash: tls ? 'dashed' : undefined });
      });
      y += 52;
    }
    y += 4;
  });
});
