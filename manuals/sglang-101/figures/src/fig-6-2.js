'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-2', {
  height: 236,
  title: "一个 token 经过 MoE 层",
  desc: "从左到右四阶段。TopK 为每个 token 选择专家，moe-a2a-backend 指定的 dispatcher 将 token 发往专家所在 GPU，MoeRunner 用 moe-runner-backend 指定的分组矩阵乘计算本地专家，dispatcher 合并结果并传回。",
}, f => {
  const w = 142;
  const y = 40;
  const h = 92;
  const stages = [
    { x: 20, hue: 'violet', title: 'TopK', sub: ["选择专家", "针对各 token"] },
    { x: 176, hue: 'indigo', title: '分发', sub: ["token 发往", "专家 GPU"] },
    { x: 332, hue: 'plum', title: 'MoeRunner', sub: ["分组矩阵", '乘法'] },
    { x: 488, hue: 'indigo', title: '组合', sub: ["结果发回", "对应 token"] },
  ];
  f.kicker(20, 22, "每步的一个 MoE 层");
  const boxes = stages.map(stage => f.box({ x: stage.x, y, w, h, hue: stage.hue, title: stage.title, sub: stage.sub }));
  for (let i = 0; i < boxes.length - 1; i += 1) {
    f.arrow(boxes[i].right(), [boxes[i + 1].x - 1, boxes[i].cy], { style: i === 0 ? 'call' : 'event' });
  }
  f.text(176, 156, '--moe-a2a-backend', { size: 11, hue: 'indigo' });
  f.text(332, 156, '--moe-runner-backend', { size: 11, hue: 'plum' });
  f.text(488, 156, '--moe-a2a-backend', { size: 11, hue: 'indigo' });
  f.rule(20, 176, 630, 176, { hue: 'ink-mute', opacity: 0.4 });
  f.text(20, 198, "--deepep-mode auto：prefill 用 normal，decode 用 low_latency", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 218, "All-to-all 后端将 --ep-size 设为 --tp-size", { size: 11, serif: true, hue: 'ink-soft' });
});
