'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const block = [
  ['provider.id', 'ghidra', "此块的引擎"],
  ['shared_limitations', "四条字符串", "适用于全部组"],
];
const rows = [
  ['operations', "一个名称", 'analyze_function'],
  ['effects', 'launches_process,', "为真的两个标志"],
  ['', 'may_write_filesystem', "其余五个标志为假"],
  ['limitations', "五条字符串", "接在四条共享字符串之后"],
  ['available', 'true', "为假时携带原因与代码"],
  ['reason', 'null', "available 为假时的文本"],
  ['availability_code', 'null', "available 为假时的代码"],
];

module.exports = figure('fig-2-3', {
  height: 356,
  title: "ghidra 下 analyze_function 能力组",
  desc: "rea capabilities 的 ghidra 候选中，analyze_function 能力组展示为两张表。首表为 provider 块：provider.id 为 ghidra，shared_limitations 有四条字符串，适用于块内所有组。第二表为组：operations 仅含 analyze_function；effects 指定 launches_process、may_write_filesystem 两个真标志，其余五个为假；limitations 的五条字符串接在四条共享限制之后；available 为真；reason、availability_code 为 null。",
}, f => {
  f.kicker(20, 18, "provider 块");
  f.kicker(396, 18, "值的含义");
  f.box({ x: 20, y: 26, w: 360, h: 28, hue: 'violet', title: 'analysis_provider_candidates[0].capabilities[0]', align: 'left', titleSize: 11, pad: 10 });
  const line = (field, value, note, y) => {
    f.rect(20, y, 360, 26, { fill: color('paper'), stroke: color('panel-edge') });
    if (field) f.text(30, y + 17, field, { size: 12, hue: 'ink-soft' });
    f.text(200, y + 17, value, { size: 12 });
    f.rule(380, y + 13, 390, y + 13, { hue: 'violet' });
    f.text(396, y + 17, note, { size: 11, serif: true, hue: 'ink-soft' });
  };
  block.forEach(([field, value, note], index) => line(field, value, note, 54 + index * 26));
  f.kicker(20, 132, "块中的一个组");
  f.box({ x: 20, y: 140, w: 360, h: 28, hue: 'violet', title: 'groups[2]', align: 'left', titleSize: 11, pad: 10 });
  rows.forEach(([field, value, note], index) => line(field, value, note, 168 + index * 26));
});
