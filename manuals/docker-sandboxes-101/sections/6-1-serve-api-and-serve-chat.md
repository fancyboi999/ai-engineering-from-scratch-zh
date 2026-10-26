# serve api 与 serve chat

> `serve api` 是原生控制平面，在8080端口提供会话和 SSE 运行流；`serve chat` 是8083端口的 OpenAI 兼容子集。

agent 文件在终端回答得很好，现在网页与 CI 作业要通过 HTTP 调用。网页需要一轮中的全部事件，CI 只懂 OpenAI chat 格式。

读完本节，你能用同一文件启动两个服务器，分别运行一轮并读取事件流。

## 一个文件、五种服务器 {#s-serve-api-and-serve-chat-one-agent-file-five-servers}

`a2a`、`acp`、`api` 和 `mcp` 在 v1.23.4 移到 `serve` 下 {{rel-agent v1.23.4}}；v1.53.0 新增 `chat` {{rel-agent v1.53.0}}。v1.149.0 帮助列出五种 {{help-agent docker-agent serve}}。本部分以五种方式服务同一小文件，其中唯一 agent `root` 对任何消息都回答 pong：

```listing
title: 第6.1至6.3节的服务 agent 文件
source: capture/fixtures/agents/pong.yaml
lang: yaml
---
version: "16"

agents:
  root:
    model: local
    description: Answers every message with the word pong.
    instruction: Reply with exactly the word pong and nothing else.

models:
  local:
    provider: dmr
    model: ai/qwen3:4b
    temperature: 0
```

## serve api：先会话，再运行 {#s-serve-api-and-serve-chat-serve-api-a-session-then-a-run}

**serve api：** {{docs-agent API Server}}，通过 REST 风格 API 和 SSE 提供 agent。监听 `127.0.0.1:8080`；`--auth-token` 为空表示不认证 {{help-agent docker-agent serve api}}。`--max-request-size` 对超过1 MiB 的正文返回413；`--session-workingdir-root` 限制新会话的 `working_dir` {{help-agent docker-agent serve api}}。

这里会话数据库默认值不同。`serve api -s` 在当前目录写 `session.db`，而 `run`、`serve a2a` 和 `serve acp` 用 `<data-dir>/session.db` {{help-agent docker-agent serve api}}（[冲突 C63](#s-ref-sources-and-the-conflicts-register)）。录制传入 `-s work/api-session.db` 与 `--fake work/cassettes/23-api`，由 cassette 给出模型回答（capture/out/23-serve-api.log）。

```listing
title: 列 agent、创建会话、启动运行
source: capture/out/23-api.http
lang: http
note: ping 交互、最终会话读取、Host 与 Date headers 以及多数会话对象字段已截去。
---
GET /api/agents HTTP/1.1
…
    "name": "pong",
    "description": "Answers every message with the word pong.",
    "multi": false
…
POST /api/sessions HTTP/1.1
…
{}
…
  "id": "<uuid>",
  "origin": "run",
…
  "tools_approved": false,
…
POST /api/sessions/<uuid>/agent/pong HTTP/1.1
…
Accept: text/event-stream
…
      "role": "user",
      "content": "ping"
…
HTTP/1.1 200 OK
…
Content-Type: text/event-stream
```

路径中的 agent 标识是去掉 `.yaml` 的文件名，所以为 `pong`；事件则将 agent 称为 `root` {{docs-agent API Server}}。运行正文为 `messages` 数组，可选 `model` 字段为会话中该 agent 覆盖模型 {{docs-agent API Server}}。新会话 `tools_approved: false`；工具调用会发 `tool_call_confirmation`，客户端用 `POST /api/sessions/:id/resume` 回答 {{docs-agent API Server}}。

## 运行流 {#s-serve-api-and-serve-chat-the-run-stream}

```listing
title: 一轮中的十帧
source: capture/out/23-api-run.sse
lang: sse
note: token_usage 帧的 usage 对象已截去。套件写文件前丢弃推理帧。
---
data: {"agent_name": "root", "available_agents": [{"description": "Answers every message with the word pong.", "model": "ai/qwen3:4b", "name": "root", "provider": "dmr"}], "current_agent": "root", "timestamp": "<ts>", "type": "team_info"}
data: {"agent_name": "root", "available_tools": 0, "loading": false, "timestamp": "<ts>", "type": "toolset_info"}
data: {"message": "ping", "session_id": "<uuid>", "session_position": 0, "timestamp": "<ts>", "type": "user_message"}
data: {"agent_name": "root", "session_id": "<uuid>", "timestamp": "<ts>", "type": "stream_started"}
data: {"agent_name": "root", "available_tools": 0, "loading": false, "timestamp": "<ts>", "type": "toolset_info"}
data: {"agent_name": "root", "description": "Answers every message with the word pong.", "model": "dmr/ai/qwen3:4b", "timestamp": "<ts>", "type": "agent_info"}
data: {"agent_name": "root", "content": "pong", "message_id": "<uuid>", "session_id": "<uuid>", "timestamp": "<ts>", "type": "agent_choice"}
data: {"agent_name": "root", "session_id": "<uuid>", "timestamp": "<ts>", "type": "message_added"}
data: {"agent_name": "root", "session_id": "<uuid>", "timestamp": "<ts>", "type": "token_usage", …}
data: {"agent_name": "root", "finish_reason": "stop", "reason": "normal", "session_id": "<uuid>", "timestamp": "<ts>", "type": "stream_stopped"}
```

文档列八种事件，从 `stream_started` 到 `error` {{docs-agent API Server}}。录制另有六种：`team_info`、`toolset_info`、`user_message`、`agent_info`、`message_added` 和 `token_usage`。pong agent 没有工具，所以没有 `tool_call` 帧。文件最后请求读回会话，存储的 assistant 消息在答案旁保留 `reasoning_content`（capture/out/23-api.http）。[图](#fig-6-1) 展示完整交互。

```figure
id: fig-6-1
kind: sequence
title: 一个 serve api 会话与一次流式运行
claim: 先创建并存储会话，再向 agent 路径 POST；整轮以从 team_info 到 stream_stopped 的 SSE 帧返回。
caption: 从上向下读。墨色实线是请求，墨色虚线是回复，靛蓝点线是 SSE 帧；青绿色箭头存会话，梅紫箭头为 cassette 回答的模型调用。来源为 capture/out/23-api.http 与 23-api-run.sse。
```

一次运行是一项请求，会话比请求活得久。`/steer` 向运行中轮次注入消息，`/followup` 排队消息并可带 `Idempotency-Key`，`/fork` 将会话复制到一条用户消息处 {{docs-agent API Server}}。`GET /api/sessions/:id/events` 是会话级流，可从 `Last-Event-ID` 或 `?since=` 恢复 {{docs-agent API Server}}。交互式 `docker-agent run --listen ADDR` 提供同一控制平面，正文固定上限1 MiB，无 `--auth-token`。帮助没有此 flag；每次运行写 `<data-dir>/runs/<pid>.json` 供发现 {{docs-agent API Server}}。

## serve chat：OpenAI 兼容子集 {#s-serve-api-and-serve-chat-serve-chat-the-openai-compatible-subset}

**serve chat：** {{help-agent docker-agent serve chat}}，在这两个路径提供兼容 API。模型 id 为 agent 名称，所以录制列 `root`（文件内名称），而 `serve api` 用 `pong`（文件名）。

```listing
title: 模型列表、一次 completion 与无 token 请求
source: capture/out/23-chat.http
lang: http
note: headers、ids、时间戳及 usage 对象已截去。
---
GET /v1/models HTTP/1.1
…
Authorization: Bearer m101-chat-key
…
      "id": "root",
…
      "owned_by": "docker-agent",
…
POST /v1/chat/completions HTTP/1.1
…
        "role": "assistant",
        "content": "pong"
…
HTTP/1.1 401 Unauthorized
…
    "message": "missing or invalid bearer token",
```

服务器默认不保留对话，每次请求携带完整历史。`--conversations-max` 缓存最多 N 个以 `X-Conversation-Id` 为键的对话；`--conversation-ttl` 30分钟后淘汰 {{help-agent docker-agent serve chat}}。失败轮次不改变缓存，客户端可用相同 id 重试 {{docs-agent Chat Server}}。正文 `stream: true` 返回 `chat.completion.chunk` delta 的 SSE 流 {{docs-agent Chat Server}}。`--max-idle-runtimes` 每 agent 保留四个空闲运行时；`--request-timeout` 每请求五分钟，含模型与工具调用 {{help-agent docker-agent serve chat}}。非回环监听需 `--api-key`、`--api-key-env` 或 `--insecure-no-auth` {{docs-agent Chat Server}}。

| | `serve api` | `serve chat` |
|---|---|---|
| 默认地址 | `127.0.0.1:8080` | `127.0.0.1:8083` |
| token flag | `--auth-token` | `--api-key` 或 `--api-key-env` |
| 录制中的 agent id | 文件名 `pong` | agent 名 `root` |
| 状态 | `-s` 会话，默认 `session.db` | 无，或按 `X-Conversation-Id` 缓存 |
| 工具批准 | `tool_call_confirmation`，然后 `resume` | `--safety`，默认 `restricted` {{docs-agent Chat Server}} |
| Cassette | `--fake` 和 `--record` | 无 |

```takeaways
- 客户端要看工具确认与全部事件时用 `serve api`。
- 只懂 OpenAI chat 格式的客户端用 `serve chat`。
- 为 `serve api` 传 `-s`，否则当前目录会写入 `session.db`。
- 绑定非回环地址前先设置 token。
```

Sources: help-agent docker-agent serve, serve api, serve chat (research/sources/help-docker-agent.md); docs-agent API Server, Chat Server (research/sources/docs-docker-agent.md); rel-agent v1.23.4, v1.53.0 (research/sources/docker-agent-CHANGELOG.md); research/conflicts-register.md row C63; research/plan.md, Part 6; capture/README.md; capture/fixtures/agents/pong.yaml; capture/out/23-serve-api.log, 23-api.http, 23-api-run.sse, 23-chat.http
