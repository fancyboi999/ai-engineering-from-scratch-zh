'use strict';

const { figure } = require('../../../_shared/figkit.js');

const project = [
  { hue: 'grey', title: 'GKE Standard 集群', sub: '1.37 版，Rapid 通道，Dataplane V2' },
  { hue: 'teal', title: '两个 Cloud Storage bucket', sub: '存放快照，以及 microVM 内核与 rootfs' },
  { hue: 'grey', title: 'Artifact Registry: ate-images', sub: '存放安装器构建的镜像' },
  { hue: 'grey', title: 'ate-snapshot-transfer', sub: '服务账号及其 IAM 授权' },
  { hue: 'grey', title: 'Cloud Monitoring 仪表盘', sub: '路由延迟、快照大小、gRPC 流量' },
];
const cluster = [
  { hue: 'blue', title: 'ate-api-server', sub: '含 ate-controller 与 ate-idp-server' },
  { hue: 'indigo', title: 'atenet-router, atenet-egress', sub: '数据平面' },
  { hue: 'violet', title: 'atelet', sub: '每个节点上的特权 DaemonSet' },
  { hue: 'teal', title: 'PostgreSQL', sub: '挂载 500 GiB 磁盘的单副本 StatefulSet' },
  { hue: 'violet', title: '三个 CRD 与 mTLS 所用 CA', sub: 'WorkerPool, SandboxConfig, CSIDriverConfig' },
];

module.exports = figure('fig-7-3', {
  height: 396,
  title: 'GKE 安装器创建的资源及其运维归属',
  desc: '安装器在本机运行并调用两个工具。setup-gcp 在你的 Google Cloud 项目中创建五项资源：GKE Standard 集群、两个 bucket、Artifact Registry 仓库、服务账号与监控仪表盘。ate-setup 在由你运维的集群内安装五项组件：控制平面、数据平面、atelet、挂载 500 GiB 磁盘的 PostgreSQL 以及各 CRD。',
}, f => {
  f.box({ x: 20, y: 12, w: 600, h: 40, hue: 'grey', title: '本机运行的安装器', sub: '依赖 git、Go 与带 buildx 的 Docker，不可在 Cloud Shell 中运行。', titleSize: 12 });
  f.arrow([165, 52], [165, 92], { style: 'call', label: 'setup-gcp' });
  f.arrow([475, 52], [475, 92], { style: 'call', label: 'ate-setup' });
  f.kicker(20, 110, '在你的 Google Cloud 项目中');
  f.kicker(330, 110, '在由你运维的集群中');
  project.forEach((item, index) => f.box({ x: 20, y: 120 + index * 54, w: 290, h: 44, titleSize: 11.5, ...item }));
  cluster.forEach((item, index) => f.box({ x: 330, y: 120 + index * 54, w: 290, h: 44, titleSize: 11.5, ...item }));
});
