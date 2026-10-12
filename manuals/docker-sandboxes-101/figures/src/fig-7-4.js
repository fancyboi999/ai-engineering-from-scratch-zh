'use strict';

const { figure } = require('../../../_shared/figkit.js');

const confirmed = [
  { hue: 'teal', title: '内部哨兵，外部真实密钥', sub: '10-env-sentinel.txt, 10-receiver.log' },
  { hue: 'indigo', title: 'default deny on example.com:443', sub: '09-blocked.txt, 09-check-verbose.json' },
  { hue: 'blue', title: '内部私有 Docker Engine29.8.1', sub: '04-guest.txt' },
  { hue: 'green', title: '经 sandbox-m101-clone 取回', sub: '08-clone-host.txt' },
  { hue: 'indigo', title: 'proxy gateway.docker.internal:3128', sub: '04-env.txt' },
  { hue: 'olive', title: '内部设置 MCP_GATEWAY_URL', sub: '11-static-inside.txt' },
  { hue: 'violet', title: 'toolsets输出27类型', sub: '16-toolsets.txt' },
  { hue: 'plum', title: 'DMR 的 ai/qwen3:4b，无 key', sub: '25-doctor.txt, 27-inside-run.txt' },
];

const reported = [
  { hue: 'grey', title: 'MITM代理重签HTTPS', sub: 'issue #12，未检查' },
  { hue: 'grey', title: 'VMM是libkrun', sub: '2026-01-14演讲，未验证' },
  { hue: 'grey', title: '几十毫秒启动', sub: '2026-02-10演讲，K35未运行' },
  { hue: 'grey', title: 'kit签名可验证', sub: 'sbx kit sign，未录制' },
  { hue: 'grey', title: 'sbx policy approval不是命令', sub: '403正文提及，未运行' },
  { hue: 'rose', title: '允许主机作为外传路径', sub: 'HN2026-08-10，并列双方' },
];

module.exports = figure('fig-7-4', {
  height: 440,
  title: '文件确认，还是仅转述',
  desc: '左八项录制确认：内部哨兵/外部密钥、example.com默认拒绝、内部私有Engine29.8.1、sandbox-m101-clone取提交、3128代理、内部MCP_GATEWAY_URL、27工具集、无provider key的DMR ai/qwen3:4b。右六项：五项未测转述（MITM重签HTTPS、libkrun VMM、几十毫秒启动、kit签名验证、帮助无policy approval但403提它），玫红框为有争议外传路径。',
}, f => {
  f.kicker(20, 18, '录制文件确认', { hue: 'teal' });
  f.kicker(336, 18, '仅转述，未测试', { hue: 'grey' });
  f.rule(320, 8, 320, 432, { dash: 'dashed' });
  [[confirmed, 20], [reported, 336]].forEach(([column, x]) => {
    column.forEach((item, index) => {
      f.box({ x, y: 30 + index * 50, w: 284, h: 42, hue: item.hue, title: item.title, sub: item.sub, titleSize: 12, dash: item.hue === 'grey' || item.hue === 'rose' ? 'dashed' : undefined });
    });
  });
});
