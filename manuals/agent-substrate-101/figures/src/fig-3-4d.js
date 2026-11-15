'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { chart, load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/validation-memory-x86.json'));
const fills = [
  { key: 'rand', name: '全随机字节', share: '等于所持内存大小' },
  { key: 'mixed', name: '一半零、一半随机', share: '约为所持内存一半' },
  { key: 'zero', name: '全零字节', share: '两种规格均约 4 MiB' },
];
const of = key => data.actors.filter(a => a.fill === key).sort((a, b) => a.x - b.x);
const one = value => value.toFixed(1);
const two = value => (Math.round(value * 100) / 100).toFixed(2);
const list = key => of(key).map(a => `持有 ${a.x} MiB 时快照为 ${one(a.node_snapshot.mib)} MiB`).join('、');
const resumes = key => of(key).map(a => `${two(a.resume_node.seconds.median)} s`).join(' 与 ');

module.exports = figure('fig-3-4d', {
  height: 362,
  title: '三种内存内容下节点本地快照大小与所持内存的关系',
  desc: `带 gVisor 的 x86 服务器客户机上，六个模板各运行一个 actor 时节点本地快照 MiB 与 actor 所持内存 MiB 的关系。全随机字节：${list('rand')}。一半零一半随机：${list('mixed')}。全零字节：${list('zero')}。虚线表示快照大小等于所持内存。每个 actor 从节点恢复 10 次的中位耗时分别为：随机 ${resumes('rand')}，半零半随机 ${resumes('mixed')}，全零 ${resumes('zero')}。`,
}, f => {
  const c = chart(f, { x: 52, y: 40, w: 330, h: 270, xDomain: [0, 550], yDomain: [0, 550], xTicks: [0, 200, 500], yTicks: [0, 100, 200, 300, 400, 500], xFormat: v => String(v), xLabel: 'actor 持有的内存，MiB', yLabel: '节点本地快照，MiB' });
  f.rule(c.px(0), c.py(0), c.px(550), c.py(550), { hue: 'ink-soft', dash: 'dashed' });
  f.text(c.px(300), c.py(420), '大小等于所持内存', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });

  const right = c.px(550) + 14;
  fills.forEach((fill, index) => {
    const actors = of(fill.key);
    c.series(actors.map(a => [a.x, a.node_snapshot.mib]), { hue: 'teal', dots: false, width: 1.4 });
    for (const a of actors) f.dot(c.px(a.x), c.py(a.node_snapshot.mib), { hue: 'teal', r: 3.2 });
    const low = actors[0];
    const high = actors[actors.length - 1];
    const y = [58, 168, 268][index];
    f.leader([right - 4, y + 4], [c.px(high.x) + 5, c.py(high.node_snapshot.mib)], { hue: 'teal' });
    f.text(right, y, fill.name, { size: 11.5, weight: 700, hue: 'teal' });
    f.text(right, y + 15, `${one(low.node_snapshot.mib)} 与 ${one(high.node_snapshot.mib)} MiB`, { size: 11, hue: 'teal' });
    f.text(right, y + 30, fill.share, { size: 11, serif: true, hue: 'ink-soft' });
    f.text(right, y + 45, `恢复 ${two(low.resume_node.seconds.median)} 与 ${two(high.resume_node.seconds.median)} s`, { size: 11, serif: true, hue: 'violet' });
  });

  f.dot(c.px(18), c.py(520), { hue: 'teal', r: 3.2 });
  f.text(c.px(18) + 9, c.py(520) + 4, '单个 actor，一次 du 读数', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(right, 342, '恢复耗时：节点本地 10 次中位数', { size: 11, serif: true, hue: 'violet' });
});
