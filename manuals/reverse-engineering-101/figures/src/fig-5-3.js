'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-5-3', {
  height: 262,
  title: "三个空列表分别证明什么",
  desc: "三列对比。A：_percent_change 档案的 callees 为空数组、relationship coverage complete，表示返回全部已解析调用引用，因此未观察到已解析被调函数，但未证明运行时不存在调用。B：export_evidence_bundle 报告零 unknown，因为没有调用 record_unknown，表示未写下问题，不表示没有问题。C：rea compare 列出 right_evidence_ids 为空的记录，将其作为未解决分支分类为 unknown，因为 bundle 无完整性标记；因此仅能确定记录只在一份 bundle 中，不能断言已移除。",
}, f => {
  const columns = [
    { x: 20, kicker: "A · analyze_function", top: { title: '"callees": []', sub: 'ev_b492c85e' }, middle: { title: "coverage: complete", sub: ["返回所有已解析", "调用引用"] }, bottom: { title: "未见已解析被调函数", sub: "未证明运行时无调用" } },
    { x: 225, kicker: "B · Bundle 导出", top: { title: '"unknowns": 0', sub: "10-mcp-14，bundle O1" }, middle: { title: "未调用 record_unknown", sub: ["会话尚无", "ResidualUnknown"] }, bottom: { title: "未写下问题", sub: "仍可能存在问题" } },
    { x: 430, kicker: "C · rea compare", top: { title: '"right_evidence_ids": []', sub: "bundle O1 的一条记录", titleSize: 11 }, middle: { title: 'classification: unknown', sub: ["unresolved_branch，无", "完整性标记"] }, bottom: { title: "仅在一份 bundle 中", sub: "不能断言已移除" } },
  ];
  columns.forEach(column => {
    f.kicker(column.x, 18, column.kicker);
    f.box({ x: column.x, y: 28, w: 190, h: 52, hue: 'grey', title: column.top.title, titleSize: column.top.titleSize, sub: column.top.sub });
    f.arrow([column.x + 95, 80], [column.x + 95, 105], { style: 'call' });
    f.box({ x: column.x, y: 106, w: 190, h: 60, hue: 'amber', title: column.middle.title, titleSize: 11.5, sub: column.middle.sub });
    f.arrow([column.x + 95, 166], [column.x + 95, 191], { style: 'state' });
    f.box({ x: column.x, y: 192, w: 190, h: 52, hue: 'grey', dash: 'dashed', title: column.bottom.title, titleSize: 11.5, sub: column.bottom.sub });
  });
});
