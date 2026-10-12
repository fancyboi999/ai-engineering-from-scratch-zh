'use strict';

const { figure } = require('../../../_shared/figkit.js');

module.exports = figure('fig-7-2', {
  height: 436,
  title: '从 Docker Home 到 SIEM',
  desc: '顶Docker Home的AI Platform组织策略五分钟内由sandboxd拉取，合并本地策略，194允许不活跃，拒绝仍生效。第二行代理对m101-policy的example.com:443决定，原因no applicable policies，op为net:connect:tcp，决定AUDIT_DECISION_DENY。第三行守护进程向auditkit的audit-<utc>-<uuid>-<seq>.jsonl写记录，每5分钟/1000事件/50 MiB定稿。底云投递可搜索90天并转SIEM。注：此次无组织，无记录。',
}, f => {
  f.kicker(20, 18, '规则来源');
  const home = f.box({ x: 20, y: 30, w: 200, h: 58, hue: 'grey', title: 'Docker Home', sub: ['Network, Filesystem, MCP', '组织/团队作用域策略'] });
  const daemon = f.box({ x: 250, y: 30, w: 180, h: 58, hue: 'blue', title: 'sandboxd', sub: ['五分钟内拉取', 'sbx policy reset 强制拉取'] });
  const local = f.box({ x: 480, y: 30, w: 140, h: 58, hue: 'teal', title: 'local-policy', sub: ['194允许：不活跃', '拒绝：仍生效'] });
  f.arrow(home.right(), [daemon.x - 1, home.cy], { style: 'call', label: '拉取' });
  f.arrow(local.left(), [daemon.x + daemon.w + 1, local.cy], { style: 'call', label: '合并' });

  const decision = f.box({ x: 20, y: 130, w: 600, h: 64, hue: 'indigo', title: '代理决定：m101-policy 的 example.com:443', sub: ['no applicable policies for op(action=net:connect:tcp,', 'resource=net:domain:example.com:443), decision AUDIT_DECISION_DENY'] });
  f.arrow(daemon.bottom(), [daemon.cx, decision.y - 1], { style: 'call', label: '有效规则' });

  const audit = f.box({ x: 20, y: 232, w: 360, h: 64, hue: 'teal', title: 'audit-<utc>-<uuid>-<seq>.jsonl', sub: ['~/Library/Logs/com.docker.sandboxes/sandboxes/auditkit/', '强制组织策略下由守护进程写'] });
  f.path(`M${decision.cx} ${decision.y + decision.h} V214 H${audit.cx} V${audit.y - 1}`, { style: 'write' });
  f.text(330, 219, '每决定一条记录', { size: 11.5, hue: 'teal', knock: true });
  const rotate = f.box({ x: 440, y: 232, w: 180, h: 64, hue: 'amber', title: '轮转', sub: ['每5分钟、1000事件，', '或50 MiB，.tmp变.jsonl'] });
  f.arrow(audit.right(), [rotate.x - 1, audit.cy], { style: 'state' });

  const cloud = f.box({ x: 20, y: 334, w: 290, h: 58, hue: 'grey', title: 'Docker Cloud 投递（默认开）', sub: ['可搜索90天，CSV最多100万行', 'app.docker.com, AI Platform, Audit logs'] });
  const siem = f.box({ x: 330, y: 334, w: 290, h: 58, hue: 'grey', title: 'SIEM 目标', sub: ['Splunk Cloud, Dynatrace, Datadog, Sumo Logic', '需 sbx0.39.0和云投递'] });
  f.path(`M${audit.cx} ${audit.y + audit.h} V316 H${cloud.cx} V${cloud.y - 1}`, { style: 'effect' });
  f.text(210, 321, '上传', { size: 11.5, hue: 'olive', knock: true });
  f.arrow(cloud.right(), [siem.x - 1, cloud.cy], { style: 'effect' });

  f.text(20, 422, '此次录制无组织、无许可、无审计记录（03-policy-org.txt）', { size: 11, serif: true, hue: 'ink-soft' });
});
