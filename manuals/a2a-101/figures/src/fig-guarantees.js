'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  [['blue', "已知路径上的卡片", '/.well-known/agent-card.json'], ["信任哪些 agent", "注册中心、允许列表、签名密钥"]],
  [['blue', "声明的安全方案", "HTTP 头传输凭据"], ["签发凭据", "token、OAuth、操作员渠道"]],
  [['amber', "任务 ID 与状态", "已结束任务不再变化"], ["一次批准允许什么", "授权策略与审计"]],
  [['indigo', "每条流的有序事件", "每个 webhook 至少尝试一次"], ["恰好一次的效果", "去重与幂等处理器"]],
  [['teal', "保留期间可 GetTask", "未规定保留期"], ["自己的任务记录", "保留、历史、清除"]],
  [['green', "四种 part", "各有媒体类型"], ["相信什么内容", "验证与注入检查"]],
];

module.exports = figure('fig-guarantees', {
  height: 430,
  title: "A2A 的保证与宿主的实现",
  desc: "两列六行。左侧为 A2A 规范保证：已知路径的卡片、声明安全方案并在 HTTP 头传凭据、任务 ID 和不可再变化的已结束状态、每条流有序事件及 webhook 至少尝试一次、服务器保留期间可 GetTask 读取、四种带媒体类型的 part。右侧灰色为宿主实现：信任哪些 agent、签发凭据、批准范围、恰好一次效果、自己的任务记录及保留策略、相信什么内容。",
}, f => {
  f.kicker(20, 18, "A · 协议保证");
  f.kicker(336, 18, "B · 宿主实现");
  f.rule(320, 8, 320, 422, { dash: 'dashed' });
  rows.forEach(([[hue, title, sub], [hostTitle, hostSub]], index) => {
    const y = 30 + index * 66;
    f.beat(index + 1);
    f.box({ x: 20, y, w: 284, h: 50, hue, title, sub });
    f.box({ x: 336, y, w: 284, h: 50, hue: 'grey', title: hostTitle, sub: hostSub });
    f.rule(304, y + 25, 336, y + 25);
  });
});
