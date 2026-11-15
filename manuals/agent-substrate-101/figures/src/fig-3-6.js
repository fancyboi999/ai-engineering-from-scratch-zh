'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-3-6', {
  height: 330,
  title: 'atespace 与 Kubernetes 命名空间分别存放不同对象',
  desc: '并排两棵归属树。左侧属于 Substrate API 并存于 Postgres：atespace lab-c 包含 ActorTemplate ballast-200、actor b200-1 以及模板的黄金标签。右侧属于 Kubernetes 并存于 etcd：命名空间 lab-c 包含带 workload: ballast 标签的 WorkerPool ballast 及其两个 worker pod。点线将模板的 workerSelector 连接到池标签，因为 worker 池选择只按标签匹配，不检查命名空间。',
}, f => {
  f.kicker(20, 18, 'Substrate API，Postgres 中的行');
  f.kicker(350, 18, 'Kubernetes，etcd 中的对象');
  f.rule(320, 8, 320, 268, { dash: 'dashed' });

  const space = f.box({ x: 20, y: 28, w: 280, h: 44, hue: 'blue', title: 'Atespace lab-c', sub: 'kubectl ate create atespace lab-c' });
  const tmpl = f.box({ x: 50, y: 96, w: 250, h: 58, hue: 'green', align: 'left', title: 'ActorTemplate ballast-200', sub: ['workerSelector:', 'matchLabels workload: ballast'] });
  const actor = f.box({ x: 50, y: 166, w: 250, h: 44, hue: 'green', align: 'left', title: 'Actor b200-1', sub: '寻址名 lab-c/b200-1' });
  const tag = f.box({ x: 50, y: 222, w: 250, h: 44, hue: 'teal', align: 'left', title: 'Tag b9f97b82', titleSize: 12, sub: '黄金标签，以模板 uid 命名' });
  [tmpl, actor, tag].forEach(child => f.path(`M34 ${space.y + space.h} V${child.cy} H49`, { style: 'call', head: false }));

  const ns = f.box({ x: 350, y: 28, w: 270, h: 44, hue: 'grey', title: 'Namespace lab-c', sub: 'kubectl create namespace lab-c' });
  const pool = f.box({ x: 380, y: 96, w: 240, h: 58, hue: 'violet', align: 'left', title: 'WorkerPool ballast', sub: ['labels workload: ballast', 'replicas 2, class gvisor'] });
  const podA = f.box({ x: 410, y: 166, w: 210, h: 44, hue: 'violet', align: 'left', titleSize: 11.5, title: 'ballast-65cf95d875-bzgjd', sub: 'worker pod, 2 CPU, 3 GiB' });
  const podB = f.box({ x: 410, y: 222, w: 210, h: 44, hue: 'violet', align: 'left', titleSize: 11.5, title: 'ballast-65cf95d875-f65dl', sub: 'worker pod, 2 CPU, 3 GiB' });
  f.path(`M364 ${ns.y + ns.h} V${pool.cy} H379`, { style: 'call', head: false });
  [podA, podB].forEach(pod => f.path(`M394 ${pool.y + pool.h} V${pod.cy} H409`, { style: 'call', head: false }));

  f.arrow([tmpl.x + tmpl.w, tmpl.cy], [pool.x - 1, pool.cy], { style: 'event' });

  f.text(20, 292, '点线是唯一关联：模板的 worker 选择器匹配 worker 池的标签。', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 310, '两边都叫 lab-c 只是人为同名，Substrate 并不比较这两个名称。', { size: 11, serif: true, hue: 'ink-soft' });
});
