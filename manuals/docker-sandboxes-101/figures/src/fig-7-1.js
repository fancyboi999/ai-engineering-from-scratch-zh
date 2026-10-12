'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-7-1', {
  height: 446,
  title: 'sbx move 搬到云端什么',
  desc: '顶本地m101-demo停止并捕获模板，上传，带后缀moved-m101-demo在云启动。左列随镜像：文件系统、kit网络规则、重新发布为云URL的TCP端口、本地环境变量。右列留宿主：绑定挂载、secret存储密钥、本地策略、运行进程；活跃HTTP方法规则先提示。底目的地TTL默认一小时，创建起24小时上限。',
}, f => {
  f.kicker(20, 18, 'sbx move m101-demo --to cloud');
  const src = f.box({ x: 20, y: 30, w: 200, h: 58, hue: 'blue', title: 'm101-demo', sub: ['sandboxd 的本地沙箱', '捕获时停止'] });
  const img = f.box({ x: 260, y: 30, w: 160, h: 58, hue: 'green', title: '模板镜像', sub: ['沙箱文件系统', '一个 OCI 镜像，推送'] });
  const dst = f.box({ x: 460, y: 30, w: 160, h: 58, hue: 'blue', title: 'moved-m101-demo', sub: ['加唯一后缀', '新 id，small 规格'] });
  f.arrow(src.right(), [img.x - 1, src.cy], { style: 'write', label: '捕获' });
  f.arrow(img.right(), [dst.x - 1, img.cy], { style: 'call', label: '上传' });

  f.kicker(20, 124, '随镜像迁移', { hue: 'green' });
  f.kicker(330, 124, '留在宿主', { hue: 'grey' });
  const travels = [
    ['沙箱容器文件系统', '文件、包、agent 状态'],
    ['kit 网络规则', 'env-mixin的example.org（12-kit-add.txt）'],
    ['发布的 TCP 端口', '重新发布为云 HTTPS URL'],
    ['环境变量', '本地镜像的一部分'],
  ];
  const stays = [
    ['宿主绑定挂载', '$CAPTURE/fixtures/repo，不在镜像内'],
    ['sbx secret 存储的密钥', 'M101_RECV_KEY，云存储独立'],
    ['本地策略规则', 'local:<uuid> 规则，改用云策略'],
    ['运行进程与内存', '目的地从镜像启动'],
  ];
  travels.forEach(([title, sub], index) => {
    f.box({ x: 20, y: 134 + index * 48, w: 290, h: 40, hue: 'green', title, sub, titleSize: 12 });
  });
  stays.forEach(([title, sub], index) => {
    f.box({ x: 330, y: 134 + index * 48, w: 290, h: 40, hue: 'grey', title, sub, titleSize: 12, dash: 'dashed' });
  });
  f.path(`M300 133 V110 H${img.cx} V89`, { style: 'write' });
  f.text(150, 106, '复制入镜像', { size: 11, serif: true, hue: 'ink-soft', knock: true });
  f.box({ x: 330, y: 326, w: 290, h: 40, hue: 'rose', title: '活跃 HTTP 方法规则', sub: '先提示，--force保留warning', titleSize: 12, dash: 'dashed' });

  const ttl = f.box({ x: 20, y: 376, w: 600, h: 58, hue: 'amber', title: '目的地 TTL', sub: ['服务器默认1h，创建起硬上限24h', '--on-timeout stop保留，delete删除，sbx --cloud ttl +2h延长'] });
  f.path(`M${dst.cx} 89 V100 H632 V${ttl.y + 29} H621`, { style: 'state' });
  f.text(586, 112, '时钟启动', { size: 11, hue: 'amber', anchor: 'middle', knock: true });
});
