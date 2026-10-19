'use strict';

const { figure } = require('../../../_shared/figkit.js');

const columns = [
  {
    x: 20,
    hue: 'amber',
    dash: undefined,
    claims: [
      ['percent-change-pseudocode', 'status pass, observed_status unchanged'],
      ['percent-change-assembly', 'status pass, observed_status unchanged'],
    ],
    comparison: ['compare_functions ev_2161e17a', ['left ev_b492c85e (ledger-arm64-O1)', 'right ev_142cc943 (ledger-arm64-O2)']],
    tail: { hue: 'grey', title: "主张范围内没有 unknown", sub: "其 unknown 仅涉及 overall 与 references", style: 'reply', label: "unknown_ids 为空" },
  },
  {
    x: 330,
    hue: 'rose',
    dash: 'dashed',
    claims: [
      ['total-pseudocode', 'status fail, observed_status changed'],
      ['total-assembly', 'status fail, observed_status changed'],
    ],
    comparison: ['compare_functions ev_40ba96d8', ['left ev_a1fe53ff (ledger-arm64-O1)', 'right ev_bfe3275b (ledger-arm64-O2)']],
    tail: { hue: 'rose', title: 'unk_823f4184', sub: "函数比较发生变化（medium）", style: 'fail', label: 'unknown_ids' },
  },
];

module.exports = figure('fig-7-1', {
  height: 392,
  title: "两条比较记录上的四个主张",
  desc: "树顶验证记录 ev_ccbaea4b 为 status fail，两个主张通过、两个失败。左列为 percent_change 的 pseudocode 与 assembly 两主张，均 pass、observed_status unchanged，指向 ev_2161e17a；其左侧为 ledger-arm64-O1 的 ev_b492c85e，右侧为 ledger-arm64-O2 的 ev_142cc943。该比较的 references 为 unknown，残留 unknown 仅指向 overall 与 references，因此两个主张都不列它。右列为 total 两主张，均 fail、observed_status changed，指向 ev_40ba96d8，左右为 ev_a1fe53ff 与 ev_bfe3275b，并记录残留 unknown unk_823f4184：Function comparison is changed。",
}, f => {
  const top = f.box({ x: 150, y: 14, w: 340, h: 48, hue: 'blue', title: 'verify_reconstruction ev_ccbaea4b', sub: "status fail：2 通过、2 失败、0 unknown" });
  for (const column of columns) {
    const cx = column.x + 145;
    f.arrow(top.bottom(), [cx, 99], { style: 'call' });
    column.claims.forEach(([title, sub], index) => {
      f.box({ x: column.x, y: 100 + index * 52, w: 290, h: 44, hue: column.hue, dash: column.dash, title, sub, titleSize: 12 });
    });
    f.arrow([cx, 196], [cx, 235], { style: 'call', label: 'comparison_evidence_id' });
    f.box({ x: column.x, y: 236, w: 290, h: 62, hue: 'teal', title: column.comparison[0], sub: column.comparison[1], titleSize: 12 });
    f.arrow([cx, 298], [cx, 333], { style: column.tail.style, label: column.tail.label });
    f.box({ x: column.x, y: 334, w: 290, h: 44, hue: column.tail.hue, dash: 'dashed', title: column.tail.title, sub: column.tail.sub, titleSize: 12 });
  }
});
