'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-2', {
  height: 300,
  title: 'kubectl ate 与 kubectl 分别从哪里读取数据',
  desc: '上下两行。顶行中 kubectl ate get actors 经 kube-apiserver 端口转发连接到端口 443 的 Service api，由 ate-api-server 从 Postgres 读取并返回结果；未传 --token-file 时，其令牌属于共享身份 system:serviceaccount:ate-system:ate-client。底行中 kubectl get workerpools 查询 kube-apiserver，后者从 etcd 读取数据，因为只有 WorkerPool、SandboxConfig 和 CSIDriverConfig 是自定义资源。',
}, f => {
  f.kicker(20, 18, 'atespace、模板、actor、worker、策略');
  const cli = f.box({ x: 20, y: 28, w: 150, h: 46, hue: 'olive', title: 'kubectl ate', sub: 'get actors -A' });
  const kube = f.box({ x: 200, y: 28, w: 130, h: 46, hue: 'grey', title: 'kube-apiserver', sub: '端口转发', titleSize: 12 });
  const api = f.box({ x: 360, y: 28, w: 130, h: 46, hue: 'blue', title: 'ate-api-server', sub: 'Service api:443', titleSize: 12 });
  const pg = f.box({ x: 520, y: 28, w: 100, h: 46, hue: 'teal', title: 'Postgres', sub: '数据行' });
  f.beat(1);
  f.arrow(cli.right(), [kube.x - 1, cli.cy], { style: 'call' });
  f.arrow(kube.right(), [api.x - 1, cli.cy], { style: 'call' });
  f.beat(2);
  f.arrow(api.right(), [pg.x - 1, cli.cy], { style: 'call' });
  f.beat(3);
  f.box({ x: 20, y: 98, w: 600, h: 46, hue: 'olive', align: 'left', title: '以 system:serviceaccount:ate-system:ate-client 身份执行', sub: '未传 --token-file 时所有调用方的共享身份', titleSize: 12, dash: 'dashed' });
  f.rule(95, 74, 95, 98, { hue: 'olive', dash: 'dashed' });
  f.beat(0);
  f.rule(20, 168, 620, 168, { dash: 'dashed' });
  f.kicker(20, 192, 'WorkerPool, SandboxConfig, CSIDriverConfig');
  const k = f.box({ x: 20, y: 202, w: 150, h: 46, hue: 'olive', title: 'kubectl', sub: 'get workerpools -A' });
  const kube2 = f.box({ x: 200, y: 202, w: 130, h: 46, hue: 'grey', title: 'kube-apiserver', sub: 'ate.dev/v1', titleSize: 12 });
  const etcd = f.box({ x: 360, y: 202, w: 130, h: 46, hue: 'grey', title: 'etcd', sub: '3 个 CRD' });
  f.beat(4);
  f.arrow(k.right(), [kube2.x - 1, k.cy], { style: 'call' });
  f.arrow(kube2.right(), [etcd.x - 1, k.cy], { style: 'call' });
  f.beat(0);
  f.text(20, 274, 'kubectl get actor 查不到结果：actor 是 Postgres 中的行，不是自定义资源。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 290, '传入 --endpoint 后，kubectl ate 跳过端口转发，直接拨号连接 ate-api-server。', { size: 11, serif: true, hue: 'ink-soft' });
});
