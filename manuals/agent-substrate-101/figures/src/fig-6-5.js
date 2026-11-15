'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { title: 'actor f-main', sub: '不发真实密钥', hue: 'green' },
  { title: 'atenet-egress', sub: '一条 http 规则', hue: 'indigo' },
  { title: '凭据提供方', sub: 'k8s.io', hue: 'blue' },
  { title: 'Secret', sub: 'cred-ns/api-token', hue: 'grey' },
  { title: 'whoami', sub: '上游主机', hue: 'olive' },
];
const cx = index => 76 + index * 124;

const rows = [
  [0, 1, 'call', 'Authorization: placeholder', '经隧道发送 GET /'],
  [1, 2, 'call', 'FetchSecret', '凭据引用与 actor 身份'],
  [2, 3, 'call', '读取 token 键', '允许 lab-f 使用 cred-ns'],
  [2, 1, 'reply', '密钥值', null],
  [1, 4, 'call', 'Authorization: Bearer <secret>', '网关覆写请求头值'],
  [4, 0, 'fail', '200，响应体回显请求头', 'actor 读到了真实密钥'],
];

module.exports = figure('fig-6-5', {
  height: 366,
  title: '一次携带占位头的凭据注入请求',
  desc: '五条生命线：actor f-main、atenet-egress、凭据提供方 k8s.io、Kubernetes Secret cred-ns/api-token 以及上游主机 whoami。六步交互：actor 发送 Authorization 设为占位值的请求，atenet-egress 携带凭据引用和 actor 身份调用 FetchSecret，提供方读取 Secret 的 token 键并返回密钥值，atenet-egress 将 Authorization 覆写为 Bearer 加真实密钥后发往上游。上游 whoami 返回 200 并在响应体回显请求头，导致 actor 读到了真实密钥。',
}, f => {
  lanes.forEach((lane, index) => {
    f.box({ x: cx(index), y: 8, w: 118, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11, anchor: 'middle', pad: 3 });
    f.lifeline(cx(index), 48, 356);
  });
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 84 + index * 46;
    f.beat(index + 1);
    f.step(12, y, index + 1);
    const x1 = cx(from);
    const x2 = cx(to);
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note: note || undefined });
  });
});
