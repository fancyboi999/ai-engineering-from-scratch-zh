'use strict';

const fs = require('fs');
const path = require('path');
const { figure } = require('../../../_shared/figkit.js');

const text = fs.readFileSync(path.join(__dirname, '../../capture/out/36-subgraphs.txt'), 'utf8');
const objectAfter = heading => {
  const at = text.indexOf('{', text.indexOf(heading));
  return JSON.parse(text.slice(at, text.indexOf('\n}', at) + 2));
};
const prepared = objectAfter("## stream(subgraphs=True)").chunk.prepare.steps;
const waiting = objectAfter('## state while the subgraph waits')['subgraph values'].steps;
const final = objectAfter('## resume').steps;
const parent = final.slice(0, prepared.length);
const returned = final.slice(prepared.length, final.length - 1);
if (JSON.stringify(parent) !== JSON.stringify(prepared) || JSON.stringify(returned.slice(0, waiting.length)) !== JSON.stringify(waiting)) {
  throw new Error('fig-6-7: the final steps list is not the parent list plus the subgraph list');
}
const mark = list => list.map((step, i) => (i === 0 && step === parent[0] ? `${step}*` : step));
const rows = [
  ['prepare', 'outer', prepared],
  ['shout', 'inner', waiting],
  ['ask_ok', 'inner', returned],
  ['operator.add', '父图更新', [...parent, '+', ...mark(returned)]],
  ['finish', 'outer', [...parent, ...mark(returned), final[final.length - 1]]],
];

module.exports = figure('fig-6-7', {
  height: 380,
  title: '经过子图的 steps 列表',
  desc: '五行，自上而下，每行是一个节点及其执行后的 steps 列表。prepare 写入 outer.prepare。在子图 inner 的命名空间内，shout 添加 inner.shout，ask_ok 添加 inner.ask_ok=yes，所以子图返回三个条目。父图用 operator.add 把这个输出并入已含 outer.prepare 的列表，所以 outer.prepare 出现两次。finish 添加 outer.finish，最终列表有五个条目。',
}, f => {
  f.kicker(20, 18, '节点');
  f.kicker(128, 18, '节点之后的 steps 列表');
  f.rect(10, 92, 620, 126, { hue: 'indigo', dash: 'dashed', fill: 'none' });
  f.text(620, 210, '命名空间 inner:<uuid-1>', { size: 11, anchor: 'end', hue: 'indigo', serif: true });
  rows.forEach(([node, where, items], i) => {
    const y = 32 + i * 66;
    const hue = where === '父图更新' ? 'grey' : 'indigo';
    f.box({ x: 16, y, w: 100, h: 42, hue, title: node, sub: where, titleSize: 11.5, pad: 4 });
    if (i < rows.length - 1) f.arrow([66, y + 42], [66, y + 65], { style: 'call' });
    let x = 128;
    items.forEach(item => {
      if (item === '+') {
        f.text(x + 3, y + 26, '+', { size: 13, weight: 700, hue: 'ink-soft' });
        x += 16;
        return;
      }
      const copy = item.endsWith('*');
      const text = copy ? item.slice(0, -1) : item;
      const w = Math.ceil(text.length * 11 * 0.6) + 8;
      f.rect(x, y + 10, w, 24, { hue: copy ? 'rose' : 'teal' });
      f.text(x + 4, y + 26, text, { size: 11, hue: copy ? 'rose' : undefined });
      x += w + 6;
    });
  });
  f.text(20, 372, '玫红色条目是父图中 operator.add 加进自己列表的副本。', { size: 11, serif: true, hue: 'ink-soft' });
});
