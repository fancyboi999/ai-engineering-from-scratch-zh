# 扩展

> 扩展由卡片声明 URI，客户端每次请求用 `A2A-Extensions` 激活，双方以该 URI 为键在 metadata 携带内容。

`01-agent-cards.http` 的三张卡片不声明扩展，因此 planner 发送普通请求。若 reviewer 为每项发现返回引用，就需要核心协议没有的数据，扩展在 URI 下添加它。读完本节后，你可以读取扩展声明，在请求上激活，并处理缺失的必需扩展。

## 卡片中的 AgentExtension {#s-extensions-agentextension-in-the-card}

**扩展：** 以 URI 标识、由自己的规范定义的协议补充。agent 在 `capabilities.extensions` 以 `AgentExtension` 声明，每项有四个可选字段。 {{docs extensions}} {{proto AgentCapabilities}} {{proto AgentExtension}}

- `uri`：唯一标识扩展的 URI。 {{proto AgentExtension}}
- `description`：此 agent 如何使用扩展。
- `required`：客户端必须理解并遵循扩展要求时为 true。 {{proto AgentExtension}}
- `params`：扩展专用配置参数，以 JSON 对象表示。 {{proto AgentExtension}}

§4.6.1 将数组放在 `AgentCard` 自身，迁移指南读取 `agentCard.extensions`。proto 放在 `capabilities` 下，因此读取 `capabilities.extensions`。 {{spec §4.6.1}} {{docs whats-new-v1}}

```listing
title: §4.6.1 示例卡片上的两个可选扩展
source: research/sources/specification.md
lang: json
note: 示例卡片只保留 capabilities。该示例还发送 protocolVersion 0.3，并有尾随逗号（[冲突 D24](#s-ref-sources)）。
---
  "capabilities": {
    "streaming": false,
    "pushNotifications": false,
    "extensions": [
      {
        "uri": "https://standards.org/extensions/citations/v1",
        "description": "Provides citation formatting and source verification",
        "required": false
      },
      {
        "uri": "https://example.com/extensions/geolocation/v1",
        "description": "Location-based search capabilities",
        "required": false
      }
    ]
  },
```

## 在请求上激活扩展 {#s-extensions-activating-an-extension-on-a-request}

客户端在 `A2A-Extensions` 服务参数中列出想使用的 URI，是逗号分隔的扩展 URI 列表。[A2A-Version 与 A2A-Extensions](#s-version-and-extension-headers)说明各绑定如何传输参数。 {{spec §3.2.6}}

`Message.extensions` 列出消息包含或向其贡献内容的扩展 URI，负载位于 `metadata` 中，以同一 URI 为键。规范只通过示例展示此键法。`Artifact.extensions` 同理。 {{proto Message}} {{spec §4.6.2}} {{proto Artifact}}

```listing
title: §4.6.1 请求：头指定扩展，metadata 携带数据
source: research/sources/specification.md
lang: http
note: §4.6.1 卡片下的 HTTP 示例。它省略 REQUIRED 的 messageId（[冲突 D23](#s-ref-sources)）。
---
POST /message:send HTTP/1.1
Host: agent.example.com
Content-Type: application/a2a+json
Authorization: Bearer token
A2A-Extensions: https://example.com/extensions/geolocation/v1,https://standards.org/extensions/citations/v1

{
  "message": {
    "role": "ROLE_USER",
    "parts": [{"text": "Find restaurants near me"}],
    "extensions": ["https://example.com/extensions/geolocation/v1"],
    "metadata": {
      "https://example.com/extensions/geolocation/v1": {
        "latitude": 37.7749,
        "longitude": -122.4194
      }
    }
  }
}
```

指南补充第三步：响应 `SHOULD` 包含 A2A-Extensions 头，列出该请求成功激活的全部扩展。规范无此规则，SDK 各异。a2a-js 三种绑定都回传该头，a2a-go 和 a2a-java 只作为 gRPC 响应 metadata 回传。a2a-python、a2a-dotnet、a2a-rs 从不写入。[此图](#fig-extension-activation)展示交换。 {{docs extensions}} {{sdk-js src/server/express/json_rpc_handler.ts at v1.3.0}} {{sdk-go a2agrpc/v1/handler.go at v2.6.0}} {{sdk-java reference/grpc/src/main/java/org/a2aproject/sdk/server/grpc/quarkus/A2AExtensionsInterceptor.java at v1.4.0.Final}} {{sdk src/a2a/extensions/common.py}} {{sdk-dotnet src/A2A/Models/AgentExtension.cs at v1.0.0-preview2}} {{sdk-rust a2a/src/lib.rs at a2a-server-lf-v0.5.1}}

```figure
id: fig-extension-activation
kind: sequence
title: 激活扩展，以及必需扩展缺失的错误
claim: 卡片列出扩展，请求在 `A2A-Extensions` 指定它并按 URI 保存数据，缺少必需扩展时返回 -32008。
caption: 从上到下读。步骤 1 至 4 遵循 §4.6.1 示例卡片、请求及扩展指南的激活步骤。步骤 5、6 展示 §3.3.4 对必需扩展的规则，示例本身没有必需扩展。套件不声明扩展，因此没有采集。URI 缩短为最后两段路径。
```

## 必需扩展与版本 {#s-extensions-required-extensions-and-versions}

卡片标记扩展 `required: true` 而客户端未声明时，agent `MUST` 返回 `ExtensionSupportRequiredError`：`-32008`、HTTP 400 或 gRPC `FAILED_PRECONDITION`，见[错误](#s-errors)。只有 a2a-java 内置检查。参考 SDK 仅以 `requested_extensions` 暴露请求的 URI，从不抛出该错误。 {{spec §3.3.4}} {{spec §5.4}} {{sdk-java server-common/src/main/java/org/a2aproject/sdk/server/extensions/A2AExtensions.java at v1.4.0.Final}} {{sdk src/a2a/server/routes/common.py}} {{sdk src/a2a/utils/errors.py}}

扩展 URI 标识 `SHOULD` 包含版本信息，破坏性变更 `MUST` 创建新 URI。agent 对未知版本的可选扩展忽略，对必需扩展报错，`MUST NOT` 自动回退到扩展的旧版本。 {{spec §4.6.3}}

## 类型、治理与现有扩展 {#s-extensions-kinds-governance-and-what-exists}

扩展指南列出四种类型：纯数据扩展给卡片加结构化数据，profile 扩展收窄核心消息的取值，method 扩展添加 RPC 方法，状态机扩展添加状态，但[任务与任务状态](#s-task-and-task-state)不接受新增状态（[冲突 D29](#s-ref-sources)）。 {{docs extensions}}

`a2aproject` 组织有两级扩展治理：官方扩展放在 `ext-{name}` 仓库，URI 前缀为 `https://a2a-protocol.org/extensions/`，实验扩展放在 `experimental-ext-{name}`。SDK 中扩展 `MUST` 默认禁用，须显式启用，协议合规不要求支持扩展。 {{docs extension-and-binding-governance}}

2026-10-06，该组织没有 `ext-` 仓库，尚无官方扩展。仅有一个实验扩展：[experimental-ext-oid4vp-auth](https://github.com/a2aproject/experimental-ext-oid4vp-auth/tree/e86356d4a330ede795eb5b458fd2a838ffea0064)，用 OpenID for Verifiable Presentations 实现任务内授权。agent 将任务移到 `TASK_STATE_AUTH_REQUIRED`，在 `metadata` 的扩展 URI 下放授权请求，让钱包回答。它基于[任务内授权](#s-security-schemes-and-in-task-authorization)，README 允许破坏性变更。指南列出的四个示例扩展在 a2a-samples 中，不属于上述两级：[timestamp](https://github.com/a2aproject/a2a-samples/tree/6603ba3f2c31a7ef33e70b9d8b5b5f8be42ac9a3/extensions/timestamp)、[traceability](https://github.com/a2aproject/a2a-samples/tree/6603ba3f2c31a7ef33e70b9d8b5b5f8be42ac9a3/extensions/traceability)、[secure-passport](https://github.com/a2aproject/a2a-samples/tree/6603ba3f2c31a7ef33e70b9d8b5b5f8be42ac9a3/extensions/secure-passport)、[agp](https://github.com/a2aproject/a2a-samples/tree/6603ba3f2c31a7ef33e70b9d8b5b5f8be42ac9a3/extensions/agp)。

```takeaways
- 调用 agent 前读取 `capabilities.extensions`，支持所有标为必需的扩展。
- 用 `A2A-Extensions` 发送所需 URI，各负载在 `metadata` 中以 URI 为键。
- 将 `-32008` 视为卡片问题，重试前重新读卡片。
- 破坏性变更创建新 URI。
```

Sources: spec §3.2.6, §3.3.2, §3.3.4, §4.6, §4.6.1, §4.6.2, §4.6.3, §5.4 (research/sources/specification.md); proto AgentCapabilities, AgentExtension, Message, Artifact (research/sources/a2a.proto); docs extensions, whats-new-v1, extension-and-binding-governance (research/sources/docs.md); sdk src/a2a/extensions/common.py, src/a2a/server/routes/common.py, src/a2a/utils/errors.py at a2a-python 1.2.2; sdk-js src/server/express/json_rpc_handler.ts at v1.3.0; sdk-go a2agrpc/v1/handler.go at v2.6.0; sdk-java reference/grpc/src/main/java/org/a2aproject/sdk/server/grpc/quarkus/A2AExtensionsInterceptor.java, server-common/src/main/java/org/a2aproject/sdk/server/extensions/A2AExtensions.java at v1.4.0.Final; sdk-dotnet src/A2A/Models/AgentExtension.cs at v1.0.0-preview2; sdk-rust a2a/src/lib.rs at a2a-server-lf-v0.5.1; a2aproject/experimental-ext-oid4vp-auth at e86356d; a2aproject/a2a-samples at 6603ba3; capture/out/01-agent-cards.http
