'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-1', {
  height: 356,
  title: '检查客户端身份的两个位置及其各自决定的事项',
  desc: '上下两层。上层中，未传令牌文件的 kubectl ate 向 ate-api-server 出示共享身份 ate-client；后者校验客户端证书或 Bearer JWT 并评估访问策略，因该身份是引导所有者，故可管理所有 actor。下层中，三个 pod 调用 atenet-router，后者要求客户端证书的 SPIFFE ID 位于单一允许列表内：列表内的 atenet-client 在未持有任何角色的 atespace 中仍从 my-counter-1 拿到 200；不在列表内的 ns/probe/sa/default 收到 TLS 告警 certificate unknown；无证书的 pod 被直接断开连接。',
}, f => {
  f.kicker(20, 18, 'API 层：谁可以管理 actor');
  const cli = f.box({ x: 20, y: 28, w: 200, h: 64, hue: 'olive', pad: 8, title: 'kubectl ate', sub: ['未传 --token-file，故以', 'ate-system:ate-client 身份执行'] });
  const api = f.box({ x: 250, y: 28, w: 180, h: 64, hue: 'blue', pad: 8, title: 'ate-api-server', sub: ['证书或 Bearer JWT，', '再评估访问策略'] });
  const owner = f.box({ x: 460, y: 28, w: 160, h: 64, hue: 'green', pad: 6, title: '所有 actor', sub: ['所有 atespace 的', '引导所有者'] });
  f.arrow(cli.right(), [api.x - 1, cli.cy], { style: 'call' });
  f.arrow(api.right(), [owner.x - 1, api.cy], { style: 'call' });

  f.kicker(20, 130, '路由器层：谁可以调用 actor');
  const router = f.box({ x: 250, y: 140, w: 180, h: 180, hue: 'indigo', pad: 6, title: 'atenet-router', sub: ['客户端证书，且其', 'SPIFFE ID 在允许列表内：', '--ingress-allowed-spiffe-ids'] });
  const rows = [
    { title: '允许的身份', sub: 'ns/ate-system/sa/atenet-client', out: ['my-counter-1 返回 200', '各 atespace 的任意 actor', 'green'] },
    { title: '不在列表内的身份', sub: 'ns/probe/sa/default', out: ['TLS 告警', 'certificate unknown', 'rose'] },
    { title: '无客户端证书', sub: '普通 pod', out: ['连接被关闭', 'curl: Broken pipe', 'rose'] },
  ];
  rows.forEach((row, index) => {
    const y = 140 + index * 64;
    const client = f.box({ x: 20, y, w: 200, h: 52, hue: 'olive', pad: 8, titleSize: 11.5, title: row.title, sub: row.sub });
    const [title, sub, hue] = row.out;
    const out = f.box({ x: 460, y, w: 160, h: 52, hue, pad: 5, titleSize: 11.5, title, sub, dash: hue === 'rose' ? 'dashed' : undefined });
    f.arrow(client.right(), [router.x - 1, client.cy], { style: 'call' });
    f.arrow([router.x + router.w, client.cy], [out.x - 1, client.cy], { style: hue === 'rose' ? 'fail' : 'call' });
  });
  f.text(20, 344, '上述拒绝结果来自 Envoy 数据平面。该允许列表只列身份，不区分 atespace。', { size: 11, serif: true, hue: 'ink-soft' });
});
