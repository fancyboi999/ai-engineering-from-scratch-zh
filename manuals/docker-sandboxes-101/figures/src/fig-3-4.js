'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 20, name: '内部 curl', hue: 'blue' },
  { x: 145, name: 'proxy :3128', hue: 'indigo' },
  { x: 270, name: 'sandboxd', hue: 'blue' },
  { x: 395, name: '策略存储', hue: 'teal' },
  { x: 520, name: 'example.com', hue: 'grey' },
];
const cx = index => lanes[index].x + 55;
const rows = [
  [0, 1, 'call', 'CONNECT example.com:443', '环境中的 HTTPS_PROXY'],
  [1, 2, 'call', 'op(net:connect:tcp, example.com:443)', null],
  [2, 3, 'call', '匹配 sandbox:m101-policy 规则', null],
  [3, 2, 'reply', 'no applicable policies', null],
  [2, 1, 'fail', 'No matching allow rule (default deny)', null],
  [1, 0, 'fail', 'HTTP/1.1 403 Forbidden, 90 bytes', 'TLS 内，使用代理 CA'],
  [2, 3, 'write', 'log: blocked example.com:443 forward', null],
  [2, 3, 'write', 'policy allow network --sandbox m101-policy', 'rule <uuid> example.com [tcp]'],
  [0, 1, 'call', 'CONNECT example.com:443', null],
  [2, 1, 'reply', 'allowed, forward-bypass', null],
  [1, 4, 'call', 'TLS 隧道，不检查', 'HTTP/1.0 200 Connection established'],
  [4, 0, 'reply', 'HTTP/2 200, server: cloudflare', null],
  [2, 3, 'write', 'log: allowed example.com:443 forward-bypass', null],
];

module.exports = figure('fig-3-4', {
  height: 640,
  title: 'example.com 的一次拒绝与一次允许',
  desc: '五生命线：m101-policy curl、3128正向代理、sandboxd授权器、策略存储、example.com。首次 CONNECT 无匹配策略，代理在 TLS 内回403与90字节批准正文，日志 blocked/forward。随后在沙箱作用域写 example.com 允许。第二次允许 forward-bypass，代理开无检查隧道，example.com答HTTP/2 200，日志allowed。',
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 110, h: 30, hue: lane.hue, title: lane.name, titleSize: 11, anchor: undefined });
    f.lifeline(lane.x + 55, 40, 628);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 76 + index * 43;
    f.beat(index + 1);
    f.step(24, y, index + 1, { hue: style === 'fail' ? 'rose' : undefined });
    const x1 = cx(from);
    const x2 = cx(to);
    const labelX = from === 0 || to === 0 ? Math.max((x1 + x2) / 2, 192) : (x1 + x2) / 2;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX });
  });
});
