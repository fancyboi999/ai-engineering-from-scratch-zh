'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const results = fs.readFileSync(path.join(__dirname, '../../capture/lab/F-egress/envoy/20-results.txt'), 'utf8');
const issuers = [...results.matchAll(/^issuer=(.*)$/gm)].map(match => match[1]);
const minted = issuers[0];
const real = /CN=(.*)$/.exec(issuers[1])[1];

module.exports = figure('fig-6-4', {
  height: 262,
  title: '不同规则类型下谁持有 TLS 会话',
  desc: `左右两列对比。左列为针对 example.com 的 https 规则：actor f-main 与出示 ${minted} 所签叶证书的 atenet-egress 持有 TLS 会话 1，atenet-egress 再与 example.com 持有 TLS 会话 2。右列为针对 example.org 的 tlsPassthrough 规则：actor 直接与 example.org 持有一条端到端 TLS 会话，atenet-egress 只读取服务器名并透传字节，actor 看到由 ${real} 签发的原始证书。`,
}, f => {
  f.kicker(20, 18, 'https 规则：example.com');
  f.kicker(336, 18, 'tlsPassthrough 规则：example.org');
  f.rule(320, 8, 320, 254, { dash: 'dashed' });
  const left = [
    { hue: 'green', title: 'actor f-main', sub: '信任投射进来的信任包' },
    { hue: 'indigo', title: 'atenet-egress', sub: `叶证书来自 ${minted}` },
    { hue: 'olive', title: 'example.com', sub: '公网证书，由出站网关校验' },
  ];
  const right = [
    { hue: 'green', title: 'actor f-main', sub: '使用自身默认根证书库' },
    { hue: 'indigo', title: 'atenet-egress', sub: '读取服务器名并透传字节', dash: 'dashed' },
    { hue: 'olive', title: 'example.org', sub: `签发者 ${real}` },
  ];
  const labels = [['TLS 会话 1', 'TLS 会话 2'], ['同一条 TLS 会话', '同一条会话延续']];
  [[left, 20], [right, 336]].forEach(([column, x], side) => {
    column.forEach((item, index) => {
      const y = 30 + index * 84;
      f.box({ x, y, w: 284, h: 48, ...item });
      if (index < column.length - 1) f.arrow([x + 100, y + 48], [x + 100, y + 83], { style: side === 0 ? 'call' : 'event', label: labels[side][index] });
    });
  });
});
