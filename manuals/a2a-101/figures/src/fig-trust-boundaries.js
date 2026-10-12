'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  {
    where: ['blue', "agent 卡片", '/.well-known/agent-card.json'],
    threat: ["伪造卡片", "消息发往其端点"],
    check: ['violet', "验证签名", 'kid deployer-key-1, HTTPS'],
  },
  {
    where: ['green', "回复中的 part", 'review.json, test-log.txt'],
    threat: ["注入指令", "看起来像指令的文本"],
    check: ['violet', "验证 data part", "按有类型字段决策"],
  },
  {
    where: ['green', "文件与 URL part", 'refunds.diff, screenshot.png'],
    threat: ["恶意文件、SSRF", "agent 获取任意 URL"],
    check: ['blue', "检查类型与大小", "先验证 URL"],
  },
  {
    where: ['indigo', "webhook URL", 'localhost:41250/a2a-events'],
    threat: ['SSRF', "推送到内部主机"],
    check: ['blue', "拒绝私有主机", "或维护允许列表"],
  },
  {
    where: ['indigo', 'POST /a2a-events', "通知到达"],
    threat: ["伪造通知", "按假事件行动"],
    check: ['violet', "检查 Authorization", "且 taskId 属于你"],
  },
  {
    where: ['teal', "存储记录", "历史、配置、日志"],
    threat: ["秘密明文保存", "回传 hook_secret_91d2"],
    check: ['blue', "脱敏，限定读取范围", "设置保留策略"],
  },
];

module.exports = figure('fig-trust-boundaries', {
  height: 444,
  title: "套件中的信任边界",
  desc: "六行按 planner 遇到的顺序展示套件双方之间的数据跨界位置。agent 卡片：伪造卡片将消息送往别处，planner 因此通过 HTTPS 验证签名。回复 part 如 review.json：文本可能写成指令，planner 验证 data part，按有类型字段决策。文件与 URL part：恶意文件或 agent 获取任意 URL，agent 检查类型、大小和 URL。webhook URL：SSRF，agent 拒绝私有主机。入站通知：伪造，planner 检查 Authorization 和任务 ID。存储记录：秘密明文保存，agent 脱敏、限定读取范围并设置保留期。",
}, f => {
  const cols = [{ x: 20, w: 200 }, { x: 232, w: 188 }, { x: 432, w: 188 }];
  f.kicker(cols[0].x, 18, "数据跨界位置");
  f.kicker(cols[1].x, 18, '威胁');
  f.kicker(cols[2].x, 18, '检查');
  f.rect(232, 422, 14, 12, { hue: 'violet' });
  f.text(252, 432, "planner 检查", { size: 11, serif: true, hue: 'ink-soft' });
  f.rect(432, 422, 14, 12, { hue: 'blue' });
  f.text(452, 432, "远程 agent 检查", { size: 11, serif: true, hue: 'ink-soft' });
  rows.forEach((row, index) => {
    const y = 28 + index * 66;
    const [whereHue, whereTitle, whereSub] = row.where;
    const [threatTitle, threatSub] = row.threat;
    const [checkHue, checkTitle, checkSub] = row.check;
    f.beat(index + 1);
    f.box({ x: cols[0].x, y, w: cols[0].w, h: 50, hue: whereHue, title: whereTitle, sub: whereSub, titleSize: 12 });
    f.box({ x: cols[1].x, y, w: cols[1].w, h: 50, hue: 'rose', title: threatTitle, sub: threatSub, titleSize: 12 });
    f.box({ x: cols[2].x, y, w: cols[2].w, h: 50, hue: checkHue, title: checkTitle, sub: checkSub, titleSize: 12 });
    f.rule(cols[0].x + cols[0].w, y + 25, cols[1].x, y + 25);
    f.rule(cols[1].x + cols[1].w, y + 25, cols[2].x, y + 25);
  });
});
