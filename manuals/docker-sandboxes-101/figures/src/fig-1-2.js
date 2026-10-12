'use strict';

const { figure } = require('../../../_shared/figkit.js');

const left = [
  { hue: 'grey', title: '输入命令', sub: 'sbx run docker-agent ~/my-project' },
  { hue: 'blue', title: 'sbx 创建沙箱', sub: 'docker/sandbox-templates:docker-agent' },
  { hue: 'violet', title: '内部启动命令', sub: 'docker-agent run --yolo' },
  { hue: 'green', title: 'agent 文件', sub: '仅工作区项目配置' },
  { hue: 'indigo', title: 'network', sub: '沙箱的 sbx 策略' },
  { hue: 'grey', title: '本手册', sub: '仅文档，未录制', dash: 'dashed' },
];
const right = [
  { hue: 'grey', title: '输入命令', sub: 'docker-agent run --sandbox agent.yaml' },
  { hue: 'blue', title: 'docker-agent 驱动 sbx', sub: 'docker/docker-agent-sbx-templates:latest' },
  { hue: 'violet', title: '内部 agent 程序', sub: 'docker-agent version main' },
  { hue: 'green', title: 'agent 文件', sub: '文件目录与 kit 均 ro' },
  { hue: 'indigo', title: 'network', sub: 'sbx 策略加 models.dev 与允许主机' },
  { hue: 'grey', title: '本手册', sub: 'capture/out/27-*' },
];

module.exports = figure('fig-1-2', {
  height: 412,
  title: '在沙箱启动 docker-agent 的两种方式',
  desc: '两列各一启动路径。左：sbx run docker-agent 在项目目录从 docker/sandbox-templates:docker-agent 创建沙箱，内部启动 run --yolo，只读工作区项目配置并应用 sbx 策略；没有录制。右：宿主 docker-agent run --sandbox agent.yaml 驱动 sbx 使用 docker/docker-agent-sbx-templates:latest；内部报告 version main，文件目录/kit 只读，放行 models.dev 与允许主机；录于 capture/out/27。',
}, f => {
  f.text(20, 20, 'A · sbx run docker-agent', { size: 12, weight: 700, hue: 'blue' });
  f.text(336, 20, 'B · docker-agent run --sandbox', { size: 12, weight: 700, hue: 'violet' });
  f.rule(320, 8, 320, 404, { dash: 'dashed' });
  [[left, 20], [right, 336]].forEach(([column, x]) => {
    column.forEach((item, index) => {
      f.box({ x, y: 32 + index * 62, w: 284, h: 50, titleSize: 12, ...item });
    });
  });
});
