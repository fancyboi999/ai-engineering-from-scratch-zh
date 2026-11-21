'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-1', {
  height: 300,
  title: '同一超步中对同一个键的两次写入',
  desc: '两栏。左栏：同一超步中的三个 write_joke 任务各向键 jokes 写入一个笑话，该键的 reducer 是 operator.add，状态最终包含关于 cats、dogs 和 owls 的三个笑话。右栏：节点 a 和 b 都写入没有 reducer 的键 value，运行在键 value 处抛出 InvalidUpdateError，因为该键每个超步只能接收一个值。',
}, f => {
  f.kicker(20, 18, 'jokes，reducer 为 operator.add');
  f.kicker(352, 18, 'value，无 reducer');
  f.rule(336, 8, 336, 262, { dash: 'dashed' });
  ['cats', 'dogs', 'owls'].forEach((subject, i) => {
    const x = 20 + i * 104;
    f.box({ x, y: 32, w: 96, h: 46, hue: 'indigo', title: 'write_joke', sub: `jokes: [${subject}]`, titleSize: 11.5, pad: 6 });
    f.path(`M${x + 48} 78 V96 H156 V112`, { style: 'write', head: i === 1 });
  });
  f.box({ x: 20, y: 114, w: 296, h: 44, hue: 'indigo', title: 'operator.add', sub: '合并同一超步的三个更新' });
  f.arrow([168, 158], [168, 189], { style: 'write' });
  f.box({ x: 20, y: 190, w: 296, h: 60, hue: 'teal', title: '状态：jokes，共 3 项', sub: ['关于 cats 的笑话', '关于 dogs、owls 的笑话'] });
  [['a', '"a"'], ['b', '"b"']].forEach(([node, value], i) => {
    const x = 352 + i * 140;
    f.box({ x, y: 32, w: 128, h: 46, hue: 'indigo', title: `节点 ${node}`, sub: `value: ${value}`, titleSize: 11.5, pad: 6 });
    f.path(`M${x + 64} 78 V96 H486 V112`, { style: 'fail', head: i === 0 });
  });
  f.box({ x: 352, y: 114, w: 268, h: 44, hue: 'grey', title: '无 reducer', sub: 'LastValue 每超步只收一次写入' });
  f.arrow([486, 158], [486, 189], { style: 'fail' });
  f.box({ x: 352, y: 190, w: 268, h: 60, hue: 'rose', title: 'InvalidUpdateError', sub: ["At key 'value': Can receive", 'only one value per step.'] });
  f.text(20, 282, '两张图，都在同一超步内向同一个键并行写入。只有一个键有 reducer。', { size: 11, serif: true, hue: 'ink-soft' });
});
