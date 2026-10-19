'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const columns = [
  { title: 'ghidra', sub: ["30 个操作", 'available'], hue: 'violet' },
  { title: 'hopper', sub: ["37 个操作", 'unavailable'], hue: 'grey' },
  { title: 'ida', sub: ["13 个操作", 'unavailable'], hue: 'grey' },
  { title: 'kuna', sub: ["13 个操作", 'unavailable'], hue: 'grey' },
  { title: 'target-free', sub: ["19 个操作", "无绑定"], hue: 'blue' },
];
const rows = [
  ['launches_process', ["30 / 30", "37 / 37", '0', "13 / 13", "12 / 19"]],
  ['may_write_filesystem', ["30 / 30", "6 / 37", '0', "13 / 13", "6 / 19"]],
  ['may_show_ui', ['0', "37 / 37", "4 / 13", '0', "2 / 19"]],
  ['may_access_network', ['0', '0', "13 / 13", '0', "2 / 19"]],
  ['mutates_artifact', ["3 / 30", "6 / 37", '0', '0', '0']],
  ['changes_permissions', ['0', '0', '0', '0', '0']],
  ['requires_root', ['0', '0', '0', '0', '0']],
];
const colX = index => 166 + index * 91;

module.exports = figure('fig-2-4', {
  height: 330,
  title: "捕获中各 provider 声明的副作用",
  desc: "表格五列分别为：可用 ghidra 的 30 个操作、不可用 hopper 的 37 个操作、不可用 ida 的 13 个操作、不可用 kuna 的 13 个操作，以及未绑定 provider 的 19 个无需目标操作。七行各对应一个副作用标志。launches_process 为真的数量依次为 30/30、37/37、0、13/13、12/19；may_write_filesystem 为 30/30、6/37、0、13/13、6/19；may_show_ui 为 0、37/37、4/13、0、2/19；may_access_network 为 0、0、13/13、0、2/19；mutates_artifact 为 3/30、6/37、0、0、0；changes_permissions、requires_root 全为假。",
}, f => {
  f.kicker(20, 18, "副作用标志");
  columns.forEach((column, index) => f.box({ x: colX(index), y: 26, w: 88, h: 56, titleSize: 12, pad: 4, ...column }));
  rows.forEach(([flag, values], row) => {
    const y = 92 + row * 32;
    f.rect(20, y, 142, 32, { fill: color('paper'), stroke: color('panel-edge') });
    f.text(26, y + 20, flag, { size: 11 });
    values.forEach((value, index) => {
      const zero = value === '0';
      f.rect(colX(index), y, 88, 32, { fill: zero ? color('paper') : color(`${columns[index].hue}-fill`), stroke: color('panel-edge') });
      f.text(colX(index) + 44, y + 20, value, { size: 12, anchor: 'middle', hue: zero ? 'ink-mute' : undefined });
    });
  });
});
