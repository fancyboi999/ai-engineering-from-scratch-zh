'use strict';

const path = require('path');
const { figure } = require('../../../_shared/figkit.js');
const { load } = require('../../../_shared/chart.js');

const data = load(path.join(__dirname, '../../capture/lab/summary/timers-x86.json'));
const X0 = 96;
const X1 = 612;
const MINUTES = 43;
const px = minutes => X0 + (minutes / MINUTES) * (X1 - X0);
const clock = seconds => `${Math.floor(seconds / 60)} 分 ${Math.round(seconds % 60)} 秒`;
const upload = Math.min(...data.actors.map(a => a.seconds_to_upload));
const detach = Math.max(...data.actors.map(a => a.seconds_to_detach));
const resumes = load(path.join(__dirname, '../../capture/lab/summary/resume-x86.json')).object_store_default_timers.points;
const resumeOf = mib => resumes.find(p => p.x === mib).seconds.median;
const origin = Math.min(...data.actors.map(a => Date.parse(a.suspended_at)));
const disk = data.node_local_snapshots.map(row => ({ minutes: (Date.parse(row.t) - origin) / 60000, mib: row.mib }));
const diskHigh = Math.max(...disk.map(row => row.mib));
const diskLow = Math.min(...disk.map(row => row.mib));

module.exports = figure('fig-3-4', {
  height: 352,
  title: '异步挂起后快照存放在哪里',
  desc: `x86 服务器客户机上使用默认 atelet 计时器异步挂起后，四个 actor（d0、d50、d200、d500）在 43 分钟内的时间线。前 5 分钟每份快照仅存于节点本地，状态为 PENDING；约 5 分钟至 30 分钟同时存在于节点与对象存储；约 30 分钟后节点副本被移除，仅保留对象存储副本。前三次上传在 5 分 1 秒至 5 分 2 秒完成，500 MiB 的一次在 5 分 11 秒完成。挂起 42 分钟后发起请求，各 actor 从对象存储恢复耗时分别为 ${data.actors.map(a => `${resumeOf(a.mib).toFixed(2)} s`).join('、')}。柱条下方圆点展示 ${disk.length} 次采样中节点磁盘上的快照体积：节点副本移除前为 ${diskHigh} MiB，移除后为 ${diskLow} MiB。`,
}, f => {
  f.rect(20, 14, 14, 10, { hue: 'rose', dash: 'dashed' });
  f.text(40, 23, '仅节点，PENDING', { size: 11, hue: 'rose' });
  f.rect(196, 14, 14, 10, { hue: 'violet' });
  f.text(216, 23, '节点与对象存储', { size: 11, hue: 'violet' });
  f.rect(390, 14, 14, 10, { hue: 'teal' });
  f.text(410, 23, '仅对象存储', { size: 11, hue: 'teal' });

  data.actors.forEach((actor, index) => {
    const y = 66 + index * 38;
    const up = actor.seconds_to_upload / 60;
    const down = actor.seconds_to_detach / 60;
    f.text(20, y + 14, actor.actor, { size: 12, weight: 700 });
    f.text(56, y + 14, `${actor.mib}`, { size: 11, serif: true, hue: 'ink-soft' });
    f.rect(px(0), y, px(up) - px(0), 20, { hue: 'rose', dash: 'dashed' });
    f.rect(px(up), y, px(down) - px(up), 20, { hue: 'violet' });
    f.rect(px(down), y, px(42) - px(down), 20, { hue: 'teal' });
    f.dot(px(42), y + 10, { hue: 'amber', r: 3.5 });
    f.text(px(42) - 8, y + 14, `${resumeOf(actor.mib).toFixed(2)} s 恢复`, { size: 11, serif: true, hue: 'ink-soft', anchor: 'end' });
  });
  f.text(56, 56, 'MiB', { size: 11, serif: true, hue: 'ink-soft' });

  f.rule(px(upload / 60), 30, px(upload / 60), 266, { hue: 'teal', dash: 'dashed', width: 1.2 });
  f.text(px(upload / 60) + 6, 40, `${clock(upload)} 后完成上传`, { size: 11, hue: 'teal' });
  f.rule(px(detach / 60), 46, px(detach / 60), 266, { hue: 'violet', dash: 'dashed', width: 1.2 });
  f.text(px(detach / 60) - 6, 56, `${clock(detach)} 后移除节点副本`, { size: 11, hue: 'violet', anchor: 'end' });

  f.text(20, 232, '节点', { size: 12, weight: 700 });
  f.text(20, 247, '磁盘', { size: 12, weight: 700 });
  for (const row of disk) f.dot(px(row.minutes), row.mib === diskHigh ? 226 : 252, { hue: 'violet', r: 2 });
  f.text(px(6), 244, `${diskHigh} MiB 快照，每次采样一点`, { size: 11, serif: true, hue: 'violet' });
  f.text(px(30.6), 242, `${diskLow} MiB`, { size: 11, serif: true, hue: 'violet' });

  f.rule(X0, 272, X1, 272, { hue: 'ink' });
  for (let m = 0; m <= 40; m += 5) {
    f.rule(px(m), 268, px(m), 276, { hue: 'ink' });
    f.text(px(m), 290, String(m), { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.kicker(20, 290, '分钟');
  f.dot(26, 312, { hue: 'amber', r: 3.5 });
  f.text(36, 316, '挂起 42 分钟后发一次请求：所有 actor 均从对象存储恢复', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(20, 336, '在玫红区间丢失节点副本会让 actor 进入 CRASHED。各时间最多延后 10 s。', { size: 11, serif: true, hue: 'ink-soft' });
});
