'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const gateway = load(path.join(__dirname, '../../capture/lab/summary/network-x86.json')).model_gateway;
const cost = (side, name) => gateway[side].connection_cost_ms.find(item => item.case === name).median_total_ms;
const fresh = ['agentgateway', 'envoy'].map(side => Math.round(cost(side, 'c1-tls-gw-new-connection-each')));
const reused = ['agentgateway', 'envoy'].map(side => Math.round(cost(side, 'c2-tls-gw-one-connection')));

const xs = [20, 144, 268, 392, 516];
const rows = [
  {
    y: 34,
    decides: '决定事项：谁能入站、actor 可访问哪些主机、注入一个请求头',
    kicker: 'A · 由你选择的 Substrate 数据平面',
    note: 'ate-setup --atenet-dataplane=agentgateway。空闲内存：2 容器共 38 MB；Envoy 为 5 容器共 91 MB。',
    boxes: [
      { hue: 'olive', title: '客户端', sub: 'mTLS 客户端' },
      { hue: 'indigo', title: 'atenet-router', sub: 'agentgateway' },
      { hue: 'green', title: 'actor', sub: 'my-counter-1' },
      { hue: 'indigo', title: 'atenet-egress', sub: 'agentgateway' },
      { hue: 'olive', title: '目标主机', sub: '策略允许范围' },
    ],
  },
  {
    y: 178,
    decides: '决定事项：同样这三项',
    kicker: 'B · kagent 发行版内置的数据平面',
    note: 'kagent chart 安装 agentgateway v1.7.0，无 Envoy 选项。共 98 个轮次经其转发。',
    boxes: [
      { hue: 'plum', title: 'kagent', sub: '控制器' },
      { hue: 'indigo', title: 'atenet-router', sub: 'agentgateway' },
      { hue: 'green', title: 'actor', sub: 'session-<uuid>' },
      { hue: 'indigo', title: 'atenet-egress', sub: 'agentgateway' },
      { hue: 'plum', title: '模型主机', sub: '策略允许范围' },
    ],
  },
  {
    y: 322,
    decides: '决定事项：选用哪个模型，以及发往模型提供方的密钥',
    kicker: 'C · actor 经由出站规则调用的独立网关',
    note: `基于 TLS 连接两个模拟模型实测。新建连接：${fresh[0]} ms；复用连接：${reused[0]} ms。`,
    boxes: [
      { hue: 'green', title: 'actor', sub: 'f-main' },
      { hue: 'indigo', title: 'atenet-egress', sub: '单条 https 规则' },
      { hue: 'grey', title: 'agentgateway', sub: '模型网关', dash: 'dashed', strokeWidth: 1.8 },
      { hue: 'plum', title: '模型', sub: 'mock-a, mock-b' },
    ],
  },
];

module.exports = figure('fig-7-2', {
  height: 432,
  title: 'agentgateway 与 Substrate 配合的三种位置',
  desc: `三行架构。A 行：以 agentgateway 数据平面安装 Substrate 时，agentgateway 充当 atenet-router 与 atenet-egress 内的代理。B 行：kagent 发行版安装相同的两个代理，且不提供 Envoy 选项。C 行：独立的 agentgateway 充当模型网关，actor 通过单条出站规则访问它并由它选择模型。在连接两个模拟后端的实测中，新建拦截 TLS 连接的请求在 agentgateway 数据平面上耗时 ${fresh[0]} ms（Envoy 为 ${fresh[1]} ms），复用连接分别耗时 ${reused[0]} ms 与 ${reused[1]} ms。`,
}, f => {
  for (const row of rows) {
    f.kicker(20, row.y - 10, row.kicker);
    row.boxes.forEach((box, index) => {
      f.box({ x: xs[index], y: row.y, w: 104, h: 46, pad: 6, titleSize: 11.5, ...box });
      if (index < row.boxes.length - 1) f.arrow([xs[index] + 104, row.y + 23], [xs[index + 1] - 1, row.y + 23], { style: 'call' });
    });
    f.text(20, row.y + 68, row.decides, { size: 11.5, weight: 700, hue: row.y > 300 ? 'plum' : 'indigo' });
    f.text(20, row.y + 86, row.note, { size: 11, serif: true, hue: 'ink-soft' });
  }
  f.rule(20, 142, 620, 142, { dash: 'dashed', opacity: 0.5 });
  f.rule(20, 286, 620, 286, { dash: 'dashed', opacity: 0.5 });
});
