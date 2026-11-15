'use strict';

const { figure } = require('../../../_shared/figkit.js');
const forms = require('../../../_shared/forms.js');

const tables = ['atespaces', 'actors', 'actor_templates', 'tags', 'actor_egress_policies', 'workers', 'worker_assignments', 'leases'];
const address = ['gs://ate-snapshots/', 'atespaces/<atespace>/', 'actors/<actor uid>/', 'snapshots/<uuid>'];

module.exports = figure('fig-8-1', {
  height: 614,
  title: '保存 actor 状态的三个位置',
  desc: '三处存储的等轴测视图。两个 ate-api-server 副本读写单副本 Postgres（绘为圆柱体，其中一圈色带代表 actor 行记录）。在节点上，atelet 将每次检查点写入节点磁盘（绘为容纳节点本地快照与快照缓存的托盘），并在 5 分钟后上传至对象存储（绘为 bucket）。挂载 25 个挂起 actor 时，节点磁盘存有 8,801 MiB 快照与 1,765 MiB 缓存，bucket 存有 10,824 MiB；删除这些 actor 后，bucket 仍保留 2,064 MiB。',
}, f => {
  const U = forms.isoView(f, { ox: 150, oy: 92, angle: 'true' });
  const D = forms.isoView(f, { ox: 176, oy: 388, angle: 'true' });
  const tag = (x, y, title, sub, hue, anchor = 'start') => {
    f.text(x, y, title, { size: 12, weight: 700, hue, anchor });
    if (sub) f.text(x, y + 15, sub, { size: 11, serif: true, hue: 'ink-soft', anchor });
  };

  forms.tower(f, U, [0, -52, 0], 'blue', { mark: { id: 'substrate', size: 38, inset: 3, rise: 38 } });
  forms.tower(f, U, [0, 8, 0], 'blue', { mark: { id: 'substrate', size: 38, inset: 3, rise: 38 } });
  const postgres = forms.cylinder(f, U, [196, 0, 0], 'teal', { r: 24, h: 66, mark: { id: 'postgresql', size: 32, drop: 3 } });
  tag(20, 158, 'ate-api-server', '2 个副本', 'blue');

  tag(410, 24, 'Postgres', 'postgres-0，单副本', 'teal');
  f.kicker(410, 62, '数据表', { hue: 'teal' });
  tables.forEach((name, index) => f.text(410, 79 + index * 16, name, { size: 11, hue: name === 'actors' ? 'teal' : undefined, weight: name === 'actors' ? 700 : undefined }));
  f.leader([404, 91], postgres.rim(9.5), { hue: 'teal' });
  f.text(410, 213, 'etcd 中不存任何 actor', { size: 11, serif: true, hue: 'ink-soft' });

  forms.slab(f, D, [-34, -52, 0], 'grey', { w: 324, d: 124, mark: { id: 'kubernetes', size: 40, at: [258, 44] } });
  const atelet = forms.unit(f, D, [0, -18, 0], 'violet');
  const tray = forms.shell(f, D, [130, -34, 0], 'violet', { w: 132, d: 68, h: 9, lip: 9 });
  forms.sheets(f, D, [140, -20, 3], 'teal', { size: 40, count: 5, gap: 3.5 });
  forms.sheets(f, D, [202, -20, 3], 'teal', { size: 40, count: 2, gap: 3.5 });
  tray.front();
  const bucket = forms.bucket(f, D, [18, -214, 0], 'teal');

  tag(atelet.left[0] - 6, atelet.left[1] - 44, 'atelet', '每节点一个', 'violet', 'end');
  tag(452, 262, '对象存储', 'kind 上的 rustfs，单 pod', 'teal');
  f.kicker(452, 300, '快照地址', { hue: 'teal' });
  address.forEach((part, index) => f.text(452 + index * 8, 317 + index * 16, part, { size: 11 }));
  f.kicker(452, 392, '实测占用', { hue: 'teal' });
  f.text(452, 409, '10,824 MiB（25 个 actor）', { size: 11 });
  f.text(452, 425, '删除后剩余 2,064 MiB', { size: 11 });
  f.text(452, 444, '黄金快照保留不删', { size: 11, serif: true, hue: 'ink-soft' });

  tag(20, 506, '节点磁盘', '/var/lib/ate', 'violet');
  f.kicker(20, 544, '目录', { hue: 'violet' });
  f.kicker(176, 544, '实测占用', { hue: 'violet' });
  f.text(20, 561, 'snapshots/<actor uid>', { size: 11 });
  f.text(176, 561, '8,801 MiB', { size: 11 });
  f.leader([240, 557], D.P(140, 20, 3), { hue: 'teal' });
  f.text(20, 577, 'snapshot-cache/', { size: 11 });
  f.text(176, 577, '1,765 MiB', { size: 11 });
  f.leader([240, 573], D.P(202, 20, 3), { hue: 'teal' });
  f.text(20, 596, '副本保留 30 分钟', { size: 11, serif: true, hue: 'ink-soft' });
  f.text(430, 574, '节点', { size: 11, serif: true, hue: 'ink-mute' });

  f.beat(1);
  f.isoFlow(U, [[58, 0, 0], [166, 0, 0]], { style: 'write' });
  f.text(...U.P(112, 0, 15), '每次调用', { size: 11.5, hue: 'teal', anchor: 'middle', knock: true });
  f.beat(2);
  f.isoFlow(D, [[40, 0, 0], [126, 0, 0]], { style: 'write' });
  f.text(...D.P(83, 0, 15), '检查点', { size: 11.5, hue: 'teal', anchor: 'middle', knock: true });
  f.beat(3);
  f.isoFlow(D, [[18, -22, 0], [18, -186, 0]], { style: 'write' });
  f.text(...D.P(18, -104, 15), '5 分钟后上传', { size: 11.5, hue: 'teal', anchor: 'middle', knock: true });
});
