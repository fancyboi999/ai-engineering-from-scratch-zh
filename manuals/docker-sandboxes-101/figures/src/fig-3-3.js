'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  { y: 50, hue: 'teal', question: '匹配拒绝规则？', ask: '任意作用域/来源', style: 'fail', outHue: 'rose', out: 'Denied by local rule', detail: ['deny_kind: explicit · origin: local', 'rule: local:<uuid> · 09-check-deny.json'] },
  { y: 128, hue: 'grey', question: '组织治理活跃？', ask: 'governance.active', style: 'reply', outHue: 'grey', dash: 'dashed', out: '录制宿主为false', detail: ['true时只有组织允许授权', '本地/kit允许不活跃'] },
  { y: 206, hue: 'teal', question: '匹配沙箱允许？', ask: 'scope sandbox:m101-policy', style: 'reply', outHue: 'indigo', out: 'allowed: true', detail: ['local <uuid> example.com [tcp]', '09-check-allowed.json'] },
  { y: 284, hue: 'teal', question: '匹配全局/kit允许？', ask: 'local-policy, kit:<name>', style: 'reply', outHue: 'indigo', out: 'allowed: true', detail: ['default-ai-services api.anthropic.com:443', '03-policy-check-anthropic.json'] },
  { y: 362, hue: 'grey', question: '没有匹配', ask: 'default deny', style: 'fail', outHue: 'rose', out: 'No matching allow rule (default deny)', detail: ['deny_kind: implicit · 09-check-verbose.json', 'inside: Approval required for example.com:443'] },
];

module.exports = figure('fig-3-3', {
  height: 440,
  title: 'example.com:443 的请求判断',
  desc: '授权器对 m101-policy 的 op(action=net:connect:tcp, resource=net:domain:example.com:443) 顺序问五问题。匹配拒绝得 Denied by local rule、explicit、local:<uuid>。录制无组织治理；有时仅组织允许授予。沙箱允许、全局或kit允许返回 allowed true，example.com/api.anthropic.com 检查展示此事。无匹配得 No matching allow rule、implicit，沙箱看到批准请求。',
}, f => {
  f.kicker(20, 18, '请求');
  f.text(20, 36, 'op(action=net:connect:tcp, resource=net:domain:example.com:443) · context sandbox:m101-policy', { size: 11 });
  rows.forEach((row, index) => {
    const ask = f.box({ x: 20, y: row.y, w: 250, h: 56, hue: row.hue, title: row.question, sub: row.ask });
    const out = f.box({ x: 300, y: row.y, w: 320, h: 56, hue: row.outHue, dash: row.dash, title: row.out, sub: row.detail, titleSize: 12 });
    f.arrow(ask.right(), [out.x - 1, ask.cy], { style: row.style });
    if (index < rows.length - 1) f.arrow([80, row.y + 56], [80, row.y + 77], { style: 'call', label: index === 0 ? 'no' : undefined, labelSize: 11 });
  });
});
