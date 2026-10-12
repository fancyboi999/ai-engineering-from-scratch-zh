# 发现与 supportedInterfaces

> 规范只标准化卡片的 well-known 路径，客户端先选能使用的首个 `supportedInterfaces` 条目，再检查能力标志。

planner 的配置包含三个端口：`41241`、`41242`、`41243`。委派工作之前，它获取三张卡片，从每张选一个接口，记下哪些 agent 支持流式传输、哪个需要 token。

读完本节后，你可以找到 agent 卡片，选择调用接口，并避开卡片不允许的调用。

## 获取卡片的三条途径 {#s-discovery-and-supported-interfaces-three-routes-to-a-card}

规范列出三种获取卡片的方式，只标准化其中一种的细节： {{spec §8.2}}

- **Well-known URI。** 客户端从已知主机获取 `https://{server_domain}/.well-known/agent-card.json`。项目推荐公开 agent 使用此方式。 {{spec §8.2}} {{docs agent-discovery}}
- **注册中心或目录。** 客户端查询经维护的 agent 目录，目前 A2A 规范不规定此类注册中心的标准 API。 {{spec §8.2}} {{docs agent-discovery}}
- **直接配置。** 客户端使用预配置的 Agent Card URL 或内容，保存在代码、配置文件或环境变量中。 {{spec §8.2}} {{docs agent-discovery}}

planner 的端口来自 `capture/run.py` 中的直接配置，各卡片则从 well-known 路径获取。

```listing
title: 发现只需对 well-known 路径进行一次 GET
source: capture/out/01-agent-cards.http
lang: http
note: 响应体只保留首个字段。[此图](#fig-agent-card-fields)绘出完整卡片。
---
### 1 · discover test-runner
GET /.well-known/agent-card.json HTTP/1.1
Host: localhost:41241
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json

{
  "name": "test-runner",
…
}
```

严格使用规范写出的路径。项目指南的一张图仍用不含 `.json` 的 `/.well-known/agent-card`，并把 1.0 的 `POST /message:send` 写为 `POST /sendMessage`（[冲突 D32](#s-ref-sources)）。[PR #2261](https://github.com/a2aproject/A2A/pull/2261)在 v1.0.1 之后的 main 上修复该图，尚未发布。 {{docs what-is-a2a}} {{spec §5.3}}

[此图](#fig-finding-an-agent)跟踪 planner 从配置到对 `code-reviewer` 发起经过检查的调用。

```figure
id: fig-finding-an-agent
kind: flow
title: 从主机到经过检查的调用
claim: 三条途径通向同一张卡片，客户端选能使用的首个接口，并在每次可选操作前检查能力标志。
caption: 从上到下读。planner 通过配置和 well-known 路径找到 code-reviewer 卡片，选择接口 0，读取两个标志。失败调用是 capture/out/11-errors.http 中第 6 次交换。
```

## 从 supportedInterfaces 选择接口 {#s-discovery-and-supported-interfaces-choosing-from-supportedinterfaces}

规范为客户端规定四条关于 `supportedInterfaces` 的 `MUST` 规则。第一条决定端点： {{spec §8.3.2}}

```rule
label: 接口选择的第一条规则
source: spec §8.3.2
---
"Parse `supportedInterfaces` if present, and select the first supported transport"
```

支持意味着客户端实现了该绑定和版本。JSON-RPC 1.0 客户端跳过 `GRPC` 条目及版本为 `0.3` 的 `JSONRPC` 条目，因为同一张卡片可以列出同一绑定的多个版本。 {{spec §3.6.2}}

其余三条要求客户端优先选择靠前的条目，使用选中条目的 URL，并在每条请求消息中将 `tenant` 精确设为选中 `AgentInterface` 条目声明的值。套件的卡片都未设置 tenant。 {{spec §8.3.2}}

## 调用前检查能力 {#s-discovery-and-supported-interfaces-checking-capabilities-before-a-call}

```rule
label: 可选调用前读取卡片
source: spec §3.3.4
---
"Clients SHOULD validate capability support by examining the Agent Card before attempting operations that require optional capabilities."
```

服务器侧是 `MUST` 规则：卡片不允许的调用以固定错误失败。下表列出错误及 JSON-RPC 代码。 {{spec §3.3.4}} {{spec §5.4}}

| `capabilities` 中的标志 | 允许的操作 | 标志缺失或为 `false` 时的错误 |
|---|---|---|
| `streaming` | `SendStreamingMessage`、`SubscribeToTask` | `UnsupportedOperationError`、`-32004` |
| `pushNotifications` | `CreateTaskPushNotificationConfig`、`GetTaskPushNotificationConfig`、`ListTaskPushNotificationConfigs`、`DeleteTaskPushNotificationConfig` | `PushNotificationNotSupportedError`、`-32003` |
| `extendedAgentCard` | `GetExtendedAgentCard` | `UnsupportedOperationError`、`-32004` |

第 3 节称这些操作定义所有 A2A 实现必须支持的基本能力，但 agent 可以通过省略标志拒绝流式传输、推送或扩展卡片。以标志为准（[冲突 D26](#s-ref-sources)）。 {{spec §3}}

`code-reviewer` 卡片没有 `pushNotifications` 标志，套件错误场景仍向它注册 webhook：

```listing
title: 在声明不支持推送的 agent 上创建推送配置
source: capture/out/11-errors.http
lang: http
note: 第 6 次交换，只保留方法、任务 ID 和错误。JSON-RPC 错误随 HTTP 200 返回，见[错误](#s-errors)。
---
### 6 · CreateTaskPushNotificationConfig: not supported
POST /a2a/jsonrpc HTTP/1.1
Host: localhost:41242
…
  "method": "CreateTaskPushNotificationConfig",
  "params": {
    "taskId": "00000000-0000-4000-8000-000000000000",
…
HTTP/1.1 200 OK
…
    "code": -32003,
    "message": "Push notifications are not supported",
…
        "reason": "PUSH_NOTIFICATION_NOT_SUPPORTED",
```

任务 ID 并不存在，错误却指出缺少能力，因此这次往返的答案早已在卡片里。

技能、模式和安全字段说明 agent 是否适合工作，以及需要什么。planner 将 `run-tests` 映射到 `test-runner`，并在每次 `deployer` 调用中附上 bearer token（`capture/planner.py`）。[Part](#s-part) 和[安全方案](#s-security-schemes-and-in-task-authorization)解读这些字段。

## 缓存卡片 {#s-discovery-and-supported-interfaces-caching-the-card}

卡片很少变化，因此规范要求双方使用普通 HTTP 缓存。服务器应提供含 `max-age` 指令的 `Cache-Control` 响应头，以及从卡片 `version` 或内容哈希生成的 `ETag`。客户端遵循这些头，用 `If-None-Match` 或 `If-Modified-Since` 重新验证过期卡片。 {{spec §8.6}} {{spec §8.6.1}} {{spec §8.6.2}}

套件不发送 `Cache-Control` 或 `ETag`，见[套件 README](manuals/a2a-101/capture/README.md)。认证会话中扩展卡片替代缓存的公开卡片，见[扩展卡片与签名](#s-extended-cards-and-signatures)。

```takeaways
- 在运行注册中心之前，将 agent 主机保存在配置中，从 `/.well-known/agent-card.json` 获取卡片。
- 选择支持其绑定和版本的首个 `supportedInterfaces` 条目，每次请求回传其 `tenant`。
- 跳过能力标志缺失或为 `false` 的操作，因为服务器必须拒绝它。
- 用标准 HTTP 缓存保存卡片，通过 `ETag` 重新验证过期卡片。
```

Sources: spec §3, §3.3.4, §3.6.2, §5.3, §5.4, §8.2, §8.3.2, §8.6, §8.6.1, §8.6.2 (research/sources/specification.md); docs/topics/agent-discovery.md, docs/topics/what-is-a2a.md at v1.0.1; capture/README.md, capture/run.py, capture/planner.py; capture/out/01-agent-cards.http, 11-errors.http
