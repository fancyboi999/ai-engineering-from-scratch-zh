'use strict';

const { figure } = require('../../../_shared/figkit.js');

const rows = [
  ["MCPAdapter('server.py')", '不是 URL 的字符串', 'ValueError，不启动', '构造时即被拒绝', 'rose'],
  ['工具报告 isError', '服务器内的 ToolError', 'ToolMessage，status error', '运行继续', 'green'],
  ['工具内抛出异常', '服务器内的 RuntimeError', 'ToolMessage，status error', '运行继续', 'green'],
  ['慢工具，默认客户端', 'slow(2) 等待 2.0 s', 'ToolMessage，status success', '适配器没有超时', 'grey'],
  ['慢工具，Client(timeout=1)', '经 stdio 或 HTTP 的 slow(5)', 'MCPError: timed out', '1.0 s 后抛出', 'rose'],
  ['服务器崩溃，stdio', '调用中途 os._exit(3)', 'MCPError: Connection closed', '运行中止，下次调用会重新启动', 'rose'],
  ['服务器崩溃，HTTP', '调用中途 os._exit(3)', 'RemoteProtocolError', '之后的运行连接失败', 'rose'],
];

module.exports = figure('fig-7-3', {
  height: 470,
  title: '各种 MCP 故障对一次运行的影响',
  desc: '七行，每行从左侧的情形指向右侧的结果。目标字符串不是 http 或 https URL 时抛出 ValueError，不启动任何东西。工具报告 isError 与工具抛出 Python 异常，都会变成 status 为 error 的 ToolMessage，运行继续。默认客户端下的慢工具在 2.0 秒后返回，因为适配器没有超时。timeout 为 1 的 FastMCP Client 在 1.0 秒后抛出 MCPError timed out。stdio 下服务器崩溃抛出 MCPError Connection closed 并中止运行，下一次调用会重新启动服务器。HTTP 下服务器崩溃在该调用上抛出 RemoteProtocolError，随后的 agent 运行与后续调用都连接失败，因为没有东西重新启动服务器。',
}, f => {
  f.kicker(20, 20, '情形');
  f.kicker(360, 20, '运行得到的结果');
  rows.forEach(([kind, detail, result, after, hue], i) => {
    const y = 32 + i * 60;
    const left = f.box({ x: 20, y, w: 270, h: 48, hue: 'grey', title: kind, sub: detail, align: 'left' });
    const right = f.box({ x: 360, y, w: 260, h: 48, hue, title: result, sub: after, align: 'left' });
    f.arrow(left.right(), [right.x - 1, left.cy], { style: hue === 'rose' ? 'fail' : 'reply' });
  });
  f.text(20, 462, '来自 Mac，每种情形运行一次，langchain 1.5.0 配 fastmcp 4.2.0。', { size: 11, serif: true, hue: 'ink-soft' });
});
