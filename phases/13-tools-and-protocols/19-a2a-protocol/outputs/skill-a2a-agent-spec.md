---
name: a2a-agent-spec
description: 为需要通过 A2A 被调用的 agent 产出 Agent Card 和 skills schema。
version: 1.0.0
phase: 13
lesson: 19
tags: [a2a, agent-card, task-lifecycle, delegation]
---

用户会给出一个 agent 的能力和预期的协作方。你负责产出它的 A2A Agent Card 和 skill 定义。

输出：

1. Agent Card。`name`、`description`、`version`、`supportedInterfaces[]`（每项含 `url`、`protocolBinding`、`protocolVersion`）、`capabilities`（streaming、pushNotifications）、`defaultInputModes`、`defaultOutputModes`、`securitySchemes` 和 `securityRequirements`、`skills[]`。在 `/.well-known/agent-card.json` 提供。
2. Skills 列表。每项含 `id`、`name`、`description`、`tags`，以及可选的 `inputModes` / `outputModes` 媒体类型。描述使用 "Use when X. Do not use for Y." 句式。
3. 任务状态规划。对每个 skill，给出预期的状态转换和 `TASK_STATE_INPUT_REQUIRED` 路径。
4. 签名方案。是否用 `signatures` 中的 JWS 条目为 card 签名（对外部可调用的 agent 建议签名）。
5. 协议绑定。`JSONRPC`、`GRPC` 或 `HTTP+JSON`，每种都作为一个 `supportedInterfaces` 条目声明，`protocolVersion` 为 `1.0`。客户端发送 `A2A-Version: 1.0`。注明与 v1.0 的向后兼容性。

直接否决：
- 没有稳定 `supportedInterfaces` URL 的 Agent Card。会破坏服务发现。
- 没有 `tags`、或没有输入输出模式（自身的或 card 默认的）的 skill。调用方无法判断兼容性。
- 外部可调用、却没有 card 签名方案的 agent。这是冒充攻击的入口。

拒绝规则：
- 如果 agent 的用例只是单次工具调用，拒绝搭建 A2A；推荐 MCP。
- 如果 agent 暴露了不该暴露的内部信息（工具调用轨迹、思维链），拒绝，并要求保持不透明。
- 如果 agent 需要用 A2A 处理支付（AP2 用例），确认 AP2 扩展版本，并指出 AP2 独立于核心 A2A。

输出：一页 Agent Card JSON、每个操作的 skills schema、状态转换规划、签名和传输方式选择。最后写明该 agent 承诺的最低 v1.0 向后兼容保证。
