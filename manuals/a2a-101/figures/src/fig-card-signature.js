'use strict';

const { figure } = require('../../../_shared/figkit.js');

function record(f, x, y, w, h, title, lines, options = {}) {
  f.rect(x, y, w, h, { hue: options.hue || 'blue', dash: options.dash });
  f.text(x + 12, y + 20, title, { size: 12, weight: 700 });
  lines.forEach((line, index) => f.text(x + 12, y + 36 + index * 15, line, { size: 11 }));
  return { x, y, w, h };
}

module.exports = figure('fig-card-signature', {
  height: 450,
  title: "签署与验证 deployer 卡片",
  desc: "上半部分分三步签名：deployer 卡片排除 signatures，用 RFC 8785 规范化为 959 字节负载。受保护头 {\"alg\":\"HS256\",\"typ\":\"JOSE\",\"kid\":\"deployer-key-1\"} 与负载分别 base64url 编码，用句点连接为 1,348 字符的签名输入。HMAC-SHA256 签名得到 signatures[0]，protected 为 eyJhbGci，signature 为 yPk834ji。下半部分分四步验证：发布卡片重建相同负载，签名匹配，返回 True。将 description 改为原始字面量 \"Deploys a tagged build to production.\" 的副本重建不同负载，返回 False。",
}, f => {
  f.kicker(20, 18, '签名');
  f.kicker(20, 300, '验证');
  const card = f.box({ x: 20, y: 30, w: 170, h: 58, hue: 'blue', title: "deployer 卡片", titleSize: 12, sub: ["11 个成员，", "另加 signatures"] });

  f.beat(1);
  const payload = f.box({ x: 280, y: 30, w: 340, h: 58, hue: 'blue', title: "规范化负载，RFC 8785", titleSize: 12, sub: ["键排序，无空格，无 signatures", "959 字节，从 capabilities 到 version"] });
  f.arrow([card.x + card.w, 59], [payload.x - 1, 59], { style: 'call', label: '规范化', labelSize: 11, note: "规则 1 至 3" });

  f.beat(2);
  const header = record(f, 20, 118, 230, 58, "受保护头", ['{"alg":"HS256","typ":"JOSE",', '"kid":"deployer-key-1"}']);
  const input = f.box({ x: 330, y: 118, w: 290, h: 58, hue: 'blue', title: "JWS 签名输入", titleSize: 12, sub: ["BASE64URL(header) '.' BASE64URL(payload)", "1,348 字符，单行"] });
  f.arrow([header.x + header.w, 147], [input.x - 1, 147], { style: 'call', label: 'base64url', labelSize: 11 });
  f.arrow([475, payload.y + payload.h], [475, input.y - 1], { style: 'call', label: 'base64url', labelSize: 11 });

  f.beat(3);
  const signature = record(f, 330, 206, 290, 58, 'signatures[0]', ['protected "eyJhbGci"', 'signature "yPk834ji"']);
  f.arrow([475, input.y + input.h], [475, signature.y - 1], { style: 'call', label: 'HMAC-SHA256', labelSize: 11 });
  f.text(467, 194, "HS256，密钥 deployer-key-1", { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
  f.box({ x: 20, y: 206, w: 280, h: 58, hue: 'grey', dash: 'dashed', sub: ["套件：HS256，共享密钥", "真实卡片：ES256 或 RS256，", "公钥在 jku 指向的 JWKS"] });

  f.beat(4);
  const published = f.box({ x: 20, y: 312, w: 210, h: 46, hue: 'blue', title: "发布卡片", titleSize: 12, sub: "description 与签名时一致" });
  const same = record(f, 290, 312, 160, 46, '重新计算', ['"yPk834ji"']);
  f.arrow([published.x + published.w, 335], [same.x - 1, 335], { style: 'call', label: '重建', labelSize: 11 });

  f.beat(5);
  const ok = f.box({ x: 510, y: 312, w: 110, h: 46, hue: 'blue', title: 'True', titleSize: 12, sub: "步骤 5" });
  f.arrow([same.x + same.w, 335], [ok.x - 1, 335], { style: 'call', label: '匹配', labelSize: 11 });

  f.beat(6);
  const edited = f.box({ x: 20, y: 380, w: 210, h: 58, hue: 'blue', dash: 'dashed', title: "修改后的副本", titleSize: 12, sub: ['"Deploys a tagged build', 'to production."'] });
  const other = record(f, 290, 380, 160, 58, '重新计算', ["新负载，", "另一个值"]);
  f.arrow([edited.x + edited.w, 409], [other.x - 1, 409], { style: 'call', label: '重建', labelSize: 11 });

  f.beat(7);
  const bad = f.box({ x: 510, y: 380, w: 110, h: 58, hue: 'rose', title: 'False', titleSize: 12, sub: "步骤 6" });
  f.arrow([other.x + other.w, 409], [bad.x - 1, 409], { style: 'fail', label: '不同', labelSize: 11 });
});
