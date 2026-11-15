'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-2', {
  height: 330,
  title: '访问策略的两个作用域及其各自的角色',
  desc: '归属树结构。顶部由 --authz-bootstrap-owners 指定的引导所有者始终拥有全局作用域的 owner 角色。其下名为 default 的全局访问策略可授予 owner 与 viewer。再往下的 team-a 与 team-b 两个 atespace 各有一条名为 default 的访问策略，可授予 owner、editor 与 viewer。worker 只属于全局作用域。atenet-router、atenet-egress、atelet、ate-controller 及 ate-api-server pod 的系统角色由 pod 证书决定，任何策略都无法授予。',
}, f => {
  const boot = f.box({ x: 20, y: 24, w: 250, h: 56, hue: 'grey', title: '--authz-bootstrap-owners', sub: '默认：共享身份 ate-client' });
  const global = f.box({ x: 20, y: 122, w: 250, h: 62, hue: 'blue', title: '全局访问策略', sub: ['name: default', 'roles: owner, viewer'] });
  f.arrow(boot.bottom(), [boot.cx, global.y - 1], { style: 'call', label: '始终为 owner' });

  const a = f.box({ x: 20, y: 236, w: 180, h: 76, hue: 'blue', title: 'atespace team-a', sub: ['访问策略 default', 'owner, editor, viewer'] });
  const b = f.box({ x: 220, y: 236, w: 180, h: 76, hue: 'blue', title: 'atespace team-b', sub: ['访问策略 default', 'owner, editor, viewer'] });
  f.path(`M${global.x + 60} ${global.y + global.h} V${a.y - 1}`, { style: 'call' });
  f.path(`M${global.x + 200} ${global.y + global.h} V210 H${b.cx} V${b.y - 1}`, { style: 'call' });
  f.text(322, 206, '全局角色在每个', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(322, 222, 'atespace 均有效', { size: 11, serif: true, hue: 'ink-soft' });

  const workers = f.box({ x: 310, y: 122, w: 130, h: 62, hue: 'violet', title: 'workers', sub: ['仅限全局作用域'] });
  f.arrow(global.right(), [workers.x - 1, global.cy], { style: 'call' });

  f.kicker(470, 18, '系统角色');
  f.rect(460, 28, 160, 284, { hue: 'grey', dash: 'dashed' });
  const sys = [['atenet-router', '恢复 actor', 'indigo'], ['atenet-egress', '签发 actor JWT', 'indigo'], ['atelet', '读取出站策略', 'violet'], ['ate-controller', '管理 worker', 'blue'], ['ate-api-server', 'sidecar 读 actor', 'blue']];
  sys.forEach(([title, sub, hue], index) => f.box({ x: 470, y: 38 + index * 48, w: 140, h: 44, hue, title, sub, titleSize: 12, pad: 6 }));
  f.text(540, 290, '由 pod 证书赋予', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.text(540, 305, '无法通过策略授予', { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
});
