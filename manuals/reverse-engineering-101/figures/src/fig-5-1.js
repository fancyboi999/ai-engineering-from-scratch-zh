'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const rows = [
  ['evidence_id', 'ev_b492c85eb9570bd5f8e8', "实线行的 SHA-256", true],
  ['subject.name', 'ledger-arm64-O1', "仅显示，不参与哈希", false],
  ['subject.digest.sha256', '01b5d08b08fb94678be5', "所分析字节的身份", true],
  ['subject.format', 'mach-o', null, true],
  ['subject.architecture', 'arm64', null, true],
  ['subject.local_path', '$CAPTURE/fixtures/ledger-arm64-O1', "仅显示，不参与哈希", false],
  ['provider', 'ghidra, Ghidra, 12.1.4', "引擎及版本", true],
  ['analysis_profile', "摘要 3fc72c9b4b78498fb9", "已提交的 Ghidra 设置", true],
  ['predicate_type', 'rea.analysis', null, true],
  ['operation', 'analyze_function', null, true],
  ['parameters', '{"procedure": "_percent_change"}', "完整调用者输入", true],
  ['raw_result', "对象：Ghidra 报告", "Provider 格式，或 null", true],
  ['normalized_result', "对象：档案，16 键", "Agent 读取的内容", true],
  ['confidence', 'observed', "observed、derived 或 inferred", true],
  ['authority', "Artifact 字节", "五类来源之一", true],
  ['environment', 'null', null, true],
  ['limitations', "10 个字符串", "与主张一并完整保留", true],
  ['relationship_coverage', 'complete', "即使 null 也计入哈希", true],
  ['locations', '[]', null, true],
  ['evidence_links', '[]', "本记录所依据的 ev_ ID", true],
];

module.exports = figure('fig-5-1', {
  height: 534,
  title: "一条 Evidence 记录的十六个字段",
  desc: "ledger-arm64-O1 的 _percent_change analyze_function 记录 ev_b492c85eb9570bd5f8e8，每字段一行，列出捕获值：subject 摘要、格式、架构，Ghidra 12.1.4 provider，analysis profile 摘要，predicate type、operation、parameters、raw 与 normalized result、confidence observed、作为 authority 的 artifact bytes、null environment、十条 limitations、complete relationship coverage，以及空 locations 和 links。subject.name 与 subject.local_path 两行用虚线，因为 evidence ID 对其余各行做哈希，不包含这两行。",
}, f => {
  f.kicker(20, 18, 'ev_b492c85eb957, analyze_function _percent_change');
  f.kicker(440, 18, "字段说明");
  f.box({ x: 20, y: 26, w: 400, h: 26, hue: 'teal', title: "Evidence 记录，16 字段，严格 schema", align: 'left', titleSize: 11.5, pad: 10 });
  rows.forEach(([field, value, note, hashed], index) => {
    const y = 52 + index * 22;
    f.rect(20, y, 400, 22, { fill: color('paper'), stroke: hashed ? color('panel-edge') : color('ink-mute'), dash: hashed ? undefined : 'dashed' });
    f.text(30, y + 15, field, { size: 11, hue: 'ink-soft' });
    f.text(180, y + 15, value, { size: 11 });
    if (note) {
      f.rule(420, y + 11, 434, y + 11, { hue: hashed ? 'teal' : 'ink-mute', dash: hashed ? undefined : 'dashed' });
      f.text(440, y + 15, note, { size: 11, serif: true, hue: 'ink-soft' });
    }
  });
  f.text(20, 516, "实线行计入 ID 哈希，虚线行为显示字段；摘要只展示开头十六进制。", { size: 11, serif: true, hue: 'ink-soft' });
});
