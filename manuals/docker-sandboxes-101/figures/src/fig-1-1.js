'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

module.exports = figure('fig-1-1', {
  height: 452,
  title: 'sbx与docker-agent各管什么',
  desc: '两列跨宿主/客户机两区。宿主侧 sbx 管 v0.47.0 CLI、socket 上的 sandboxd、保存密钥的 macOS 钥匙串、gateway.docker.internal:3128 代理；docker-agent 管 v1.149.0 程序、agent 文件、sandbox-kits 暂存 kit 和 localhost:12434 持久允许列表。虚线为 hypervisor。客户机侧 sbx 管 Linux7.0.14内核、私有 Engine29.8.1、同路径 virtiofs 工作区、代理变量与 proxy-managed 密钥环境；docker-agent 只管进程、filesystem/shell 工具及模型调用循环。',
}, f => {
  f.text(20, 18, 'sbx 管理', { size: 12, weight: 700, hue: 'blue' });
  f.text(336, 18, 'docker-agent 管理', { size: 12, weight: 700, hue: 'violet' });
  f.rule(320, 8, 320, 444, { dash: 'dashed' });

  f.kicker(20, 42, '宿主 · macOS 26.2 arm64');
  const host = [
    { x: 20, y: 50, hue: 'blue', title: 'sbx v0.47.0', sub: '你输入的CLI' },
    { x: 164, y: 50, hue: 'blue', title: 'sandboxd', sub: 'sandboxd.sock' },
    { x: 20, y: 110, hue: 'teal', title: '钥匙串', sub: 'sbx secret set' },
    { x: 164, y: 110, hue: 'indigo', title: 'proxy :3128', sub: '策略、密钥替换' },
  ];
  for (const item of host) f.box({ ...item, w: 140, h: 46, titleSize: 12 });
  const agentHost = [
    { x: 336, y: 50, hue: 'violet', title: 'docker-agent', sub: 'v1.149.0, Homebrew' },
    { x: 482, y: 50, hue: 'violet', title: 'agent 文件', sub: 'files-sandbox.yaml' },
    { x: 336, y: 110, hue: 'green', title: 'sandbox-kits/<hash>', sub: '暂存的kit' },
    { x: 482, y: 110, hue: 'teal', title: '允许列表', sub: 'localhost:12434' },
  ];
  for (const item of agentHost) f.box({ ...item, w: 138, h: 46, titleSize: 11, pad: 5 });

  f.rule(20, 178, 620, 178, { dash: 'dashed' });
  f.text(30, 182, 'Hypervisor.framework · kern.hv_support: 1', { size: 11, hue: 'ink-soft', knock: true });

  f.kicker(20, 208, '客户机 · 每沙箱一个microVM');
  f.rect(20, 216, 290, 228, { fill: color('paper'), stroke: color('ink-mute') });
  const guest = [
    { y: 226, hue: 'blue', title: 'Linux 7.0.14 aarch64', sub: '独立内核，Ubuntu26.04.1' },
    { y: 280, hue: 'blue', title: 'Docker Engine 29.8.1', sub: '其容器不出现于宿主docker ps' },
    { y: 334, hue: 'green', title: '工作区挂载', sub: 'virtiofs rw，相同绝对路径' },
    { y: 388, hue: 'indigo', title: '环境', sub: 'HTTPS_PROXY，密钥proxy-managed' },
  ];
  for (const item of guest) f.box({ x: 30, w: 270, h: 46, titleSize: 12, ...item });

  f.rect(336, 216, 284, 228, { fill: color('paper'), stroke: color('ink-mute') });
  const loop = [
    { y: 226, hue: 'violet', title: 'docker-agent process', sub: '循环：模型、工具、子agent' },
    { y: 280, hue: 'olive', title: 'filesystem, shell', sub: 'VM内运行的工具' },
    { y: 334, hue: 'plum', title: '模型调用', sub: 'host.docker.internal:12434' },
  ];
  for (const item of loop) f.box({ x: 346, w: 264, h: 46, titleSize: 12, ...item });
  f.text(478, 414, '客户机内无其他归属', { size: 11, serif: true, italic: true, hue: 'ink-soft', anchor: 'middle' });
});
