'use strict';

const { figure } = require('../../../_shared/figkit.js');

const gates = [
  ["合法副本", 'U.S.C. 1201(f)(1) · 2009/24/EC Art. 6(1)(a)'],
  ["法律规定的目的", "互操作、研究、纠错、测试"],
  ["没有其他途径取得事实", "1201(f)(1)、第 6(1)(b) 条、Sega：没有其他途径"],
  ["仅处理必要部分", "第 6(1)(c) 条 · C-13/20：限于必要程度"],
  ["最终使用自己的表达", "第 6(2)(c) 条、Sega、Connectix：不复制代码"],
];

module.exports = figure('fig-2-1', {
  height: 420,
  title: "第一条命令前的五个问题",
  desc: "左侧纵列五个问题，各附法律或判决：17 U.S.C. 1201(f)(1) 和 Directive 2009/24/EC 第 6(1)(a) 条要求合法副本；法律规定目的，如互操作、研究、纠错、获授权测试；1201(f)(1)、第 6(1)(b) 条和 Sega 要求没有其他途径取得事实；第 6(1)(c) 条和 C-13/20 要求仅处理必要部分；第 6(2)(c) 条、Sega 和 Connectix 要求最终使用自己的表达。各问题的玫红虚线指向“否：停止、先取得授权、README、免责声明”。最后问题的向下实线指向绿色框“五次都是：开始分析”，列出专为本手册编写的 ledger.c、ledger-main.c、js-app、ledger.wat。",
}, f => {
  f.kicker(20, 18, "依次回答五个问题");
  const stop = f.box({ x: 440, y: 26, w: 180, h: 300, hue: 'rose', dash: 'dashed', title: "否：停止", sub: ["先取得授权", "README，免责声明", "rea 不会询问"] });
  gates.forEach(([title, sub], index) => {
    const y = 26 + index * 64;
    const gate = f.box({ x: 20, y, w: 300, h: 44, hue: 'grey', title, sub, titleSize: 12, pad: 10 });
    f.arrow(gate.right(), [stop.x - 1, gate.cy], { style: 'fail', label: "否" });
    if (index < gates.length - 1) f.arrow(gate.bottom(), [gate.cx, y + 63], { style: 'call', label: "是" });
  });
  f.arrow([170, 326], [170, 349], { style: 'call', label: "是" });
  f.box({ x: 20, y: 350, w: 300, h: 56, hue: 'green', title: "五次都是：开始分析", sub: ['ledger.c, ledger-main.c, js-app, ledger.wat', "专为本手册编写"], titleSize: 12 });
});
