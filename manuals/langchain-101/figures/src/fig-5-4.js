'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const text = fs.readFileSync(path.join(__dirname, '../../capture/out/33-store.txt'), 'utf8');
const after = (heading, from = 0) => {
  const at = text.indexOf('\n[', text.indexOf(heading, from)) + 1;
  return JSON.parse(text.slice(at, text.indexOf('\n]', at) + 2));
};
const namespaces = after('list_namespaces():');
const shallow = after('list_namespaces(max_depth=2):');
const found = after("search(('users', 'ada')):");
const filtered = after("search(('users',), filter=...):");
const items = [...found, ...filtered].map(([ns, key, value]) => ({ ns: ns.join('/'), key, value: value.text || value.value }));
const lab = JSON.parse(fs.readFileSync(path.join(__dirname, '../../capture/lab/summary/stores-mac.json'), 'utf8'));
const partial = Object.entries(lab.backends).filter(([, b]) => b.cases && "search(('users','ali')) partial label" in b.cases);
if (!partial.length || partial.some(([, b]) => b.cases["search(('users','ali')) partial label"].length)) throw new Error('fig-5-4: a partial label matched in the lab');

const users = [...new Set(namespaces.map(ns => ns[1]))];
const leaves = namespaces.map(ns => ({ user: ns[1], name: ns[2], path: ns.join('/') }));
const CX = { 'users/ada/memories': 112, 'users/ada/settings': 306, 'users/grace/memories': 520 };
const userX = user => {
  const xs = leaves.filter(l => l.user === user).map(l => CX[l.path]);
  return (Math.min(...xs) + Math.max(...xs)) / 2;
};

module.exports = figure('fig-5-4', {
  height: 388,
  title: '录制工具包 store 的命名空间',
  desc: `list_namespaces 返回的命名空间标签组成的树：users，其下是 ${users.join(' 和 ')}，再往下是 ${leaves.map(l => `${l.user} 下的 ${l.name}`).join('、')}。每个命名空间下面是它的条目，带键和值：${items.map(i => `${i.ns} 中的 ${i.key}“${i.value}”`).join('、')}。一块阴影区域覆盖 ada 及其两个命名空间：用前缀 users、ada 做的 search 返回了这 ${found.length} 个条目。第二行下方的虚线表示 max_depth 为 2 的 list_namespaces 在哪里停止，得到 ${shallow.length} 个命名空间。一条注释说明：像 ali 这样的部分标签，在实验记录里的 ${partial.length} 种 store 后端中都没有匹配到任何内容。`,
}, f => {
  const adaLeaves = leaves.filter(l => l.user === 'ada');
  const left = Math.min(...adaLeaves.map(l => CX[l.path])) - 100;
  const right = Math.max(...adaLeaves.map(l => CX[l.path])) + 100;
  f.rect(left, 82, right - left, 252, { fill: color('teal-fill'), stroke: color('teal-ink'), dash: 'dashed' });
  f.text(left + 10, 324, `search(('users', 'ada'))：${found.length} 个条目`, { size: 11.5, hue: 'teal', weight: 700 });

  const root = f.box({ x: 320, y: 12, w: 120, h: 30, hue: 'grey', title: 'users', anchor: 'middle', titleSize: 12 });
  const join = (from, to) => f.path(`M${from.cx} ${from.y + from.h} V${to.y - 10} H${to.cx} V${to.y - 1}`, { style: 'call', head: false });
  const userBox = {};
  users.forEach(user => {
    userBox[user] = f.box({ x: userX(user), y: 96, w: 120, h: 30, hue: 'violet', title: user, anchor: 'middle', titleSize: 12 });
    join(root, userBox[user]);
  });
  f.rule(20, 140, 620, 140, { hue: 'ink-mute', dash: 'dashed' });
  f.text(30, 153, `max_depth=2：${shallow.length} 个命名空间`, { size: 11, hue: 'ink-soft' });
  leaves.forEach(leaf => {
    const box = f.box({ x: CX[leaf.path], y: 168, w: 140, h: 30, hue: 'teal', title: leaf.name, anchor: 'middle', titleSize: 12 });
    join(userBox[leaf.user], box);
    items.filter(item => item.ns === leaf.path).forEach((item, k) => {
      const y = 216 + k * 36;
      if (!k) f.rule(CX[leaf.path], 198, CX[leaf.path], y, { hue: 'teal' });
      f.rect(CX[leaf.path] - 92, y, 184, 30, { fill: color('paper'), stroke: color('teal-ink') });
      f.text(CX[leaf.path] - 84, y + 13, `键 ${item.key}`, { size: 11, weight: 700, hue: 'teal' });
      f.text(CX[leaf.path] - 84, y + 26, item.value, { size: 11, serif: true, hue: 'ink-soft' });
    });
  });
  f.text(20, 362, `命名空间是由完整标签组成的元组。对 ('users', 'ali') 的搜索没有返回任何内容，`, { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 378, `实验记录里的 ${partial.length} 种后端都是如此，因为一个标签不会匹配另一个标签的一部分。`, { size: 11, serif: true, hue: 'ink-soft' });
});
