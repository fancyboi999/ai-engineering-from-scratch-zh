'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

module.exports = figure('fig-6-6', {
  height: 376,
  title: '录制 compose.yaml 的模型与网关',
  desc: '顶层models声明llm为ai/qwen3:4b，Compose要求runner拉取配置。m101的alpine:3.22 printer以endpoint_var/model_var绑定，收到LLM_MODEL与LLM_URL=http://model-runner.docker.internal/v1/；GET models回200。mcp-gateway以streaming8811及use_api_socket运行，无服务器，打印bearer token，对无token请求回401。',
}, f => {
  const models = f.box({ x: 20, y: 30, w: 250, h: 50, hue: 'plum', title: 'models: llm', sub: 'model: ai/qwen3:4b' });
  const runner = f.box({ x: 400, y: 30, w: 220, h: 50, hue: 'plum', title: 'Docker Model Runner', sub: 'model-runner.docker.internal' });
  f.arrow(models.right(), [runner.x - 1, models.cy], { style: 'call', label: '拉取、配置', labelSize: 11 });

  f.rect(10, 118, 360, 246, { stroke: color('ink-mute'), dash: 'dashed' });
  f.kicker(20, 110, 'Compose 项目 m101');
  const printer = f.box({ x: 20, y: 130, w: 340, h: 74, hue: 'grey', title: 'printer, alpine:3.22', sub: ['LLM_MODEL=ai/qwen3:4b', 'LLM_URL=http://model-runner.docker.internal/v1/'] });
  f.arrow([250, models.y + models.h], [250, printer.y - 1], { style: 'call', label: 'endpoint_var, model_var', labelSize: 11 });
  f.path(`M${printer.x + printer.w} 150 H560 V${runner.y + runner.h + 1}`, { style: 'call' });
  f.text(455, 144, 'GET LLM_URL models: 200', { size: 11, anchor: 'middle', knock: true });

  const gateway = f.box({ x: 20, y: 264, w: 340, h: 86, hue: 'olive', title: 'mcp-gateway, docker/mcp-gateway', sub: ['--transport=streaming --port=8811', 'use_api_socket: true，无服务器', '打印 bearer token，0工具'] });
  f.arrow([190, printer.y + printer.h], [190, gateway.y - 1], { style: 'fail', label: '401 Unauthorized', labelSize: 11 });
  const api = f.box({ x: 450, y: 264, w: 170, h: 86, hue: 'grey', title: 'Docker Engine API', sub: ['宿主 socket', '未启动服务器'] });
  f.arrow(gateway.right(), [api.x - 1, gateway.cy], { style: 'call', label: 'API socket', labelSize: 11 });
})
  // 保留冻结背景几何，只替换最终 SVG 中的完整文字节点。
  .replace(">API socket</text>", ">API 套接字</text>");
