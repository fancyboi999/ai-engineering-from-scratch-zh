'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

function block(f, x, y, w, hue, head, lines) {
  const h = 26 + lines.length * 15 + 6;
  f.rect(x, y, w, h, { fill: color(`${hue}-fill`), stroke: color(`${hue}-ink`) });
  f.text(x + 10, y + 18, head, { size: 12, weight: 700, hue });
  lines.forEach((line, index) => f.text(x + 10, y + 36 + index * 15, line, { size: 11 }));
  return { x, y, w, h, cx: x + w / 2, bottom: y + h };
}

module.exports = figure('fig-5-2', {
  height: 500,
  title: "ResidualUnknown 与修订链",
  desc: "左为 compare_functions 在 _total 比较发生变化时记录的 unknown 第 1 次修订：unk_ ID 由 domain、question、scope digest、comparison scope 哈希生成；revision 1、前驱 null、status contradicted、severity medium、domain function-comparison；comparison scope 指定比较记录及五个变化维度；左档案和比较记录为支持证据，右档案为反对证据；要求 authority 为 artifact bytes、confidence 为 observed，推荐一次 analyze_function 探测，并有一个 mutation evidence ID。右侧为 update_unknown 的变化：expected_revision 1、revision 2、前次与本次修订摘要、status resolved 与 verified resolution，以及两个 mutation evidence ID。下方是每次变更写入的 mutation Evidence，provider 为 rea-unknown-registry。",
}, f => {
  f.kicker(20, 18, "compare_functions 调用 record_unknown");
  f.kicker(400, 18, 'update_unknown');
  const first = block(f, 20, 30, 330, 'amber', "ResidualUnknown，第 1 次修订", [
    "unknown_id: unk_ + domain 的 SHA-256，",
    "  question、scope_digest、comparison scope",
    'revision: 1',
    'previous_revision_digest: null',
    "revision_digest: 这些行的 SHA-256",
    "scope_digest: 当前打开目标的摘要",
    'question: Function comparison is changed',
    '  (comparison ev_40ba96d8)',
    'status: contradicted',
    'severity: medium',
    'domain: function-comparison',
    'comparison_conclusion_scope: ev_40ba96d8,',
    '  assembly, cfg, pseudocode, references,',
    '  strings_names',
    'supporting_evidence_ids: ev_a1fe53ff,',
    '  ev_40ba96d8',
    'contradicting_evidence_ids: ev_bfe3275b',
    'required_authority: the artifact bytes',
    'required_confidence: observed',
    'recommended_probes: analyze_function',
    'relationships: [], resolution: null',
    "mutation_evidence_ids: 1 条 registry 记录",
  ]);
  const second = block(f, 400, 30, 220, 'amber', "update_unknown 之后", [
    'expected_revision: 1',
    'revision: 2',
    'previous_revision_digest:',
    "  第 1 次修订的摘要",
    "revision_digest: 新摘要",
    'status: resolved',
    'resolution: verified,',
    '  rationale, evidence_ids',
    'mutation_evidence_ids: 2',
    "不变：unknown_id，",
    "  question、domain，",
    "  scope_digest、comparison scope",
  ]);
  f.arrow([first.x + first.w, 120], [second.x - 1, 120], { style: 'state', label: 'update' });
  const mutation = f.box({ x: 20, y: 432, w: 600, h: 56, hue: 'teal', title: "Mutation Evidence：provider rea-unknown-registry，版本 1", sub: ["predicate rea.residual-unknown-mutation、confidence derived、authority analyst-inference", "限制：Registry mutation evidence 记录分析者意图，不是答案证明。"] });
  f.arrow([110, first.bottom], [110, mutation.y - 1], { style: 'write' });
  f.arrow([510, second.bottom], [510, mutation.y - 1], { style: 'write', label: "新增一条记录" });
})
  // 保留冻结背景几何，只替换最终 SVG 中的完整文字节点。
  .replace(">update</text>", ">更新</text>");
