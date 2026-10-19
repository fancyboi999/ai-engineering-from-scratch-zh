'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { x: 110, name: 'AGENT', hue: 'plum' },
  { x: 260, name: 'REA MCP', hue: 'blue' },
  { x: 410, name: "GHIDRA 客户端", hue: 'violet' },
  { x: 560, name: "JAVA 桥接器", hue: 'violet' },
];
const rows = [
  [0, 1, 'call', 'open_binary', "就绪检查约 1.6 s，尚未导入"],
  [1, 0, 'reply', "mach-o 可执行文件 arm64", null],
  [0, 1, 'call', 'list_procedures', null],
  [1, 2, 'call', 'start()', "rea-ghidra-* 根目录、bridge.sock"],
  [2, 3, 'call', 'AnalyzeHeadless -import', '-readOnly -deleteProject -postScript'],
  [3, 2, 'reply', 'ping ok', "analysis_complete true，已检查 token"],
  [2, 3, 'call', '{id, token, method, params}', "Socket 上一行 JSON"],
  [3, 2, 'reply', '{id, ok true, result}', "13 个函数，4 个外部函数"],
  [1, 0, 'reply', 'Evidence ev_3c6350b2', "5 至 7 s，导入加自动分析"],
  [0, 1, 'call', 'procedure_assembly _grade', "同一 socket 不足 100 ms"],
];

module.exports = figure('fig-4-1', {
  height: 486,
  title: "一次打开与通过 MCP 提问",
  desc: "四条生命线：agent、rea MCP 服务、rea 内的 Ghidra 客户端，以及 analyzeHeadless 内的 Java bridge。open_binary 在 provider 就绪检查后约 1.6 秒返回，此时尚未 headless 导入。list_procedures 触发客户端启动：私有运行根目录、Unix socket、目标的哈希副本，再以 AnalyzeHeadless、-import、-readOnly、-deleteProject 启动 java，随后 ping 握手，再发送一行 JSON 请求并收到一行响应。Evidence 在 5 至 7 秒后返回。同 socket 的 procedure_assembly 不足 100 ms。",
}, f => {
  for (const lane of lanes) {
    f.box({ x: lane.x, y: 10, w: 124, h: 30, hue: lane.hue, title: lane.name, titleSize: 12, anchor: 'middle' });
    f.lifeline(lane.x, 40, 470);
  }
  rows.forEach(([from, to, style, label, note], index) => {
    const y = 76 + index * 42;
    f.step(24, y, index + 1);
    const x1 = lanes[from].x;
    const x2 = lanes[to].x;
    const options = { style, label, labelX: (x1 + x2) / 2 };
    if (note) options.note = note;
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], options);
  });
});
