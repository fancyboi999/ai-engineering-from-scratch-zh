'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-3', {
  height: 420,
  title: "审读公开 SGLang 基准的六个问题",
  desc: "一列六个问题：版本是否明确、负载是否匹配、内存预算是否匹配、并发是否低于图上限、跨引擎参数是否对应、谁付费。任一回答否，则右侧说明该结果仍能提供什么。六项全是，才进入自己的服务器验证机制。",
}, f => {
  const questions = [
    ["1 · 写明 SGLang 版本？", "未知构建：仅作轶闻"],
    ["2 · 负载与你匹配？", "描述另一种负载"],
    ["3 · 内存预算匹配？", "比较的是两种 KV 池容量"],
    ["4 · 并发低于图上限？", "测量的是 eager decode"],
    ["5 · 引擎参数正确对应？", "参数错误就能决定结果"],
    ["6 · 写明谁付费？", "视作该方的主张"],
  ];
  questions.forEach(([question, outcome], index) => {
    const y = 20 + index * 58;
    f.box({ x: 20, y, w: 300, h: 34, hue: 'amber', title: question, titleSize: 12 });
    f.arrow([320, y + 17], [372, y + 17], { style: 'fail', label: "否", labelX: 346 });
    f.text(380, y + 21, outcome, { size: 11, serif: true, hue: 'rose' });
    if (index < questions.length - 1) f.arrow([170, y + 34], [170, y + 57], { style: 'call' });
  });
  const y = 20 + questions.length * 58;
  f.arrow([170, y - 24], [170, y + 1], { style: 'call', label: "是" });
  f.box({ x: 20, y: y + 2, w: 300, h: 40, hue: 'olive', title: "在自己的服务验证机制", titleSize: 12 });
});
