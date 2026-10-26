'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const left = [
  ['identity', '摘要哈希相同', 'unchanged'],
  ['pseudocode', '272 至 272', 'unchanged'],
  ['assembly', '161 至 161', 'unchanged'],
  ['comments', '0 至 0', 'unchanged'],
  ['calls', '1 至 1', 'unchanged'],
  ['references', '3 至 3', 'unknown'],
  ['strings_names', '1 至 1', 'unchanged'],
  ['cfg', '3 至 3', 'unchanged'],
];
const right = [
  ['identity', '摘要哈希相同', 'unchanged'],
  ['pseudocode', '300 至 2904', 'changed'],
  ['assembly', '336 至 1866', 'changed'],
  ['comments', '0 至 0', 'unchanged'],
  ['calls', '1 至 1', 'unchanged'],
  ['references', '4 至 13', 'changed'],
  ['strings_names', '2 至 11', 'changed'],
  ['cfg', '5 至 16', 'changed'],
];

function column(f, x, kicker, head, hue, dash, rows) {
  f.kicker(x, 18, kicker);
  f.box({ x, y: 26, w: 290, h: 26, hue, dash, title: head, align: 'left', titleSize: 11.5, pad: 10 });
  rows.forEach(([dimension, counts, status], index) => {
    const y = 52 + index * 24;
    const changed = status === 'changed';
    const unknown = status === 'unknown';
    let stroke = color('panel-edge');
    if (changed) stroke = color('amber-ink');
    if (unknown) stroke = color('ink-mute');
    f.rect(x, y, 290, 24, { fill: changed ? color('amber-fill') : color('paper'), stroke, dash: unknown ? 'dashed' : undefined });
    f.text(x + 10, y + 16, dimension, { size: 11 });
    f.text(x + 120, y + 16, counts, { size: 11, hue: 'ink-soft' });
    f.text(x + 215, y + 16, status, { size: 11, weight: changed || unknown ? 700 : undefined, hue: changed ? 'amber' : 'ink-soft' });
  });
}

module.exports = figure('fig-5-6', {
  height: 300,
  title: "比较 -O1 与 -O2 构建中的两个函数",
  desc: "两表各八个比较维度。左侧 _percent_change：identity、pseudocode 272 对 272 码点、assembly 161 对 161、comments 0 对 0、calls 1 对 1、strings_names 1 对 1、cfg 3 对 3 均 unchanged；references 3 对 3 为 unknown，因为未命名引用端点在两个不同 artifact 间没有稳定身份，因此整体 status unknown。右侧 _total：identity、comments、calls 未变，pseudocode 从 300 增至 2904 码点、assembly 336 至 1866、references 4 至 13、strings_names 2 至 11、cfg 5 至 16 基本块，因此五维 changed，整体 status changed。注释说明 references 为何 unknown。",
}, f => {
  column(f, 20, "A · _percent_change，-O1 对 -O2", "status unknown：7 unchanged，1 unknown", 'grey', 'dashed', left);
  column(f, 330, "B · _total，-O1 对 -O2", "status changed，8 维中 5 维", 'amber', undefined, right);
  f.text(20, 268, "两个文本维度按码点计数，其余按条目计数。", { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 284, "虚线行为 unknown：未命名引用端点在两个 artifact 间没有稳定身份。", { size: 11, serif: true, hue: 'ink-soft' });
});
