'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const first = load(path.join(__dirname, '../../capture/lab/summary/resume-x86.json')).new_actor_first_call.points.find(p => p.x === 200).seconds;
const firstCall = `${(Math.round(first.median * 100) / 100).toFixed(2)} s`;

const key = [
  '1  ate-api-server 根据模板创建临时黄金 actor 并将其恢复。',
  '2  按 preferredFidelity 挂起该 actor，将快照复制为已发布标签。',
  '3  删除黄金 actor。实测中模板创建 21 s 后即可列出该标签。',
  '4  新 actor 将标签快照记为第 1 代，初始处于 SUSPENDED。',
  `5  首次请求在 worker 上恢复该标签快照：200 MiB 时耗时 ${firstCall}。`,
];

module.exports = figure('fig-3-1', {
  height: 318,
  title: '从 ActorTemplate 到新 actor 的首次调用',
  desc: `上下两行。顶行对每个模板执行一次：模板 lab-c/ballast-200 生成临时黄金 actor，挂起后复制为黄金标签。底行对每个新 actor 执行一次：kubectl ate create actor b200-1 创建处于 ACTOR_STATE_SUSPENDED 且指向标签快照的 actor，首次请求将其恢复到 ACTOR_STATE_RUNNING，200 MiB 下 ${first.n} 个新 actor 的中位耗时为 ${firstCall}。`,
}, f => {
  f.kicker(20, 18, '每个模板执行一次');
  f.text(620, 18, '模板创建 21 s 后列出标签', { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
  const tmpl = f.box({ x: 20, y: 28, w: 150, h: 52, hue: 'green', title: 'ActorTemplate', sub: 'lab-c/ballast-200' });
  const golden = f.box({ x: 215, y: 28, w: 180, h: 52, hue: 'green', dash: 'dashed', title: '黄金 actor', sub: '临时，同一 atespace' });
  const tag = f.box({ x: 440, y: 28, w: 180, h: 52, hue: 'teal', title: '黄金标签', sub: 'SNAPSHOT_OWNER_TAG' });
  f.arrow(tmpl.right(), [golden.x - 1, tmpl.cy], { style: 'call' });
  f.arrow(golden.right(), [tag.x - 1, golden.cy], { style: 'write' });
  f.step(192, 40, 1);
  f.step(417, 40, 2);
  f.step(305, 98, 3);
  f.rule(305, 80, 305, 89, { hue: 'green', dash: 'dashed' });
  f.text(320, 102, '复制完成后删除', { size: 11, serif: true, hue: 'ink-soft' });

  f.kicker(20, 128, '每个新 actor 执行一次');
  const create = f.box({ x: 20, y: 138, w: 150, h: 52, hue: 'olive', title: 'create actor', sub: 'kubectl ate, b200-1' });
  const suspended = f.box({ x: 215, y: 138, w: 180, h: 52, hue: 'amber', titleSize: 11.5, title: 'ACTOR_STATE_SUSPENDED', sub: '第 1 代即标签快照' });
  const running = f.box({ x: 440, y: 138, w: 180, h: 52, hue: 'amber', titleSize: 11.5, title: 'ACTOR_STATE_RUNNING', sub: '回复含 count=1' });
  f.arrow(create.right(), [suspended.x - 1, create.cy], { style: 'call' });
  f.arrow(suspended.right(), [running.x - 1, suspended.cy], { style: 'state' });
  f.step(192, 150, 4);
  f.step(417, 150, 5);
  f.arrow([500, 80], [500, 137], { style: 'reply', label: '恢复时读取' });

  key.forEach((line, index) => f.text(20, 222 + index * 18, line, { size: 11, serif: true, hue: 'ink-soft' }));
});
