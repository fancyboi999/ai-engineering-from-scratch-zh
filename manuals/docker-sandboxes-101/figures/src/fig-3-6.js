'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 20, name: 'sbx CLI', hue: 'grey' },
  { x: 145, name: '密钥存储', hue: 'teal' },
  { x: 270, name: 'm101-secret', hue: 'blue' },
  { x: 395, name: 'proxy :3128', hue: 'indigo' },
  { x: 520, name: '接收器', hue: 'grey' },
];
const cx = index => lanes[index].x + 55;
const rows = [
  [0, 1, 'write', 'set-custom --env M101_RECV_KEY', '主机host.docker.internal、localhost'],
  [1, 0, 'reply', 'placeholder sbx-cs-<rand>', null],
  [0, 2, 'state', 'create m101-secret', '内部M101_RECV_KEY=sbx-cs-<rand>'],
  [2, 3, 'call', 'GET host.docker.internal:18080/from-variable', 'Authorization: Bearer sbx-cs-<rand>'],
  [3, 1, 'call', '绑定主机的真实值', null],
  [1, 3, 'reply', 'm101-dummy-receiver-0000', null],
  [3, 4, 'call', 'forward, Host: localhost:18080', 'Bearer m101-dummy-receiver-0000'],
  [4, 2, 'reply', '204', null],
  [2, 3, 'fail', '直连gateway.docker.internal:18080', 'NO_PROXY，透明代理：阻止，不替换'],
  [0, 1, 'write', 'secret rm --placeholder sbx-cs-<rand>', 'Applied secret updates for running sandboxes'],
];

module.exports = figure('fig-3-6', {
  height: 540,
  title: '自定义密钥从钥匙串到接收器',
  desc: '五生命线：CLI、密钥存储、m101-secret、3128正向代理、127.0.0.1:18080接收器。CLI 为host.docker.internal/localhost存 M101_RECV_KEY，得sbx-cs-<rand>，新沙箱环境持有占位值。curl以Bearer发向host.docker.internal:18080；代理读真实值转发localhost，接收器答204。直连gateway.docker.internal:18080绕过正向代理，被透明代理阻止且不替换。移除密钥立即更新运行沙箱。',
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 110, h: 30, hue: lane.hue, title: lane.name, titleSize: 11 });
    f.lifeline(lane.x + 55, 40, 528);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 78 + index * 48;
    f.beat(index + 1);
    f.step(24, y, index + 1, { hue: style === 'fail' ? 'rose' : undefined });
    const x1 = cx(from);
    const x2 = cx(to);
    const labelX = from === 0 || to === 0 ? Math.max((x1 + x2) / 2, 192) : (x1 + x2) / 2;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX });
  });
});
