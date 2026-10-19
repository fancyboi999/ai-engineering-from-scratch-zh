'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { title: 'agent', sub: 're101-capture', hue: 'plum' },
  { title: 'rea mcp', sub: "服务 6.7.0", hue: 'indigo' },
  { title: "会话", sub: 'BinarySession', hue: 'blue' },
  { title: "客户端", sub: 'GhidraClient', hue: 'violet' },
  { title: 'Ghidra', sub: "无界面 JVM", hue: 'violet' },
  { title: 'bundle-O1', sub: "文件", hue: 'teal' },
  { title: 'model', sub: "未录制", hue: 'plum' },
];
const cx = index => 52 + index * 89;

const rows = [
  [0, 1, 'call', 'tools/call open_binary', "调用 · 墨色实线", 125],
  [1, 0, 'reply', 'mach-o, executable, arm64', "回复 · 墨色虚线", 125],
  [0, 1, 'call', 'analyze_function', "过程 _percent_change · 调用", 125],
  [2, 4, 'effect', "启动 java AnalyzeHeadless", "外部副作用 · 橄榄色虚线"],
  [4, 3, 'state', 'analysis_complete: true', "状态变化 · 琥珀色虚线"],
  [1, 0, 'event', 'MCP tool execution completed', "stderr 事件 · 靛蓝点线", 125],
  [1, 5, 'write', "导出 178629 字节、8 条记录", "持久写入 · 蓝绿色实线"],
  [1, 0, 'fail', 'invalid_request: _nothing', "失败 · 玫红虚线", 125],
  [0, 6, 'model', "发现引用 ev_b492c85e", "模型调用 · 梅紫实线"],
];

module.exports = figure('fig-0-1', {
  height: 500,
  title: "如何阅读本手册时序图",
  desc: "七条生命线：捕获工具的 agent、rea MCP 服务 6.7.0、BinarySession、GhidraClient、无界面 Ghidra JVM、导出的 bundle 文件、agent 的模型。九个编号行使用八种箭头：tools/call open_binary 用墨色实线表示调用；mach-o executable arm64 回答用墨色虚线表示回复；_percent_change 的 analyze_function 为调用；启动 java AnalyzeHeadless 用橄榄色虚线表示外部副作用；analysis_complete true 用琥珀色虚线表示状态变化；stderr 日志 MCP tool execution completed 用靛蓝点线表示事件；导出 178629 字节、8 条记录用蓝绿色实线表示持久写入；_nothing 的 invalid_request 用玫红虚线表示失败；引用 ev_b492c85e 的发现用梅紫实线表示模型调用。",
}, f => {
  lanes.forEach((lane, index) => {
    f.box({ x: cx(index), y: 8, w: 86, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11, anchor: 'middle', pad: 3 });
    f.lifeline(cx(index), 48, 492);
  });
  rows.forEach(([from, to, style, label, note, labelX], index) => {
    const y = 84 + index * 46;
    f.beat(index + 1);
    f.step(16, y, index + 1, { hue: style === 'fail' ? 'rose' : undefined });
    const x1 = cx(from);
    const x2 = cx(to);
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX });
  });
});
