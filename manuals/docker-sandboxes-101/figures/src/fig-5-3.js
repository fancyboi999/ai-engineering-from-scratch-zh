'use strict';

const { figure, color } = require('../../../_shared/figkit.js');

const fsNames = ['directory_tree, edit_file,', 'list_directory, read_file,', 'read_multiple_files,', 'search_files_content,', 'write_file, create_directory,', 'remove_directory'];

const mcpRows = [
  { y: 236, entry: 'ref: docker:duckduckgo', runtime: 'MCP Gateway', how: '容器服务器' },
  { y: 298, entry: 'command, args, env', runtime: '子进程', how: 'stdio，aqua安装' },
  { y: 360, entry: 'remote.url', runtime: '网络端点', how: 'streamable或sse' },
];

module.exports = figure('fig-5-3', {
  height: 424,
  title: '每个工具集给模型什么',
  desc: '三列：文件条目、运行内容、模型请求工具名。已录filesystem内置进程提供directory_tree、edit_file、list_directory、read_file、read_multiple_files、search_files_content、write_file、create_directory、remove_directory；shell提供cmd/cwd/timeout，每调用一命令。未录文档三mcp：docker:duckduckgo经网关容器；command/args/env经stdio子进程与aqua自动安装；remote.url经流式HTTP/SSE网络，各提供服务器工具。',
}, f => {
  f.kicker(20, 18, 'agent 文件条目');
  f.kicker(215, 18, '运行内容');
  f.kicker(400, 18, '模型拿到的工具名');

  const fsEntry = f.box({ x: 20, y: 30, w: 170, h: 104, hue: 'violet', title: 'type: filesystem', sub: ['files.yaml'] });
  const fsRun = f.box({ x: 215, y: 30, w: 160, h: 104, hue: 'olive', title: '内置工具集', sub: ['位于', 'docker-agent process'] });
  f.rect(400, 30, 220, 104, { fill: color('olive-fill'), stroke: color('olive-ink') });
  fsNames.forEach((line, index) => f.text(410, 50 + index * 15, line, { size: 11 }));
  f.arrow(fsEntry.right(), [fsRun.x - 1, fsEntry.cy], { style: 'call' });
  f.arrow(fsRun.right(), [399, fsEntry.cy], { style: 'reply' });

  const shEntry = f.box({ x: 20, y: 146, w: 170, h: 52, hue: 'violet', title: 'type: shell', sub: ['files.yaml, guarded.yaml'] });
  const shRun = f.box({ x: 215, y: 146, w: 160, h: 52, hue: 'olive', title: '内置工具集', sub: ['每调用一个命令'] });
  const shTool = f.box({ x: 400, y: 146, w: 220, h: 52, hue: 'olive', title: 'shell', sub: ['cmd, cwd, timeout (30 s)'] });
  f.arrow(shEntry.right(), [shRun.x - 1, shEntry.cy], { style: 'call' });
  f.arrow(shRun.right(), [shTool.x - 1, shEntry.cy], { style: 'reply' });

  f.kicker(20, 226, 'type: mcp 三形式，依据文档，未运行');
  for (const row of mcpRows) {
    const entry = f.box({ x: 20, y: row.y, w: 170, h: 52, hue: 'violet', dash: 'dashed', title: 'type: mcp', sub: [row.entry] });
    const run = f.box({ x: 215, y: row.y, w: 160, h: 52, hue: 'olive', dash: 'dashed', title: row.runtime, sub: [row.how] });
    const tools = f.box({ x: 400, y: row.y, w: 220, h: 52, hue: 'olive', dash: 'dashed', title: '服务器工具', sub: ['名称来自 tools/list'] });
    f.arrow(entry.right(), [run.x - 1, entry.cy], { style: 'call' });
    f.arrow(run.right(), [tools.x - 1, entry.cy], { style: 'reply' });
  }
});
