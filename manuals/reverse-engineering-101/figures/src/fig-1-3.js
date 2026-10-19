'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const rows = [
  ['evidence_id', "ev_ + 64 位十六进制", "语义内容的 SHA-256"],
  ['subject', 'ledger-arm64-O1, arm64', "mach-o，sha256 以 01b5d08b 开头"],
  ['provider', 'ghidra, Ghidra, 12.1.4', "回答问题的引擎"],
  ['analysis_profile', "摘要 3fc72c9b", "25 个契约参数，计算 hash"],
  ['predicate_type', 'rea.analysis', "默认标签"],
  ['operation', 'analyze_function', "rea function 对应的 MCP 名称"],
  ['parameters', 'procedure _percent_change', "身份的一部分"],
  ['raw_result', 'value, limitations', "provider 原生档案"],
  ['normalized_result', "档案", "过程、伪代码、汇编、基本块"],
  ['confidence', 'observed', "或 derived，或 inferred"],
  ['authority', "磁盘文件", "五种权威来源之一"],
  ['environment', 'null', "未执行任何目标"],
  ['limitations', "十条字符串", "四条会话、五条档案、一条 macOS"],
  ['relationship_coverage', 'complete', "一条调用引用诊断"],
  ['locations', '[]', "此操作没有"],
  ['evidence_links', '[]', "没有父记录"],
];

module.exports = figure('fig-1-3', {
  height: 478,
  title: "一条 Evidence 记录的 16 个字段",
  desc: "_percent_change 的 analyze_function Evidence 记录，以 16 字段表格展示捕获值，右侧附注。evidence_id 为 ev_ 加 64 位十六进制，是语义内容的 SHA-256。subject 为 ledger-arm64-O1、mach-o、arm64，带 sha256 01b5d08b08fb 和 local_path。provider 为 ghidra、Ghidra、12.1.4。analysis_profile 有 25 参数，摘要 3fc72c9b。predicate_type 为 rea.analysis，operation 为 analyze_function，parameters 为过程 _percent_change。raw_result 含 value、limitations；normalized_result 是含过程、伪代码、汇编和块的档案。confidence 为 observed，authority 表示静态读取磁盘文件，environment 为 null，limitations 有十条字符串，relationship_coverage 为 complete 并带一条调用引用诊断，locations、evidence_links 为空。",
}, f => {
  f.kicker(20, 18, "一条 Evidence 记录");
  f.kicker(396, 18, "字段内容");
  f.box({ x: 20, y: 26, w: 360, h: 28, hue: 'teal', title: "analyze_function 的 Evidence ev_b492c85e", align: 'left', titleSize: 11, pad: 10 });
  rows.forEach(([field, value, note], index) => {
    const y = 54 + index * 26;
    f.rect(20, y, 360, 26, { fill: color('paper'), stroke: color('panel-edge') });
    f.text(30, y + 17, field, { size: 12, hue: 'ink-soft' });
    f.text(188, y + 17, value, { size: 12 });
    f.rule(380, y + 13, 390, y + 13, { hue: 'teal' });
    f.text(396, y + 17, note, { size: 11, serif: true, hue: 'ink-soft' });
  });
});
