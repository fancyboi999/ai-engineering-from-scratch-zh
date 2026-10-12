# serve mcp 与 serve acp

> `serve mcp` 将每个 agent 作为一个 MCP 工具，经 stdio 或8081端口的流式 HTTP 提供；`serve acp` 经 stdio 向编辑器提供 Agent Client Protocol。

MCP 客户端已会调工具，编辑器已会与编程 agent 通信，但都不读 agent 文件。`serve mcp` 为前者把 agent 变为工具，`serve acp` 为后者把它变为编辑器 agent。

读完本节，你能将 agent 作为 MCP 工具服务、读取 schema，并从编辑器打开 ACP 会话。

## serve mcp：一个 agent、一个工具 {#s-serve-mcp-and-serve-acp-serve-mcp-one-agent-one-tool}

**serve mcp：** “Start an MCP server that exposes the agent via the Model Context Protocol. By default, uses stdio transport” {{help-agent docker-agent serve mcp}}，默认 stdio 提供 MCP agent 服务器。`--http` 切到 `127.0.0.1:8081` 的流式 HTTP。不带 `-a` 时，团队每个 agent 都成为独立工具；只暴露一个时，`--tool-name` 重命名工具 {{help-agent docker-agent serve mcp}}。

`--attach` 暴露运行中 TUI 的会话，按 pid、地址或会话 id 查找。`--mcp-keepalive` 仅用于 stdio；`--auth-token`、`--insecure-no-auth` 和 `--safety` 仅用于 `--http` {{help-agent docker-agent serve mcp}}。HTTP 安全策略默认 `restricted` {{docs-agent MCP Mode}}。

录制用[serve api 与 serve chat](#s-serve-api-and-serve-chat) 的文件运行 `serve mcp fixtures/agents/pong.yaml --http --listen 127.0.0.1:8081 --tool-name pong`：

```listing
title: 对 /mcp 的 initialize、tools/list 与 tools/call
source: capture/out/23-mcp.http
lang: http
note: headers、客户端信息及 notifications/initialized 交互已截去。tools/list 行在工具定义内截断。
---
POST /mcp HTTP/1.1
…
  "method": "initialize",
  "params": {
    "protocolVersion": "2026-07-28",
…
Content-Type: text/event-stream
…
event: message
data: {"jsonrpc":"2.0","id":1,"result":{"capabilities":{"logging":{},"tools":{"listChanged":true}},"protocolVersion":"2025-11-25","serverInfo":{"name":"docker agent","version":"v1.149.0"}}}
…
data: {"jsonrpc":"2.0","id":2,"result":{"ttlMs":0,"cacheScope":"public","tools":[{"annotations":{"destructiveHint":false,"idempotentHint":true,"openWorldHint":false,"readOnlyHint":true,…"inputSchema":{…"properties":{"message":{"description":"the message to send to the agent","type":"string"}},"required":["message"],"type":"object"},"name":"pong","outputSchema":{…
…
data: {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"{\"response\":\"pong\"}"}],"structuredContent":{"response":"pong"}}}
```

客户端请求 `2026-07-28`，v1.129.0 以“stateless Streamable HTTP transport” {{rel-agent v1.129.0}} 加入此修订，即无状态传输。服务器却回答 `2025-11-25`，所以版本应从结果读取，不能看自己的请求。所有响应均无 `Mcp-Session-Id` header。每个回答是一个 SSE `message` 事件；通知收到 `202 Accepted`（capture/out/23-mcp.http）。

工具接受一个字符串 `message`，返回 `structuredContent.response`，`content` 中也有相同文字的 JSON 字符串。注解标为只读且幂等，标题是 agent 的 `description`。`tools/call` 在整轮结束后一次返回，之前没有进度通知。套件 README 还指出 `/` 与 `/mcp` 都响应（capture/README.md）。文档在 Claude Code 中用 `claude mcp add --transport stdio`，后接 `-- docker agent serve mcp` 和引用注册 stdio 形式 {{docs-agent MCP Mode}}。

## serve acp：发给编辑器的 JSON-RPC 行 {#s-serve-mcp-and-serve-acp-serve-acp-json-rpc-lines-to-an-editor}

**serve acp：** “communicates over stdio (standard input/output)” {{docs-agent ACP}}，通过标准输入输出通信。编辑器启动 `docker-agent serve acp FILE`，向 stdin 写 JSON-RPC 请求，从 stdout 读响应与通知。会话存于 `<data-dir>/session.db`，除非 `-s` 指定其他文件 {{help-agent docker-agent serve acp}}。团队文件也可用，文档说子 agent 无需为 ACP 修改 {{docs-agent ACP}}。

```listing
title: stdio 上的 initialize 与 session/new
source: capture/out/23-acp.jsonl
lang: jsonl
note: >> 行写入 stdin，<< 行读自 stdout。各对象在标记位置内部截断。
---
>> {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": 1, …}}
<< {"id": 1, "jsonrpc": "2.0", "result": {"agentCapabilities": {"auth": {"logout": {}}, "loadSession": true, …, "agentInfo": {"name": "docker agent", "title": "docker agent", "version": "v1.149.0"}, …, "protocolVersion": 1}}
>> {"jsonrpc": "2.0", "id": 2, "method": "session/new", "params": {"cwd": "$CAPTURE", "mcpServers": []}}
<< {"jsonrpc": "2.0", "method": "session/update", "params": {"sessionId": "<uuid>", "update": {"availableCommands": [{"description": "Summarize and compact session history", …, "name": "compact"}, {"description": "Display current context token usage and session cost", "name": "usage"}], "sessionUpdate": "available_commands_update"}}}
<< {"id": 2, "jsonrpc": "2.0", "result": {"configOptions": [{"category": "mode", "currentValue": "default", …}], "modes": {…, "currentModeId": "default"}, "sessionId": "<uuid>"}}
```

`initialize` 返回 `agentCapabilities`：`loadSession`、HTTP/SSE MCP 服务器、音频、图像及嵌入上下文 prompt，以及 `close`、`delete`、`list`、`resume` 会话操作。唯一认证方法为 `host-credentials`，与会话删除一同在 v1.144.0 新增 {{rel-agent v1.144.0}}。`session/new` 结果前，`session/update` 通知列 slash 命令。v1.143.0 宣布 `/compact`、`/usage` 和 `/new` {{rel-agent v1.143.0}}，录制列表却没有 `new`。

会话从 `default` 模式开始，只读自动批准，其余询问。模式列表在四种 `--safety` 值之外增加 `default`。客户端用 `session/set_config_option` 或旧 `session/set_mode` 改模式 {{rel-agent v1.144.0}}。录制止于 `session/new`，未展示 ACP prompt 轮次。文档用 `agent/run` 草绘宿主侧，并称其为伪代码 {{docs-agent ACP}}。应使用录制的方法名。

```figure
id: fig-6-2
kind: flow
title: 同一文件通过 ACP 与 MCP 服务
claim: 同一 pong.yaml 经 stdin/stdout 回答编辑器，经8081端口 HTTP POST 回答 MCP 客户端，两路方法名不同。
caption: 每个区域从左到右读，下方框按顺序列消息，>> 是请求，<< 是响应或通知。来源为 capture/out/23-acp.jsonl 与 23-mcp.http。
```

`serve mcp` 底层协议见 [MCP 传输课程](phases/13-tools-and-protocols/09-mcp-transports)。

```takeaways
- 从 `initialize` 结果读 `protocolVersion`，不从自己的请求读。
- `--tool-name` 应说明工具作用。
- `serve mcp --http` 设置 `--safety` 和 `--auth-token`；stdio 不接受它们。
- 用 `session/set_config_option` 逐会话选择 ACP 模式。
```

Sources: help-agent docker-agent serve mcp, serve acp (research/sources/help-docker-agent.md); docs-agent MCP Mode, ACP (research/sources/docs-docker-agent.md); rel-agent v1.129.0, v1.143.0, v1.144.0 (research/sources/docker-agent-CHANGELOG.md); research/plan.md, Part 6; capture/README.md; capture/fixtures/agents/pong.yaml; capture/out/23-mcp.http, 23-acp.jsonl
