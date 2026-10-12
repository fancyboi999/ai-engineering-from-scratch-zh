# AgentCard 字段

> `AgentCard` 有 14 个字段，其中八个为 REQUIRED，共同说明 agent 提供什么、如何访问以及有什么要求。

planner 即将把第一次测试交给 `test-runner`，它只知道该 agent 位于 `localhost:41241`。第一个请求是用 `GET` 获取一份 JSON 文档。

读完本节后，你可以逐字段阅读任意 agent 卡片，并说出有效卡片必须包含哪些字段。

## 卡片与 REQUIRED 字段 {#s-agentcard-fields-the-card-and-its-required-fields}

**agent 卡片：** A2A 服务器发布的 JSON 元数据文档，描述身份、能力、技能、服务端点和认证要求。每台服务器都必须提供一张卡片。 {{spec §2.2}} {{spec §8.1}}

proto 消息 `AgentCard` 有 14 个字段，八个为 REQUIRED：`name`、`description`、`supportedInterfaces`、`version`、`capabilities`、`defaultInputModes`、`defaultOutputModes` 和 `skills`。有效消息中，REQUIRED 字段必须存在并赋值。 {{proto AgentCard}} {{spec §5.7}}

其中四个字段是列表，必需数组必须至少包含一个元素。§8.4.1 的签名示例却保留了空 `skills` 列表（[冲突 D19](#s-ref-sources)，仍开放的 [issue #2122](https://github.com/a2aproject/A2A/issues/2122)），真实卡片应遵循 §5.7。 {{spec §5.7}} {{spec §8.4.1}}

[此图](#fig-agent-card-fields)将完整的 `test-runner` 卡片分为四组：它是谁、如何访问、有什么要求、提供什么。身份字段中的 `version` 是 agent 自身的发布版本，[扩展卡片与签名](#s-extended-cards-and-signatures)介绍 `signatures`。

```figure
id: fig-agent-card-fields
kind: structure
title: 逐字段看 test-runner 的 agent 卡片
claim: 一次 `GET` 返回客户端发送首条消息前所需的信息：agent 是谁、如何访问、有什么要求以及提供什么。
caption: 每行是一个字段，按它回答的问题分组。圆点标记 proto 中 REQUIRED 字段，虚线行是这张卡片省略的可选字段。来自 capture/out/01-agent-cards.http。
```

## 提供什么：技能与模式 {#s-agentcard-fields-what-it-offers-skills-and-modes}

**技能：** `skills` 中的一个条目，即 agent 声称能完成的工作单元。每个技能需要 `id`、`name`、`description`，以及至少一个 `tags` 条目。可选的 `examples` 保存示例 prompt，技能还可以有自己的模式和 `securityRequirements`。 {{spec §5.7}} {{proto AgentSkill}}

```listing
title: test-runner 卡片上的唯一技能
source: capture/out/01-agent-cards.http
lang: json
note: 文件中第一张卡片的完整 skills 数组。
---
  "skills": [
    {
      "id": "run-tests",
      "name": "Run tests",
      "description": "Run the test suite of a repository at one commit and report each failure with its log.",
      "tags": [
        "ci",
        "tests"
      ],
      "examples": [
        "Run the unit tests for payments-api at commit 9f3c2e1"
      ]
    }
  ]
```

`SendMessageRequest` 和 `Message` 都没有指定技能的字段，proto 称技能列表主要是描述性概念。 {{proto SendMessageRequest}} {{proto AgentCard}}

**模式：** 标识 agent 接受或产生的内容的媒体类型，如 `text/plain`。必需的 `defaultInputModes` 和 `defaultOutputModes` 列表适用于所有技能，各技能可用自身 `inputModes` 和 `outputModes` 覆盖默认值。`code-reviewer` 卡片将 `review-diff` 技能的输入缩小至 `text/x-diff` 和 `text/plain`。 {{proto AgentCard}}

## 如何访问：supportedInterfaces {#s-agentcard-fields-where-to-reach-it-supportedinterfaces}

**接口：** `supportedInterfaces` 中的条目，包含 URL、绑定以及该地址支持的协议版本。`url`、`protocolBinding`、`protocolVersion` 为 REQUIRED，`tenant` 可选。顺序有意义：接口列表有序，首项为首选。 {{proto AgentInterface}} {{proto AgentCard}}

```listing
title: test-runner 的两个接口，JSON-RPC 优先
source: capture/out/01-agent-cards.http
lang: json
note: 文件中第一张卡片的完整 supportedInterfaces 数组。
---
  "supportedInterfaces": [
    {
      "url": "http://localhost:41241/a2a/jsonrpc",
      "protocolBinding": "JSONRPC",
      "protocolVersion": "1.0"
    },
    {
      "url": "http://localhost:41241/a2a/rest",
      "protocolBinding": "HTTP+JSON",
      "protocolVersion": "1.0"
    }
  ],
```

proto 指定三种标准绑定：`JSONRPC`、`GRPC`、`HTTP+JSON`。`protocolVersion` 是该 URL 支持的 A2A 版本，格式为 `Major.Minor`。[版本与扩展头](#s-version-and-extension-headers)介绍对应的 `A2A-Version` 头。 {{proto AgentInterface}} {{spec §3.6}}

生产环境每个 URL 必须是有效的绝对 HTTPS URL，套件在单机上使用 `http://localhost`。规范未说明 `GRPC` 条目的格式，参考 SDK 示例直接写主机和端口（[冲突 D34](#s-ref-sources)）。 {{proto AgentInterface}} {{sdk samples/hello_world_agent.py}}

## 有什么要求：能力与安全 {#s-agentcard-fields-what-it-demands-capabilities-and-security}

**能力：** 必需的 `capabilities` 对象中的标志，用于开启协议的可选部分：`streaming`、`pushNotifications` 或 `extendedAgentCard`。缺失等同于 `false`，[发现](#s-discovery-and-supported-interfaces)列出各标志允许的操作。同一对象还按 `uri` 列出 `extensions`，见[扩展](#s-extensions)。 {{proto AgentCapabilities}} {{spec §3.3.4}}

可选的 `securitySchemes` 和 `securityRequirements` 说明调用所需凭据。`test-runner` 卡片两者都不设置，[安全方案](#s-security-schemes-and-in-task-authorization)解读 `deployer` 卡片上的 bearer 方案。 {{proto AgentCard}}

1.0 将 0.3 卡片的五个顶层字段移入 `supportedInterfaces` 和 `capabilities`，[从 0.3 到 1.0](#s-from-0-3-to-1-0)逐一列出映射。§A.2.1 的迁移步骤仍使用 1.0 proto 中不存在的 `protocolVersions` 卡片字段（[冲突 D8](#s-ref-sources)）。[PR #2165](https://github.com/a2aproject/A2A/pull/2165)在 v1.0.1 之后的 main 上修复，尚未发布。§8.5 示例卡片仍写 `security`，而 proto 是 `securityRequirements`（[冲突 D6](#s-ref-sources)）。[PR #2046](https://github.com/a2aproject/A2A/pull/2046)在 main 上修复该示例，也尚未发布。 {{docs whats-new-v1}} {{spec §A.2.1}} {{spec §8.5}} {{proto AgentCard}}

```takeaways
- 从 `supportedInterfaces` 首项获取首选端点，不要读顶层 `url`。
- 拒绝缺少 REQUIRED 字段或将 REQUIRED 列表留空的卡片。
- 根据技能与模式选择 agent。
```

Sources: spec §2.2, §3.3.4, §3.6, §5.7, §8.1, §8.4.1, §8.5, §A.2.1 (research/sources/specification.md); proto AgentCard, AgentProvider, AgentSkill, AgentInterface, AgentCapabilities, SendMessageRequest (research/sources/a2a.proto); docs/whats-new-v1.md at v1.0.1; sdk samples/hello_world_agent.py; capture/out/01-agent-cards.http
