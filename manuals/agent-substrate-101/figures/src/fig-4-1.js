'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

module.exports = figure('fig-4-1', {
  height: 346,
  title: '从 WorkerPool 到两个已注册的 worker',
  desc: '命名空间 lab-c 中的 WorkerPool ballast 请求两个副本，上限为 2 CPU 和 3 GiB。ate-controller 读取该对象，写入 Deployment，并在 ate-api-server 中为每个 pod 创建一条 Worker 记录。节点上的 atelet 注册每个 worker，使记录变为 WORKER_STATE_ACTIVE。随后两个 worker pod 各自上报 2/1000 个 actor、2000/2000 millicores 以及 512Mi/3008Mi。',
}, f => {
  f.kicker(20, 18, '你编写');
  f.kicker(260, 18, 'Substrate 调谐');
  const pool = f.box({ x: 20, y: 28, w: 170, h: 62, hue: 'grey', pad: 8, title: 'WorkerPool ballast', sub: ['replicas: 2', 'limits: cpu 2, memory 3Gi'] });
  const ctrl = f.box({ x: 260, y: 28, w: 140, h: 62, hue: 'blue', title: 'ate-controller', sub: '单副本' });
  const api = f.box({ x: 470, y: 28, w: 150, h: 62, hue: 'blue', title: 'ate-api-server', sub: ['Worker b17a6492', 'Worker ee4ba8b4'] });
  f.arrow(pool.right(), [ctrl.x - 1, pool.cy], { style: 'call', label: '1 读取' });
  f.arrow(ctrl.right(), [api.x - 1, ctrl.cy], { style: 'write', label: '2 创建' });

  const dep = f.box({ x: 240, y: 128, w: 180, h: 44, hue: 'grey', title: 'Deployment ballast', sub: 'label ate.dev/worker-pool' });
  f.arrow(ctrl.bottom(), [ctrl.cx, dep.y - 1], { style: 'call', label: '1 写入' });

  f.rect(20, 212, 600, 122, { fill: 'none', stroke: color('grey-ink'), dash: 'dashed' });
  f.kicker(32, 230, '单个节点');
  const p1 = f.box({ x: 32, y: 240, w: 186, h: 82, hue: 'violet', title: 'worker pod bzgjd', sub: ['ACTORS 2/1000', 'CPU 2000/2000', 'MEMORY 512Mi/3008Mi'] });
  const p2 = f.box({ x: 230, y: 240, w: 186, h: 82, hue: 'violet', title: 'worker pod f65dl', sub: ['ACTORS 2/1000', 'CPU 2000/2000', 'MEMORY 512Mi/3008Mi'] });
  const atelet = f.box({ x: 458, y: 248, w: 150, h: 66, hue: 'violet', title: 'atelet', sub: ['注册每个 worker', '上报可用运行时'] });
  f.path(`M${dep.x} ${dep.cy} H${p1.cx} V${p1.y - 1}`, { style: 'call' });
  f.arrow([p2.cx, dep.y + dep.h], [p2.cx, p2.y - 1], { style: 'call' });
  f.text(p2.cx + 8, 196, '两个 pod', { size: 11, serif: true, hue: 'ink-soft', knock: true });
  f.arrow([api.cx, atelet.y], [api.cx, api.y + api.h + 1], { style: 'write', label: '3 注册' });
  f.text(api.cx - 8, 122, '4 WORKER_STATE_ACTIVE', { size: 11, hue: 'amber', anchor: 'end' });
});
