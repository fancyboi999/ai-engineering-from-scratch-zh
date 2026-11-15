'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const out = fs.readFileSync(path.join(__dirname, '../../capture/lab/K-kagent/session1/turn5-egress.out'), 'utf8');
const address = /Name:\s+mock-llm\.kagent\.svc\.cluster\.local\s+Address:\s+([0-9.]+)/.exec(out)[1];

const rows = [
  { name: ['外部主机', 'example.com'], relay: ['NXDOMAIN', '无规则列出该名', 'rose'], gateway: null },
  { name: ['Kubernetes API', 'kubernetes.default.svc.cluster.local'], relay: ['NXDOMAIN', '无规则列出该名', 'rose'], gateway: null },
  { name: ['完整 Service 名称', 'mock-llm.kagent.svc.cluster.local'], relay: [address, '规则已列出该名', 'violet'], gateway: ['200', 'Host 在策略允许内', 'indigo'] },
  { name: ['简短 Service 名称', 'mock-llm.kagent'], relay: [address, '由搜索域补全后缀', 'violet'], gateway: ['403 Forbidden', 'Host mock-llm.kagent:8080', 'rose'] },
];

module.exports = figure('fig-6-3', {
  height: 280,
  title: '单个 kagent actor 访问四个名称的结果',
  desc: `四行依次展示 actor 查询的名称、DNS 中继的应答以及 atenet-egress 的应答。example.com 与 Kubernetes API 名称在中继处收到 NXDOMAIN，根本不会到达出站网关。完整 Service 名称 mock-llm.kagent.svc.cluster.local 解析为 ${address}，网关返回 200。简短名称 mock-llm.kagent 因搜索列表自动补全后缀也解析为 ${address}，但随后网关因请求头 Host 为 mock-llm.kagent:8080 而返回 403。`,
}, f => {
  f.kicker(12, 18, 'actor 查询的名称');
  f.kicker(272, 18, 'DNS 中继');
  f.kicker(452, 18, 'atenet-egress');
  rows.forEach((row, index) => {
    const y = 28 + index * 62;
    f.box({ x: 12, y, w: 240, h: 48, hue: 'green', title: row.name[0], sub: row.name[1], titleSize: 11.5 });
    f.box({ x: 272, y, w: 160, h: 48, hue: row.relay[2], title: row.relay[0], sub: row.relay[1], titleSize: 11.5 });
    f.arrow([252, y + 24], [271, y + 24], { style: row.relay[2] === 'rose' ? 'fail' : 'call' });
    if (row.gateway) {
      f.box({ x: 452, y, w: 176, h: 48, hue: row.gateway[2], title: row.gateway[0], sub: row.gateway[1], titleSize: 11.5 });
      f.arrow([432, y + 24], [451, y + 24], { style: row.gateway[2] === 'rose' ? 'fail' : 'call' });
    } else {
      f.box({ x: 452, y, w: 176, h: 48, hue: 'grey', dash: 'dashed', title: '未到达', sub: '未建立任何连接', titleSize: 11.5, weight: 400 });
    }
  });
});
