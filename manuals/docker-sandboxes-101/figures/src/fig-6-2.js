'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

function exchange(f, y, lines) {
  const h = lines.length * 18 + 12;
  f.rect(20, y, 400, h, { fill: color('paper'), stroke: color('panel-edge') });
  lines.forEach((line, index) => f.text(32, y + 20 + index * 18, line, { size: 11 }));
  return y + h;
}

module.exports = figure('fig-6-2', {
  height: 396,
  title: '同一文件经 ACP 与 MCP 服务',
  desc: '上区编辑器启动serve acp pong.yaml，经stdin写JSON-RPC；initialize回agentCapabilities、agentInfo docker agent v1.149.0、protocolVersion1。session/new先通知compact/usage，再回configOptions/default。下区curl向8081/mcp发POST，initialize请求2026-07-28得2025-11-25；initialized得202，list得pong(message)，call得structuredContent.response pong。两者均运行dmr/ai/qwen3:4b的root。',
}, f => {
  f.kicker(20, 20, 'stdio 上的 ACP');
  const editor = f.box({ x: 20, y: 30, w: 130, h: 48, hue: 'grey', title: '编辑器', sub: 'ACP 客户端' });
  const acp = f.box({ x: 250, y: 30, w: 170, h: 48, hue: 'indigo', title: 'serve acp', sub: 'stdin 与 stdout' });
  f.arrow(editor.right(), [acp.x - 1, editor.cy], { style: 'call', label: 'stdio' });
  exchange(f, 90, [
    '>> initialize, protocolVersion 1',
    '<< agentCapabilities, agentInfo docker agent',
    '>> session/new, cwd, mcpServers []',
    '<< session/update: commands compact, usage',
    '<< result: configOptions, currentModeId default',
  ]);

  f.kicker(20, 214, '流式 HTTP 上的 MCP');
  const curl = f.box({ x: 20, y: 224, w: 130, h: 48, hue: 'grey', title: 'curl', sub: 'MCP 客户端' });
  const mcp = f.box({ x: 250, y: 224, w: 170, h: 48, hue: 'indigo', title: 'serve mcp --http', sub: '127.0.0.1:8081/mcp' });
  f.arrow(curl.right(), [mcp.x - 1, curl.cy], { style: 'call', label: 'HTTP POST' });
  exchange(f, 284, [
    '>> initialize，请求2026-07-28',
    '<< protocolVersion 2025-11-25',
    '>> notifications/initialized, 202 Accepted',
    '>> tools/list << one tool pong(message)',
    '>> tools/call << structuredContent.response',
  ]);

  const agent = f.box({ x: 470, y: 30, w: 150, h: 354, hue: 'violet', title: 'pong.yaml', sub: ['agent：root', 'dmr/ai/qwen3:4b', 'temperature 0'] });
  f.arrow(acp.right(), [agent.x - 1, acp.cy], { style: 'call' });
  f.arrow(mcp.right(), [agent.x - 1, mcp.cy], { style: 'call' });
});
