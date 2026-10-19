'use strict';

const { figure } = require('../../../_shared/figkit.js');

const calls = [
  { title: 'list_procedures', sub: '6,349 ms', evidence: 'ev_3c6350b2', found: "13 过程" },
  { title: 'list_strings', sub: '6 ms', evidence: 'ev_ad37f574', found: "39 字符串，F 至 A" },
  { title: 'analyze_function', sub: '_grade, 16 ms', evidence: 'ev_41e8ca1c', found: "15 指令" },
  { title: 'analyze_function', sub: '_grade_label, 18 ms', evidence: 'ev_b201cfd0', found: "命名 _labels" },
];

module.exports = figure('fig-8-3', {
  height: 378,
  title: "从一个问题到账本",
  desc: "自上而下流程。梅紫色问题：ledger 对分数 95 打印什么，字母来自哪里。四个靛蓝 MCP 调用：list_procedures 6,349 ms、list_strings 6 ms、analyze_function _grade 16 ms、analyze_function _grade_label 18 ms。四条青绿 Evidence：ev_3c6350b2 有十三过程，ev_ad37f574 有 F 到 A 共 39 字符串，ev_41e8ca1c 有十五指令且无 caller，ev_b201cfd0 命名 _labels 与 DAT_1000007e8。琥珀账本每主张一行：observed 5、derived 2、inferred 1、unknown 1、refused 1。灰色答案仍 unknown，直到在 0x1000007d0 与 0x1000007e8 运行 read_bytes。",
}, f => {
  const question = f.box({ x: 20, y: 14, w: 600, h: 44, hue: 'plum', title: "问题", sub: "95 分时 ledger 打印什么，字母来自哪里？" });
  calls.forEach((call, index) => {
    const x = 20 + index * 150;
    const cx = x + 73;
    f.arrow(question.bottom(), [cx, 89], { style: 'call' });
    f.box({ x, y: 90, w: 146, h: 44, hue: 'indigo', title: call.title, sub: call.sub, titleSize: 11 });
    f.arrow([cx, 134], [cx, 165], { style: 'reply' });
    f.box({ x, y: 166, w: 146, h: 44, hue: 'teal', title: call.evidence, sub: call.found, titleSize: 11 });
    f.arrow([cx, 210], [cx, 243], { style: 'write' });
  });
  const ledger = f.box({ x: 20, y: 244, w: 600, h: 44, hue: 'amber', title: "账本，每主张一行", sub: 'observed 5, derived 2, inferred 1, unknown 1, refused 1' });
  f.arrow(ledger.bottom(), [320, 319], { style: 'reply', label: "当前答案" });
  f.box({ x: 20, y: 320, w: 600, h: 44, hue: 'grey', dash: 'dashed', title: "答案", sub: "在 0x1000007d0 与 0x1000007e8 执行 read_bytes 前仍 unknown" });
});
