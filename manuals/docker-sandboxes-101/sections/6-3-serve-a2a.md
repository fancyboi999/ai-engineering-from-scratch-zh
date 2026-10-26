# serve a2a

> `serve a2a` 在8082端口发布 A2A 1.0 agent card，以完成的任务回答 `SendMessage`；其 card 违反 A2A 1.0.1 的三条 REQUIRED 规则。

其他团队的规划器使用 A2A，想委派任务。它会获取 card、发送消息、读取任务，如 A2A 101 手册的 [SendMessage](manuals/a2a-101/sections/4-1-send-message.md) 所教。

读完本节，你能提供 A2A agent 服务，以1.0名称调用，并预测严格客户端会在哪里拒绝。

## well-known 路径的 card {#s-serve-a2a-the-card-at-the-well-known-path}

**serve a2a：** {{help-agent docker-agent serve a2a}}，启动 A2A agent 服务器。监听 `127.0.0.1:8082`；`-a` {{help-agent docker-agent serve a2a}}，默认团队首个 agent，而旧插件默认 `root`（[冲突 C64](#s-ref-sources-and-the-conflicts-register)）。`--auth-token` 覆盖 card 与所有调用，非回环监听需它或 `--insecure-no-auth` {{docs-agent A2A Protocol}}。会话安全策略默认 `restricted` {{docs-agent A2A Protocol}}。

Docker Agent 文档没写 card 路径或协议版本（[冲突 C71](#s-ref-sources-and-the-conflicts-register)）。录制在 `/.well-known/agent-card.json` 找到 card；`/.well-known/agent.json` 及对 `/` 的 POST 都返回404（capture/README.md）。

```listing
title: serve a2a 为 pong.yaml 发布的 agent card
source: capture/out/23-agent-card.json
lang: json
---
{
  "supportedInterfaces": [
    {
      "url": "http://127.0.0.1:8082/invoke",
      "protocolBinding": "JSONRPC",
      "protocolVersion": "1.0"
    }
  ],
  "capabilities": {
    "streaming": true
  },
  "defaultInputModes": [],
  "defaultOutputModes": [],
  "description": "Answers every message with the word pong.",
  "name": "pong",
  "skills": [
    {
      "description": "Answers every message with the word pong.",
      "id": "pong_",
      "name": "",
      "tags": [
        "llm",
        "docker agent"
      ]
    }
  ],
  "version": "v1.149.0"
}
```

card 名为文件名 `pong`，而 `serve chat` 用 agent 名 `root`。唯一 skill 的 id 为 `pong_`，描述取自 agent。响应还带 `Access-Control-Allow-Origin: *`，尽管未设置 `--cors-origin`，帮助说“empty disables CORS” {{help-agent docker-agent serve a2a}}，空值应关闭 CORS。

## SendMessage 与 GetTask {#s-serve-a2a-sendmessage-and-gettask}

card 指向 JSON-RPC 接口 `http://127.0.0.1:8082/invoke`，协议版本 `1.0`。录制向它发送 `SendMessage`，带 `A2A-Version: 1.0`，不带 `configuration`：

```listing
title: 1.0 名称的 SendMessage，再 GetTask
source: capture/out/23-a2a.http
lang: http
note: headers、ids、history、metadata 和 GetTask 回复已截去。
---
POST /invoke HTTP/1.1
…
A2A-Version: 1.0
…
  "method": "SendMessage",
  "params": {
    "message": {
      "messageId": "m101-0001",
      "role": "ROLE_USER",
      "parts": [
        {
          "text": "ping"
        }
…
  "result": {
    "task": {
…
      "artifacts": [
        {
          "artifactId": "<uuid>",
          "metadata": {
            "adk_partial": true
          },
          "parts": [
            {
              "data": {},
…
        {
          "artifactId": "<uuid>",
          "parts": [
            {
              "text": "pong"
…
      "status": {
        "state": "TASK_STATE_COMPLETED",
…
  "method": "GetTask",
  "params": {
    "id": "<uuid>"
  }
```

send 返回已处于 `TASK_STATE_COMPLETED` 的 `task`；`GetTask` 返回同一任务及其 `history`（capture/out/23-a2a.http）。答案 `pong` 在第二个 artifact，`history` 只保留用户消息。服务器实时调用一次 `ai/qwen3:4b`，因为 `serve a2a` 无 `--fake`。card 设置 `streaming: true`，提供 `SendStreamingMessage`，但未调用。[图](#fig-6-3) 展示交互。

自 v1.59.0 会话持久存入数据库，客户端通过 `/invoke` 携带 A2A context 恢复 {{rel-agent v1.59.0}}。与另一会话冲突的 context id 被拒绝，该会话不变 {{docs-agent A2A Protocol}}。旧程序保存的会话标为 `run`，不能经 A2A 恢复 {{docs-agent A2A Protocol}}。

```figure
id: fig-6-3
kind: sequence
title: 一个 A2A card、一次 SendMessage、一次 GetTask
claim: 客户端读 card，发送阻塞 SendMessage，触发一次模型调用，收到已完成任务，GetTask 再返回它。
caption: 从上向下读。墨色实线是请求，墨色虚线是回复，梅紫箭头为实时模型调用，琥珀框为回复中的任务状态。来源为 capture/out/23-a2a.http。
```

## 与 A2A 1.0.1 的差异 {#s-serve-a2a-where-it-differs-from-a2a-1-0-1}

本仓库 A2A 101 手册列出1.0.1规则：card 见 [AgentCard 字段](manuals/a2a-101/sections/2-1-agentcard-fields.md)，调用见 [SendMessage](manuals/a2a-101/sections/4-1-send-message.md)。下表逐项对照录制值。

| `serve a2a` 返回内容 | A2A 101 所列 A2A 1.0.1 规则 | 结果 |
|---|---|---|
| `/.well-known/agent-card.json` 的 card | 规范 §8.2 的 well-known 路径 | 匹配 |
| 一个接口：`/invoke`、`JSONRPC`、`protocolVersion: "1.0"` | `url`、`protocolBinding`、`protocolVersion` 为 REQUIRED，版本为 `Major.Minor` | 匹配 |
| `SendMessage`、`GetTask`、`ROLE_USER`、`TASK_STATE_COMPLETED` | PascalCase 方法名与1.0 enum 名称 | 匹配 |
| 无 `configuration` 的 send 返回终态任务 | send 阻塞至终态或中断态 | 匹配 |
| `skills[0].name` 是空字符串 | 每个 skill 需 `id`、`name`、`description` 及一个 tag | 不同：无 skill 名称 |
| `defaultInputModes` 与 `defaultOutputModes` 为空列表 | REQUIRED 列表至少一项 | 不同：两个空列表 |
| `version` 为 `v1.149.0` | `version` 是 agent 自身版本 | 不同：用了 docker-agent 版本 |
| task `metadata` 以 `https://google.github.io/adk-docs/a2a/a2a-extension/` 为键 | 扩展在 `capabilities.extensions` 声明，数据以 URI 为键 | 不同：card 未声明扩展 |
| artifact 唯一 part 是空 `data` 对象，标 `adk_partial` | artifact 需唯一 `artifactId` 及至少一个 part | 允许，但为空 |

`adk_*` 来自服务器底层 A2A 库，v1.129.0 迁到 `adka2a/v2` {{rel-agent v1.129.0}}。文档列四个限制，包括{{docs-agent A2A Protocol}}（[冲突 C70](#s-ref-sources-and-the-conflicts-register)），尚未集成 artifact。但录制答案以 artifact 到达，与之冲突。其他三项涉及工具事件、memory 与子 agent，pong agent 都没有，所以无法测试。

## a2a 工具集是客户端 {#s-serve-a2a-the-a2a-toolset-is-the-client-side}

agent 文件用 `type: a2a` 工具集调用远程 agent，接受 `url`、可选 `name` 和 `headers`，如 `--auth-token` 的 bearer token {{docs-agent A2A Tool}}。schema 增加 `allow_private_ips`{{schema allow_private_ips}}，显式允许这些类型拨号非公共 IP。不设置时直连拒绝回环，因此 `127.0.0.1:8082` 需 `allow_private_ips: true`。未运行此工具集。协议本身见 [A2A 课程](phases/13-tools-and-protocols/19-a2a-protocol)。

```takeaways
- 从 `/.well-known/agent-card.json` 获取 card，再 POST 到 `supportedInterfaces` URL。
- 从任务 artifacts 读答案，不从 `history` 读。
- 调用 `serve a2a` 的客户端需兼容空 skill 名称和空模式列表。
- 调用回环服务器的 `a2a` 工具集设 `allow_private_ips: true`。
```

Sources: help-agent docker-agent serve a2a (research/sources/help-docker-agent.md); docs-agent A2A Protocol, A2A Tool (research/sources/docs-docker-agent.md); schema allow_private_ips (research/sources/agent-schema.json); rel-agent v1.59.0, v1.129.0 (research/sources/docker-agent-CHANGELOG.md); research/conflicts-register.md rows C64, C70, C71; research/plan.md, Part 6; manuals/a2a-101/sections/2-1-agentcard-fields.md, 4-1-send-message.md, 2-2-discovery-and-supported-interfaces.md, 3-3-artifact-and-chunks.md, 5-1-json-rpc.md, 6-2-extensions.md; capture/README.md; capture/fixtures/agents/pong.yaml; capture/out/23-agent-card.json, 23-a2a.http
