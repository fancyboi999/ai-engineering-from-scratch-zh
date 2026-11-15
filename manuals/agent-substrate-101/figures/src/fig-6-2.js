'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const results = fs.readFileSync(path.join(__dirname, '../../capture/lab/F-egress/envoy/20-results.txt'), 'utf8');
const actorIp = /inet (169\.254\.[0-9.]+\/30)/.exec(results)[1];
const relayIp = /nameserver ([0-9.]+)/.exec(results)[1];
const gatewayIp = /RemoteAddr: ([0-9.]+):/.exec(results)[1];

module.exports = figure('fig-6-2', {
  height: 296,
  title: 'actor 发起的出站连接在哪里被判定放行或拒绝',
  desc: `位于 ${actorIp} 的 actor f-main 将 DNS 查询发往 ${relayIp} 的 DNS 中继，并将所有 TCP 连接发往 atunnel；两者均运行在 worker pod 内。DNS 中继把策略列出的域名转发给集群 DNS，其余域名返回 NXDOMAIN。atunnel 向 atenet-egress 建立双向 TLS CONNECT，后者检查请求后连接上游主机 whoami，上游看到的来源地址为 ${gatewayIp}。超出策略的请求会收到 403 或连接重置。两处检查均从 ate-api-server 读取 f-main 的 EgressPolicy，其中 DNS 中继缓存 5 秒。`,
}, f => {
  const api = f.box({ x: 240, y: 20, w: 200, h: 46, hue: 'blue', pad: 6, title: 'ate-api-server', sub: 'f-main 的 EgressPolicy default' });

  f.rect(160, 92, 174, 180, { fill: 'none', stroke: color('violet-ink'), dash: 'dashed' });
  f.kicker(170, 110, 'Worker pod', { hue: 'violet' });
  const actor = f.box({ x: 16, y: 163, w: 124, h: 52, hue: 'green', title: 'actor f-main', sub: actorIp });
  const relay = f.box({ x: 172, y: 120, w: 150, h: 46, hue: 'violet', title: 'DNS 中继', sub: `${relayIp}:53` });
  const tunnel = f.box({ x: 172, y: 212, w: 150, h: 46, hue: 'violet', title: 'atunnel', sub: 'actor 证书' });
  const dns = f.box({ x: 450, y: 120, w: 120, h: 46, hue: 'grey', title: '集群 DNS', sub: 'CoreDNS' });
  const egress = f.box({ x: 400, y: 212, w: 120, h: 46, hue: 'indigo', pad: 6, title: 'atenet-egress', sub: '检查出站请求' });
  const upstream = f.box({ x: 548, y: 212, w: 80, h: 46, hue: 'olive', pad: 6, title: 'whoami', sub: '上游主机' });

  f.path(`M${actor.cx} ${actor.y} V${relay.cy} H${relay.x - 1}`, { style: 'call' });
  f.text(actor.cx + 6, relay.cy - 7, 'DNS 查询', { size: 11, serif: true, hue: 'ink-soft' });
  f.path(`M${actor.cx} ${actor.y + actor.h} V${tunnel.cy} H${tunnel.x - 1}`, { style: 'call' });
  f.text(16, tunnel.cy + 18, '所有 TCP 连接', { size: 11, serif: true, hue: 'ink-soft' });

  f.arrow(relay.right(), [dns.x - 1, relay.cy], { style: 'call', label: '已列域名', labelX: 386 });
  f.text(relay.x, relay.y + relay.h + 17, '其他域名：NXDOMAIN', { size: 11, hue: 'rose' });
  f.arrow(tunnel.right(), [egress.x - 1, tunnel.cy], { style: 'event', label: 'CONNECT', note: '双向 TLS', labelX: 367 });
  f.arrow(egress.right(), [upstream.x - 1, egress.cy], { style: 'call' });
  f.text(upstream.cx, upstream.y - 9, `看到 ${gatewayIp}`, { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(egress.x, egress.y + egress.h + 18, '超出策略：403 或连接重置', { size: 11, hue: 'rose' });

  f.line(280, api.y + api.h, 280, relay.y - 1, { style: 'reply' });
  f.text(288, 84, '策略，缓存 5 s', { size: 11, serif: true, hue: 'ink-soft' });
  f.line(432, api.y + api.h, 432, egress.y - 1, { style: 'reply' });
  f.text(440, 192, '策略', { size: 11, serif: true, hue: 'ink-soft' });
});
