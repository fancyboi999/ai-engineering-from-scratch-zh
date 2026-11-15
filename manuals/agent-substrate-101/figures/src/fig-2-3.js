'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../../capture/lab/summary/dependency-loss-x86.json'), 'utf8'));
const outage = data.outages['kube-apiserver'];
const proxy = outage.summary.proxy;
const running = outage.summary.running;

module.exports = figure('fig-2-3', {
  height: 330,
  title: 'kube-apiserver 中断期间访问同一 actor 的两条路径',
  desc: `左右两列。左列中 curl 发往 kubectl ate proxy，经 kube-apiserver 隧道连接 atenet-router 端口 8444 再转至 actor；kube-apiserver 中断 ${outage.outage_seconds} s 期间，该路径 ${proxy.requests_during_outage} 个请求中仅完成 ${proxy.ok_during_outage} 个。右列中持有客户端证书的 pod 直连 atenet-router 端口 443，同一 ${outage.outage_seconds} s 内 ${running.requests_during_outage} 个请求完成 ${running.ok_during_outage} 个。`,
}, f => {
  f.kicker(20, 18, 'A · kubectl ate proxy actor');
  f.kicker(336, 18, 'B · 持有客户端证书的 pod');
  f.rule(320, 8, 320, 322, { dash: 'dashed' });
  const left = [
    { hue: 'olive', title: 'curl', sub: 'POST http://localhost:8000/' },
    { hue: 'olive', title: 'kubectl ate proxy actor', sub: '在本机运行' },
    { hue: 'rose', title: 'kube-apiserver', sub: `中断 ${outage.outage_seconds} s`, dash: 'dashed' },
    { hue: 'indigo', title: 'atenet-router:8444', sub: 'mTLS CONNECT' },
  ];
  const right = [
    { hue: 'olive', title: 'e-prober pod', sub: 'ate-target-actor: lab-e/e-run' },
    { hue: 'indigo', title: 'atenet-router:443', sub: '校验 SPIFFE ID' },
    { hue: 'violet', title: 'worker pod', sub: 'CONNECT 到端口 8443' },
    { hue: 'green', title: 'actor e-run', sub: 'ACTOR_STATE_RUNNING' },
  ];
  left.forEach((item, index) => {
    const y = 30 + index * 66;
    f.box({ x: 20, y, w: 284, h: 42, ...item });
    if (index < left.length - 1) {
      f.beat(index + 1);
      f.arrow([162, y + 42], [162, y + 65], { style: index >= 1 ? 'fail' : 'call' });
      f.beat(0);
    }
  });
  right.forEach((item, index) => {
    const y = 30 + index * 66;
    f.box({ x: 336, y, w: 284, h: 42, ...item });
    if (index < right.length - 1) {
      f.beat(index + 4);
      f.arrow([478, y + 42], [478, y + 65], { style: index === 1 ? 'event' : 'call' });
      f.beat(0);
    }
  });
  f.text(162, 300, `完成 ${proxy.ok_during_outage} / ${proxy.requests_during_outage} 个请求`, { size: 12.5, weight: 700, anchor: 'middle', hue: 'rose' });
  f.text(478, 300, `完成 ${running.ok_during_outage} / ${running.requests_during_outage} 个请求`, { size: 12.5, weight: 700, anchor: 'middle', hue: 'green' });
  f.text(162, 318, '全部在客户端超时', { size: 11, serif: true, anchor: 'middle', hue: 'ink-soft' });
  f.text(478, 318, 'kube-apiserver 不在此路径上', { size: 11, serif: true, anchor: 'middle', hue: 'ink-soft' });
});
