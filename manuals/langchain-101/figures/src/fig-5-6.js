'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  ['tuple', '(1, 2)', 'list', '[1, 2]', 'amber'],
  ['元组的 set', '{(1, 2), (3, 4)}', 'list 的 list', '[[1, 2], [3, 4]]', 'amber'],
  ['元组的 frozenset', 'frozenset({(1, 2)})', 'list 的 list', '[[1, 2]]', 'amber'],
  ['defaultdict', "{'k': [1]}", 'dict', '没有 default factory', 'amber'],
  ['Counter', "Counter('abca')", 'dict', '没有 Counter 的方法', 'amber'],
  ['OrderedDict', '两个键', 'dict', '键和顺序不变', 'amber'],
  ['datetime, ZoneInfo', 'Asia/Kolkata', 'datetime，固定偏移', '+05:30，没有时区规则', 'amber'],
  ['datetime, fold=1', 'America/New_York', 'datetime，固定偏移', 'fold 为 0，不相等', 'amber'],
  ['普通类', 'Plain(3)', 'TypeError', 'not msgpack serializable', 'rose'],
];

module.exports = figure('fig-5-6', {
  height: 470,
  title: '九种值经过检查点后取回的样子',
  desc: '九行，每行从左侧放入状态的值，指向右侧 SqliteSaver 上 get_state 取回的结果。tuple 取回后变成 list。由元组组成的 set 和 frozenset 取回后变成 list 的 list。defaultdict、Counter 和 OrderedDict 取回后都变成普通 dict。带 ZoneInfo 时区的 datetime 取回后变成固定偏移，fold 为 1 的丢失了 fold。普通类的实例抛出 TypeError，没有被保存。',
}, f => {
  f.kicker(20, 20, '放入状态的值');
  f.kicker(372, 20, 'get_state 取回的结果');
  rows.forEach(([kind, example, result, after, hue], i) => {
    const y = 32 + i * 46;
    const left = f.box({ x: 20, y, w: 250, h: 38, hue: 'violet', title: kind, sub: example, align: 'left', titleSize: 12, pad: 10 });
    const right = f.box({ x: 372, y, w: 248, h: 38, hue, title: result, sub: after, align: 'left', titleSize: 12, pad: 10 });
    f.arrow(left.right(), [right.x - 1, left.cy], { style: hue === 'rose' ? 'fail' : 'reply' });
  });
  f.text(20, 460, '另外二十种值取回后类型和值都不变。在 Mac 上，各运行一次。', { size: 11, serif: true, hue: 'ink-soft' });
});
