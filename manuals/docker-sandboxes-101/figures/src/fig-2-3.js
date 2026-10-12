'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-2-3', {
  height: 345,
  title: 'macOS的sandboxd状态目录',
  desc: '顶部两个根：Application Support 的 com.docker.sandboxes 含 sandboxes/sandboxd 的 sandboxd.sock、daemon.log 及 sandboxes/agent-skills；Logs 的同名目录含 sandboxes/auditkit 的审计 JSONL。下方 ~/.sbx/run 符号链接指状态目录，含 containerd ttrpc socket；灰框为2025插件 ~/.docker/sandboxes。',
}, f => {
  const root = f.box({ x: 20, y: 30, w: 240, h: 50, hue: 'blue', title: 'com.docker.sandboxes/', sub: ['~/Library/Application Support/'] });
  const logs = f.box({ x: 385, y: 30, w: 240, h: 50, hue: 'teal', title: 'com.docker.sandboxes/', sub: ['~/Library/Logs/'] });
  const daemon = f.box({ x: 20, y: 120, w: 170, h: 64, hue: 'blue', title: 'sandboxes/sandboxd/', sub: ['sandboxd.sock', 'daemon.log'] });
  const skills = f.box({ x: 200, y: 120, w: 165, h: 64, hue: 'green', title: 'agent-skills/', sub: ['sandboxes/agent-skills/', '共享skills存储'] });
  const audit = f.box({ x: 385, y: 120, w: 240, h: 64, hue: 'teal', title: 'sandboxes/auditkit/', sub: ['audit-<utc-timestamp>-', '<process-uuid>-<seq>.jsonl'] });
  f.path(`M${root.cx} 80 V100 H${daemon.cx} V120`, { style: 'call', hue: 'ink-mute', head: false });
  f.path(`M${root.cx} 100 H${skills.cx} V120`, { style: 'call', hue: 'ink-mute', head: false });
  f.path(`M${logs.cx} 80 V120`, { style: 'call', hue: 'ink-mute', head: false });
  const link = f.box({ x: 20, y: 220, w: 240, h: 64, hue: 'blue', dash: 'dashed', title: '~/.sbx/run', sub: ['链接到状态目录', 'd/containerd/containerd.sock.ttrpc'] });
  f.path(`M20 65 H10 V${link.cy} H19`, { style: 'call', hue: 'ink-mute', dash: 'dashed' });
  f.box({ x: 385, y: 220, w: 240, h: 80, hue: 'grey', dash: 'dashed', title: '~/.docker/sandboxes/', sub: ['vm/<name>/, image-cache/', '2025年的docker sandbox插件', 'docker sandbox reset删除'] });
  f.text(20, 330, '虚线框：符号链接或sbx不用的插件目录树 · 青绿：存储记录', { size: 11, serif: true, hue: 'ink-soft' });
});
