'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-6', {
  height: 420,
  title: "steps 3、topk 1、4 个草稿 token 的 EAGLE 步",
  desc: "自上而下四阶段。草稿模型运行三步，提出 d1、d2、d3。目标模型对草稿位置做一次 TARGET_VERIFY 前向，接受 d1、d2，拒绝 d3，加自己的 bonus token，因此提交三个 token，接受长度 3。草稿模型随后用 DRAFT_EXTEND_V2 读取接受 token，为下一步准备。",
}, f => {
  f.beat(1);
  f.kicker(20, 18, "1 · 草稿，num_steps 3，topk 1");
  const drafts = ['d1', 'd2', 'd3'].map((name, index) => {
    f.beat(index + 1);
    if (index) f.arrow([20 + (index - 1) * 150 + 120, 50], [20 + index * 150 - 1, 50], { style: 'model' });
    return f.box({ x: 20 + index * 150, y: 28, w: 120, h: 44, hue: 'plum', title: name, sub: `草稿步骤 ${index + 1}` });
  });
  f.beat(4);
  f.kicker(20, 104, "2 · 验证，目标模型一次前向");
  f.arrow([320, drafts[0].y + drafts[0].h], [320, 113], { style: 'call', label: "4 个草稿 token", labelX: 320 });
  const verify = f.box({ x: 20, y: 114, w: 600, h: 48, hue: 'violet', title: "目标模型，ForwardMode TARGET_VERIFY", sub: "用树掩码为 d1、d2、d3 与下一位置评分" });
  f.beat(5);
  f.kicker(20, 196, "3 · 接受最长匹配");
  f.arrow([310, verify.y + verify.h], [310, 205], { style: 'reply' });
  const results = [
    { title: 'd1', sub: "接受", hue: 'green' },
    { title: 'd2', sub: "接受", hue: 'green' },
    { title: 'd3', sub: "拒绝", hue: 'rose', dash: 'dashed' },
    { title: "奖励 token", sub: "来自目标模型", hue: 'green' },
  ];
  results.forEach((item, index) => f.box({ x: 20 + index * 150, y: 206, w: 130, h: 46, ...item }));
  f.beat(6);
  f.kicker(20, 286, "4 · 提交并重新填充");
  f.box({ x: 20, y: 296, w: 290, h: 56, hue: 'amber', title: "提交 3 个 token", sub: ["接受长度 3", 'd1, d2, bonus'] });
  f.beat(7);
  f.arrow([310, 324], [329, 324], { style: 'model' });
  f.box({ x: 330, y: 296, w: 290, h: 56, hue: 'plum', title: "草稿模型，DRAFT_EXTEND_V2", sub: ["读取 d1、d2、bonus", "准备下一步"] });
  f.text(20, 384, "不开推测解码，同样三个 token 需目标模型三次前向", { size: 11, serif: true, hue: 'ink-soft' });
});
