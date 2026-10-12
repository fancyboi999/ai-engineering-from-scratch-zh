'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-1', {
  height: 470,
  title: 'm101-demo 的隔离层与入口',
  desc: '宿主行含 CLI、sandboxd、钥匙串、gateway.docker.internal:3128 正向代理。hypervisor 虚线下客户机为 Ubuntu26.04.1、16384字节页的 Linux7.0.14 aarch64、containerd2.3.5、私有 Engine29.8.1、uid1000且属sudo/docker组的 agent 容器、同路径 virtiofs 工作区。右列为网络、密钥、MCP、SSH agent、绑定挂载五入口，逐项给打开入口的客户机行。',
}, f => {
  f.kicker(20, 18, '宿主 · macOS 26.2 arm64 · sbx 0.47.0');
  f.box({ x: 20, y: 26, w: 90, h: 44, hue: 'grey', title: 'sbx', sub: 'CLI', titleSize: 12 });
  f.box({ x: 118, y: 26, w: 150, h: 44, hue: 'grey', title: 'sandboxd', sub: 'sandboxd.sock', titleSize: 12 });
  f.box({ x: 276, y: 26, w: 110, h: 44, hue: 'teal', title: '钥匙串', sub: '密钥存储', titleSize: 12 });
  f.box({ x: 394, y: 26, w: 226, h: 44, hue: 'indigo', title: '正向代理 :3128', sub: 'gateway.docker.internal', titleSize: 12 });

  f.rule(20, 88, 620, 88, { dash: 'dashed' });
  f.text(20, 83, 'hypervisor · kern.hv_support 为1', { size: 11, hue: 'ink-soft', knock: true });

  f.kicker(20, 110, '客户机 · m101-demo');
  f.rect(20, 118, 420, 330, { fill: color('paper'), stroke: color('ink-mute') });
  f.box({ x: 32, y: 130, w: 396, h: 50, hue: 'blue', title: '内核 Linux 7.0.14 aarch64', sub: 'Ubuntu 26.04.1 LTS · getconf PAGESIZE 16384' });
  f.box({ x: 32, y: 192, w: 396, h: 50, hue: 'blue', title: 'containerd v2.3.5', sub: 'runc 1.5.1 · erofs root · overlay /' });
  f.box({ x: 32, y: 254, w: 396, h: 50, hue: 'blue', title: '私有 Docker Engine 29.8.1', sub: '镜像与容器留在 VM' });
  f.box({ x: 32, y: 316, w: 396, h: 50, hue: 'blue', title: 'agent 容器', sub: 'uid=1000(agent) groups sudo, docker' });
  f.box({ x: 32, y: 378, w: 396, h: 56, hue: 'green', title: '$CAPTURE/fixtures/repo', sub: ['相同路径的 virtiofs rw', '/etc/resolv.conf：virtiofs ro 绑定'] });
  f.arrow([230, 180], [230, 191], { style: 'call', packet: false });
  f.arrow([230, 242], [230, 253], { style: 'call', packet: false });
  f.arrow([230, 304], [230, 315], { style: 'call', packet: false });

  f.kicker(470, 110, '入口');
  const doors = [
    { y: 130, hue: 'indigo', title: 'network', sub: 'HTTPS_PROXY :3128' },
    { y: 192, hue: 'teal', title: 'secret', sub: 'proxy-managed 哨兵值' },
    { y: 254, hue: 'olive', title: 'MCP', sub: 'MCP_GATEWAY_URL' },
    { y: 316, hue: 'grey', title: 'SSH agent', sub: '/run/ssh-agent.sock' },
    { y: 378, hue: 'green', title: '绑定挂载', sub: '宿主路径，rw' },
  ];
  for (const door of doors) {
    const box = f.box({ x: 460, y: door.y, w: 160, h: 50, hue: door.hue, title: door.title, sub: door.sub, titleSize: 12 });
    f.arrow(box.left(), [441, box.cy], { style: 'call', hue: door.hue, packet: false });
  }
});
