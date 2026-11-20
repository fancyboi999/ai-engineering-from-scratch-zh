'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/replay-fork-mac.json'));
const byId = Object.fromEntries(data.tree.map(node => [node.id, node]));
const children = id => data.tree.filter(node => node.parent === id);
const label = node => `步骤 ${node.step}，${node.source}`;
const sub = node => `x = ${node.x === null ? '无' : node.x}，next ${node.next.length ? node.next.join(', ') : '无'}`;

module.exports = figure('fig-6-6', {
  height: 400,
  title: '同一线程的三条分支',
  desc: `一个线程的 ${data.tree.length} 个检查点组成的树。首次运行保存了步骤 -1 到 3，x 从 none 到 3。在步骤 1 的检查点上（下一个节点是 b），重放增加了步骤 2 的 fork 检查点（x 为 1）和两个以 x 3 结束的 loop 检查点。在同一检查点上调用 update_state，增加了步骤 2 的 update 检查点（x 为 100），从它出发的运行以 x 102 结束。所有旧检查点都保留。`,
}, f => {
  const box = (node, cx, y, hue) => f.box({ x: cx, y, w: 176, h: 42, hue, title: label(node), sub: sub(node), anchor: 'middle', titleSize: 12 });
  const trunk = ['c0', 'c1', 'c2'];
  trunk.forEach((id, i) => {
    box(byId[id], 320, 12 + i * 60, 'teal');
    if (i) f.line(320, 12 + i * 60 - 18, 320, 12 + i * 60 - 1, { style: 'write' });
  });
  const branches = children('c2').sort((a, b) => ['loop', 'fork', 'update'].indexOf(a.source) - ['loop', 'fork', 'update'].indexOf(b.source));
  const xs = [112, 320, 528];
  const names = ['首次运行', '重放', 'update_state'];
  branches.forEach((head, i) => {
    f.path(`M320 ${12 + 2 * 60 + 42} V178 H${xs[i]} V${200 - 1}`, { style: 'write' });
    f.text(xs[i], 192, names[i], { size: 11, spacing: 1.2, hue: 'ink-mute', anchor: 'middle', knock: true });
    let node = head;
    let y = 200;
    while (node) {
      const hue = node.source === 'fork' ? 'amber' : node.source === 'update' ? 'violet' : 'teal';
      box(node, xs[i], y, hue);
      const next = children(node.id)[0];
      if (next) f.line(xs[i], y + 42, xs[i], y + 59, { style: 'write' });
      node = next;
      y += 60;
    }
  });
  f.text(20, 392, '每个方框是 Mac 上一次运行产生的一个检查点。旧检查点不会被删除。', { size: 11, serif: true, hue: 'ink-soft' });
});
