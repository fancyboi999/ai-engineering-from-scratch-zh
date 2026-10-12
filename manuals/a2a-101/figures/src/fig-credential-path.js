'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-credential-path', {
  height: 456,
  title: "从卡片到受检查请求与任务内批准",
  desc: "deployer 的五步流程。第一步：卡片声明并要求 bearer 方案，平台团队在 A2A 之外签发 token。第二步：无 token 的 GetExtendedAgentCard 得到 HTTP 401 和 WWW-Authenticate challenge。第三步：相同调用带 token，得到有 rollback 技能的扩展卡片。第四步：带 token 的流式部署停在 TASK_STATE_AUTH_REQUIRED。第五步：操作员在 deployer 上通过 A2A 外部批准，任务在同一流继续工作并完成。",
}, f => {
  const left = 20;
  const leftW = 236;
  const right = 340;
  const rightW = 280;
  const gapLabel = (left + leftW + right) / 2;

  f.kicker(left, 18, "1 · 卡片声明，客户端获取");
  f.kicker(left, 122, "2 · HTTP 在 A2A 方法前检查");
  f.kicker(left, 282, "3 · 任务在 A2A 之外请求更多权限");

  f.beat(1);
  f.box({ x: left, y: 26, w: leftW, h: 68, hue: 'blue', title: "deployer 卡片", sub: ['securitySchemes: bearer', 'httpAuthSecurityScheme, Bearer', 'securityRequirements: bearer'] });
  f.box({ x: right, y: 26, w: rightW, h: 68, hue: 'grey', title: "平台团队", sub: ["签发 token dpl_test_7c1e4b", "A2A 之外，任何请求之前"] });

  f.beat(2);
  const noToken = f.box({ x: left, y: 130, w: leftW, h: 46, hue: 'violet', title: 'GetExtendedAgentCard', sub: "无 Authorization 头" });
  const refused = f.box({ x: right, y: 130, w: rightW, h: 46, hue: 'rose', title: 'HTTP 401 Unauthorized', sub: 'WWW-Authenticate: Bearer realm="deployer"' });
  f.arrow(noToken.right(), [refused.x - 1, noToken.cy], { style: 'fail', label: '拒绝', labelX: gapLabel });

  f.beat(3);
  const withToken = f.box({ x: left, y: 196, w: leftW, h: 58, hue: 'violet', title: 'GetExtendedAgentCard', sub: ['Authorization: Bearer', 'dpl_test_7c1e4b'] });
  const card = f.box({ x: right, y: 196, w: rightW, h: 58, hue: 'blue', title: "200 OK，扩展卡片", sub: ["新增技能：rollback", "仅向已认证调用者展示"] });
  f.arrow(withToken.right(), [card.x - 1, withToken.cy], { style: 'reply', label: '接受', labelX: gapLabel });

  f.beat(4);
  const deploy = f.box({ x: left, y: 290, w: leftW, h: 58, hue: 'violet', title: 'SendStreamingMessage', sub: ["部署构建 2026.10.06-1", "到 staging，携带 token"] });
  const waiting = f.box({ x: right, y: 290, w: rightW, h: 58, hue: 'amber', dash: 'dashed', title: 'TASK_STATE_AUTH_REQUIRED', sub: ["任务 ecf2dcb6 等待，流打开", "需要操作员批准"] });
  f.arrow(deploy.right(), [waiting.x - 1, deploy.cy], { style: 'call', label: '部署', labelX: gapLabel });

  f.beat(5);
  const operator = f.box({ x: left, y: 384, w: leftW, h: 58, hue: 'grey', title: "操作员批准", sub: ['POST /approve/ecf2dcb6', "在 deployer，不在 A2A 内"] });
  const done = f.box({ x: right, y: 384, w: rightW, h: 58, hue: 'amber', double: true, title: 'TASK_STATE_COMPLETED', sub: ["TASK_STATE_WORKING 之后", "同一条流"] });
  f.path(`M${waiting.x + 40} ${waiting.y + waiting.h} V366 H${operator.x + operator.w / 2} V${operator.y - 1}`, { style: 'effect' });
  f.text(gapLabel, 360, "批准链接", { size: 11, serif: true, hue: 'ink-soft', anchor: 'middle' });
  f.arrow(operator.right(), [done.x - 1, operator.cy], { style: 'effect', label: '恢复', labelX: gapLabel });
});
