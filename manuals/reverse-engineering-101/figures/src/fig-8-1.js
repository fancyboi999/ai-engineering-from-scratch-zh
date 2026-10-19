'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 110, title: "客户端", sub: 're101-capture 1.0.0', hue: 'grey' },
  { x: 320, title: 'rea mcp', sub: 'rea-agents 6.7.0, stdio', hue: 'blue' },
  { x: 530, title: 'Ghidra 12.1.4', sub: "Headless，全新项目", hue: 'violet' },
];
const rows = [
  [0, 1, 'call', 'initialize', 'protocolVersion 2025-06-18'],
  [1, 0, 'reply', 'rea 6.7.0, tools, prompts', "给模型的指令"],
  [0, 1, 'call', 'tools/list', ''],
  [1, 0, 'reply', "207 个工具", '284 ms'],
  [0, 1, 'call', 'open_binary ledger-arm64-O1', 'provider_id ghidra'],
  [1, 0, 'reply', 'mach-o arm64, 1,632 ms', "已检查安装，尚未导入"],
  [0, 1, 'call', 'list_procedures', "首次由 Ghidra 支持的调用"],
  [1, 2, 'model', "导入、自动分析、桥接", "截止 330,000 ms"],
  [2, 1, 'reply', 'ready', "一个已导入 Program"],
  [1, 0, 'reply', "13 过程，6,349 ms", ''],
  [0, 1, 'call', 'procedure_assembly _grade', ''],
  [1, 0, 'reply', "15 指令，4 ms", "由当前会话提供"],
  [0, 1, 'call', 'close_binary', ''],
  [1, 2, 'effect', "关闭、删除项目", "已移除临时项目"],
  [1, 0, 'reply', 'result null, 491 ms', ''],
];

module.exports = figure('fig-8-1', {
  height: 666,
  title: "从 initialize 到 close_binary 的一次连接",
  desc: "三条生命线：捕获客户端 re101-capture 1.0.0、通过 stdio 的 rea-agents 6.7.0 所提供的 rea mcp，以及全新项目的 Ghidra 12.1.4 headless。十五次编号交互：initialize 带 protocolVersion 2025-06-18，响应 rea 6.7.0、tools、prompts；tools/list 在 284 ms 返回 207 工具；open_binary 打开 ledger-arm64-O1、provider_id ghidra，在安装检查后、任何导入前用 1,632 ms 回答 mach-o arm64；list_procedures 使 rea 在 330,000 ms deadline 下启动 Ghidra 导入、自动分析与 bridge，Ghidra 就绪后，6,349 ms 返回十三过程；procedure_assembly _grade 从会话在 4 ms 返回十五指令；close_binary 关闭 Ghidra、删除临时项目，491 ms 返回 result null。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x - 85, y: 8, w: 170, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 12 });
    f.lifeline(lane.x, 48, 658);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 80 + index * 38;
    f.beat(index + 1);
    f.step(16, y, index + 1, { hue: style === 'model' ? 'violet' : undefined });
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note: note || undefined });
  });
});
