'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const rows = [
  ['procedure', '_grade 0x100000518', "入口、分类、函数体 60 B"],
  ['pseudocode', "一个字符串", "反编译文本，compilable false"],
  ['assembly', "15 行", "Listing 文本，地址在前"],
  ['comments', '[]', "入口处数据库注释"],
  ['callers', '[]', "仅已解析调用者"],
  ['callees', '[]', "仅已解析被调函数"],
  ['incoming_references', '1 DATA', "来自 0x10000811a，无所属过程"],
  ['outgoing_references', '2', "CONDITIONAL_JUMP、DATA 读取"],
  ['unresolved_calls', '[]', "目标未知的调用"],
  ['referenced_strings', '[]', "函数体到达的字符串"],
  ['referenced_names', '2', 'LAB_10000054c, DAT_1000007d0'],
  ['basic_blocks', '3', "仅函数体内后继"],
  ['native_api', "__cdecl，默认", "签名事实，jump_tables []"],
  ['native_value_flow', "14 操作、12 边", "High p-code，truncated false"],
  ['facet_availability', "8 侧面，available", "每个侧面是否已观察"],
  ['limitations', "记录中 4 + 10 条", "另有 native_api 3 条、value flow 5 条"],
];

module.exports = figure('fig-4-8', {
  height: 444,
  title: "_grade 档案的十六个侧面",
  desc: "表格列出 _grade 的 analyze_function 记录中 normalized_result 的十六个键：procedure、pseudocode、assembly、comments、callers、callees、incoming_references、outgoing_references、unresolved_calls、referenced_strings、referenced_names、basic_blocks、native_api、native_value_flow、facet_availability、limitations，并列各键在 _grade 中的值与内容说明。",
}, f => {
  f.kicker(20, 18, "侧面");
  f.kicker(200, 18, "对 _grade");
  f.kicker(380, 18, "内容");
  f.box({ x: 20, y: 26, w: 600, h: 26, hue: 'teal', title: "Evidence ev_41e8ca1c · analyze_function · observed", align: 'left', titleSize: 12 });
  rows.forEach(([field, value, note], index) => {
    const y = 52 + index * 24;
    f.rect(20, y, 600, 24, { fill: color('paper'), stroke: color('panel-edge') });
    f.text(32, y + 16, field, { size: 11.5, hue: 'ink-soft' });
    f.text(200, y + 16, value, { size: 11.5 });
    f.rule(360, y + 12, 372, y + 12, { hue: 'violet' });
    f.text(380, y + 16, note, { size: 11, serif: true, hue: 'ink-soft' });
  });
});
