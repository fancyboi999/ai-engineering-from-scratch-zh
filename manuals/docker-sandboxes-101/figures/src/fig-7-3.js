'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const ORIGIN = Date.UTC(2025, 8, 1);
const MONTH = 40;
const xOf = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(60 + ((Date.UTC(y, m - 1, d) - ORIGIN) / (30.44 * 86400000)) * MONTH);
};

const events = [
  { n: 1, date: '2025-09-18', track: 'agent', row: 'old', text: '2025-09-18：cagent 发布博客，公开仓库始于2025-09-01' },
  { n: 2, date: '2025-10-23', track: 'agent', row: 'old', text: '2025-10-23：Desktop4.49.0内置 agent，说明后来改名' },
  { n: 3, date: '2025-11-06', track: 'sandbox', row: 'old', text: '2025-11-06：Desktop4.50.0，容器版 docker sandbox run（计划时间线）' },
  { n: 4, date: '2026-01-26', track: 'sandbox', row: 'old', removal: true, text: '2026-01-26：Desktop4.58.0，microVM，移除 --mount-docker-socket' },
  { n: 5, date: '2026-02-16', track: 'agent', row: 'new', text: '2026-02-16/02-19：v1.23.3插件，v1.23.4重组' },
  { n: 6, date: '2026-02-18', track: 'sandbox', row: 'old', text: '2026-02-18：Desktop4.61.0内置v0.12.0，即本文旧帮助' },
  { n: 7, date: '2026-03-09', track: 'agent', row: 'new', text: '2026-03-09：v1.30.0完成改名，仍读 CAGENT_*' },
  { n: 8, date: '2026-03-31', track: 'sandbox', row: 'new', text: '2026-03-31：v0.21.0，首个公开独立 sbx tag' },
  { n: 9, date: '2026-06-29', track: 'sandbox', row: 'old', removal: true, text: '2026-06-29：Desktop4.80.0移除 docker sandbox 插件' },
  { n: 10, date: '2026-07-06', track: 'agent', row: 'old', removal: true, text: '2026-07-06：Desktop4.81.0移除 cagent 程序' },
  { n: 11, date: '2026-09-21', track: 'sandbox', row: 'new', text: '2026-09-21：v0.45.0新增 sbx --cloud 与v3 kit' },
  { n: 12, date: '2026-10-07', track: 'sandbox', row: 'new', text: '2026-10-05/10-07：本手册固定v0.47.0/v1.149.0' },
];

const tracks = {
  sandbox: { label: '沙箱', old: 62, new: 96, oldSpan: ['2025-11-06', '2026-06-29'], newSpan: ['2026-03-31', '2026-10-07'], hue: 'blue', oldName: 'docker sandbox 插件', newName: 'sbx' },
  agent: { label: 'agent', old: 160, new: 194, oldSpan: ['2025-09-18', '2026-07-06'], newSpan: ['2026-02-16', '2026-10-07'], hue: 'violet', oldName: 'cagent', newName: 'docker-agent' },
};

module.exports = figure('fig-7-3', {
  height: 516,
  title: '2025-09至2026-10的两条产品线',
  desc: '2025-09至2026-10的两轨。沙箱灰条从2025-11-06插件到2026-06-29 Desktop4.80.0移除；蓝sbx从2026-03-31 v0.21.0到2026-10-05 v0.47.0。agent灰cagent从2025-09-18博客到2026-07-06 Desktop4.81.0移除；紫docker-agent从2026-02-16 v1.23.3到2026-10-07 v1.149.0。玫红标socket挂载、插件、cagent三移除，编号图例列十二事件。',
}, f => {
  for (const track of Object.values(tracks)) {
    f.kicker(20, track.old - 18, track.label);
    f.rect(xOf(track.oldSpan[0]), track.old, xOf(track.oldSpan[1]) - xOf(track.oldSpan[0]), 16, { fill: color('grey-fill'), stroke: color('grey-ink') });
    f.rect(xOf(track.newSpan[0]), track.new, xOf(track.newSpan[1]) - xOf(track.newSpan[0]), 16, { fill: color(`${track.hue}-fill`), stroke: color(`${track.hue}-ink`) });
    f.text(xOf(track.oldSpan[0]) + 12, track.old - 7, track.oldName, { size: 11, hue: 'grey' });
    f.text(xOf(track.newSpan[0]) + 12, track.new - 7, track.newName, { size: 11, hue: track.hue });
  }
  for (const event of events.filter(item => item.removal)) {
    const track = tracks[event.track];
    const x = xOf(event.date);
    const cy = (event.row === 'old' ? track.old : track.new) + 8;
    if (track !== tracks.sandbox || event.row !== 'old') f.rule(x, 30, x, cy - 12, { hue: 'rose', dash: 'dashed', width: 1.4 });
    f.rule(x, cy + 12, x, 226, { hue: 'rose', dash: 'dashed', width: 1.4 });
  }
  f.rule(60, 236, 620, 236, { hue: 'ink' });
  for (const [label, date] of [['2025-09', '2025-09-01'], ['2025-12', '2025-12-01'], ['2026-03', '2026-03-01'], ['2026-06', '2026-06-01'], ['2026-09', '2026-09-01']]) {
    const x = xOf(date);
    f.rule(x, 232, x, 240, { hue: 'ink' });
    f.text(x, 254, label, { size: 11, anchor: 'middle', hue: 'ink-soft' });
  }
  for (const event of events) {
    const track = tracks[event.track];
    const y = event.row === 'old' ? track.old + 8 : track.new + 8;
    f.step(xOf(event.date), y, event.n, { hue: event.removal ? 'rose' : track.hue });
  }
  f.kicker(20, 282, '图例');
  events.forEach((event, index) => {
    const y = 302 + index * 18;
    f.step(30, y - 4, event.n, { hue: event.removal ? 'rose' : tracks[event.track].hue });
    f.text(48, y, event.text, { size: 11, serif: true });
  });
});
