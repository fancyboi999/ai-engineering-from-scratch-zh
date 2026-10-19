'use strict';

const { figure } = require('../../../_shared/figkit.js');

const lanes = [
  { title: "你", sub: "读者", hue: 'grey' },
  { title: 'rea 6.7.0', sub: "独立 CLI", hue: 'blue' },
  { title: "会话", sub: 'BinarySession', hue: 'blue' },
  { title: "客户端", sub: 'GhidraClient', hue: 'violet' },
  { title: 'Ghidra JVM', sub: 'bridge.sock', hue: 'violet' },
  { title: "分析产物", sub: 'ledger-arm64-O1', hue: 'green' },
];
const cx = index => 60 + index * 104;

const rows = [
  [0, 1, 'call', 'rea function _percent_change', '--provider ghidra --format json', 125],
  [1, 2, 'call', 'runDirectAnalysis analyze_function', '{ procedure: _percent_change }'],
  [2, 5, 'call', "解析头部、SHA-256", "mach-o 魔数、64 KiB 分块"],
  [2, 3, 'state', "绑定 ghidra，选择来源 request", "配置摘要 3fc72c9b"],
  [3, 4, 'effect', 'java AnalyzeHeadless -import', "-readOnly -deleteProject，期限 330 秒"],
  [3, 5, 'call', "复制为 target-01b5d08b08fb.bin", "私有运行时根目录 rea-ghidra-*"],
  [4, 3, 'state', 'analysis_complete: true', "ping 握手，核对 run_id 与 token"],
  [3, 4, 'call', 'analyze_function', "bridge.sock 上一行 JSON"],
  [4, 3, 'reply', 'ok: true, result', "过程、伪代码、六条指令"],
  [3, 2, 'reply', 'Evidence ev_b492c85e', "confidence observed，十条限制"],
  [3, 4, 'call', 'shutdown', "删除项目，期限 10 秒"],
  [1, 0, 'reply', "stdout 输出 JSON，退出 0", "录制 Mac 耗时 7 到 9 秒", 125],
];

module.exports = figure('fig-1-2', {
  height: 604,
  title: "一次 rea function 运行的逐步过程",
  desc: "六条生命线：你、rea 6.7.0 独立 CLI、BinarySession、GhidraClient、bridge.sock 后的无界面 Ghidra JVM、产物 ledger-arm64-O1。十二个编号步骤：以 --provider ghidra --format json 调用 rea function _percent_change；runDirectAnalysis 对过程 _percent_change 运行 analyze_function；会话解析 Mach-O 头并按 64 KiB 分块计算 hash；以选择来源 request、配置摘要 3fc72c9b4b78498f 绑定 ghidra；客户端在 330 秒期限内以 -import、-readOnly、-deleteProject 启动 java AnalyzeHeadless；文件复制为私有运行时根目录的 target-01b5d08b08fb.bin；ping 核对 run_id 与 token 后返回 analysis_complete true；一行 JSON 请求 analyze_function；回复 ok true，含过程、伪代码和六条指令；客户端返回 confidence observed、十条限制的 Evidence ev_b492c85e；shutdown 在 10 秒内删除项目；7 到 9 秒后 JSON 到达 stdout，退出 0。",
}, f => {
  lanes.forEach((lane, index) => {
    f.box({ x: cx(index), y: 8, w: 100, h: 40, hue: lane.hue, title: lane.title, sub: lane.sub, titleSize: 11, anchor: 'middle', pad: 3 });
    f.lifeline(cx(index), 48, 596);
  });
  rows.forEach(([from, to, style, label, note, labelX], index) => {
    const y = 84 + index * 44;
    f.beat(index + 1);
    f.step(16, y, index + 1);
    const x1 = cx(from);
    const x2 = cx(to);
    f.arrow([x1, y], [x2 + (x2 > x1 ? -1 : 1), y], { style, label, note, labelX });
  });
});
