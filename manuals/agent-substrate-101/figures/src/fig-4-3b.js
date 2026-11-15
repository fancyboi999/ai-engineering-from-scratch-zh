'use strict';

const fs = require('fs');
const path = require('path');
const { figure, color } = require('../../../_shared/figkit.js');

const lab = name => fs.readFileSync(path.join(__dirname, '../../capture/lab/L-gaps/multinode', name), 'utf8').split('\n').filter(Boolean);
const rows = lab('70-stop-after-upload.tsv').map(line => line.split('\t'));
const when = text => Date.parse(text);
const origin = when(rows.find(r => r[1] === 'node-stop')[0]);
const t = text => (when(text) - origin) / 1000;
const stopped = t(rows.find(r => r[1] === 'node-stopped')[0]);
const started = t(rows.find(r => r[1] === 'node-start')[0]);
const probes = rows.filter(r => r[1] === 'probe').map(r => ({ end: t(r[0]), start: t(r[0]) - Number(r[3]), code: r[2], body: r[4], state: r[6] }));
const crashed = probes.find(p => p.state === 'ACTOR_STATE_CRASHED');
const before = probes.filter(p => p.state === 'ACTOR_STATE_RESUMING');
const after = probes.filter(p => p.state === 'ACTOR_STATE_CRASHED');
const timeouts = before.filter(p => p.code === '504').length;
const refused = before.filter(p => p.code === '503').length;
const logTime = line => t(line.match(/"time":"([^".]+\.\d{3})/)[1] + 'Z');
const marked = lab('96-controller-events.log').filter(line => line.includes('marking worker unavailable')).map(logTime).find(v => v > 0);
const drained = lab('98-worker-state-rpcs.log').filter(line => line.includes('/DrainWorker')).map(logTime).find(v => v > 0);
const clock = s => `${Math.floor(s / 60)} 分 ${Math.round(s % 60)} 秒`;

const X0 = 132;
const X1 = 612;
const SPAN = 480;
const px = s => X0 + (s / SPAN) * (X1 - X0);

module.exports = figure('fig-4-3b', {
  height: 318,
  title: '所在节点停止后，已挂起 actor 的状态变化',
  desc: `双 worker 节点集群中，节点 multi-worker2 停止后 ${Math.round(started)} 秒的时间线。actor u1 原本在该节点挂起，且快照已完整上传至对象存储。该节点的两个 worker 在前 ${Math.round(marked)} 秒仍列为活跃，随后被标为不可用；它们的 pod 在 ${clock(drained)} 后被驱逐。从首次请求开始，actor 在已停节点上处于 RESUMING，其间 ${timeouts + refused} 次请求失败。到 ${clock(crashed.end)} 时 actor 进入 CRASHED，随后 ${after.length} 次请求立即失败。actor 始终未迁移到另一节点。`,
}, f => {
  const track = (y, name, sub) => {
    f.text(20, y + 10, name, { size: 11.5, weight: 700, hue: 'ink' });
    if (sub) f.text(20, y + 24, sub, { size: 11, serif: true, hue: 'ink-soft' });
  };
  const band = (y, from, to, hue, dash) => f.rect(px(from), y, px(to) - px(from), 14, { hue, dash });

  track(40, '节点', 'multi-worker2');
  band(40, 0, stopped, 'grey');
  band(40, stopped, started, 'rose', 'dashed');
  f.text(px(stopped) + 6, 34, `docker stop，${Math.round(stopped)} s 后节点停止`, { size: 11, hue: 'rose' });
  f.text(px(started) - 4, 68, `${clock(started)} 重新启动`, { size: 11, anchor: 'end', hue: 'ink-soft' });

  track(96, '其上 2 个 worker', 'API 列表中');
  band(96, 0, marked, 'violet');
  band(96, marked, drained, 'rose');
  f.rule(px(marked), 88, px(marked), 118, { hue: 'ink' });
  f.text(px(marked) + 6, 90, `${Math.round(marked)} s 后标为 WORKER_STATE_UNAVAILABLE`, { size: 11, hue: 'rose' });
  f.rule(px(drained), 88, px(drained), 118, { hue: 'ink' });
  f.text(px(drained) - 6, 124, `pod 被驱逐，${clock(drained)}`, { size: 11, anchor: 'end', hue: 'ink-soft' });
  f.text(px(0), 124, 'ACTIVE', { size: 11, hue: 'violet' });

  track(152, 'actor u1', '已同步挂起');
  band(152, 0, before[0].start, 'teal');
  band(152, before[0].start, crashed.end, 'amber');
  band(152, crashed.end, started, 'rose');
  f.text(px(before[0].start) + 6, 146, `在已停节点上 RESUMING，持续 ${clock(crashed.end - before[0].start)}`, { size: 11, hue: 'amber' });
  f.rule(px(crashed.end), 150, px(crashed.end), 174, { hue: 'ink' });
  f.text(px(crashed.end) - 6, 180, `${clock(crashed.end)} 进入 ACTOR_STATE_CRASHED`, { size: 11, anchor: 'end', hue: 'rose' });

  track(208, '请求', '每次一条竖线');
  for (const p of probes) f.rect(px(p.start), 208, Math.max(1.2, px(p.end) - px(p.start)), 14, { fill: color('rose-ink'), stroke: 'none' });
  f.text(px(before[0].start), 238, `${timeouts} 次 10 s 后 504，${refused} 次 503`, { size: 11, hue: 'rose' });
  f.text(px(before[0].start), 252, 'actor lab-n/u1 unavailable', { size: 11, hue: 'rose' });
  f.text(X1, 238, `${after.length} 次立即返回 503`, { size: 11, anchor: 'end', hue: 'rose' });
  f.text(X1, 252, 'AssignWorker prerequisite not met', { size: 11, anchor: 'end', hue: 'rose' });

  f.rule(px(0), 272, px(SPAN), 272, { hue: 'ink' });
  for (let s = 0; s <= SPAN; s += 60) {
    f.rule(px(s), 268, px(s), 276, { hue: 'ink' });
    f.text(px(s), 290, s === 0 ? '0' : `${s / 60} 分`, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  f.text(20, 310, '时间自停止命令算起。另一节点上有两个带空闲容量的活跃 worker。', { size: 11, serif: true, hue: 'ink-soft' });
});
