# A2A-Version 与 A2A-Extensions

> 每次请求通过 HTTP 头或 gRPC metadata 传输两个服务参数，缺少 `A2A-Version` 意味着 0.3，1.0 agent 必须拒绝。

套件向 `test-runner` 发送只有 `Host` 和 `Content-Type` 头的 `SendMessage`，模拟忘记版本的客户端。`11-errors.http` 第 2 次交换中 agent 返回 `-32009`，报告请求版本为 `0.3 (no header)`。其余采集请求都带 `A2A-Version: 1.0`。

读完本节后，你可以在任意绑定设置两个头，预测各 SDK 缺少版本时的行为。

## 服务参数 {#s-version-and-extension-headers-service-parameters}

**服务参数：** 传递横向适用的上下文或参数的键值映射，字符串键大小写不敏感、值大小写敏感。规范定义 `A2A-Version` 和 `A2A-Extensions`，保留 `a2a-` 前缀。JSON-RPC 和 HTTP+JSON 用 HTTP 请求头，gRPC 用 metadata 键。自定义绑定 `MUST` 记录服务参数的传输方式。 {{spec §3.2.6}} {{spec §9.2}} {{spec §11.2}} {{spec §10.2}} {{spec §12.3}}

两个头的 IANA 模板都引用 A2A 规范 §3.2.5，但该节是 metadata，服务参数在 §3.2.6（[冲突 D17](#s-ref-sources)）。[Issue #2305](https://github.com/a2aproject/A2A/issues/2305)跟踪此问题，仍开放。 {{spec §14.2.1}} {{spec §14.2.2}}

## A2A-Version {#s-version-and-extension-headers-a2a-version}

版本格式为 `Major.Minor`，如 `1.0`，请求、响应和 Agent Card `SHOULD NOT` 使用补丁版本号。客户端每次请求 `MUST` 发送 `A2A-Version`，1.0 客户端发送 `1.0`。服务器须用该版本语义处理请求，接口不支持时返回 `VersionNotSupportedError`。空值含义固定：agent `MUST` 将空值解释为 0.3。因此忘记头时，仍提供 0.3 的 agent 用 0.3 语义处理，不支持它的 agent 返回以下错误： {{spec §3.6}} {{spec §3.6.1}} {{spec §3.6.2}}

```listing
title: 缺少 A2A-Version，被解读为 0.3 后拒绝
source: capture/out/11-errors.http
lang: http
note: 请求体与错误详情已删节。请求只有 Host 和 Content-Type，套件只支持 1.0。
---
POST /a2a/jsonrpc HTTP/1.1
Host: localhost:41241
Content-Type: application/json
…
HTTP/1.1 200 OK
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32009,
    "message": "Protocol version not supported",
…
          "requested": "0.3 (no header)",
          "supported": "1.0"
```

`VersionNotSupportedError` 在 JSON-RPC 为 `-32009`，HTTP+JSON 为 `400`，gRPC 为 `FAILED_PRECONDITION`，reason 为 `VERSION_NOT_SUPPORTED`，见[错误](#s-errors)。要发送的版本来自卡片：每个 `supportedInterfaces` 条目声明自己的 `protocolVersion`，agent 可以为同一传输暴露不同版本的多个接口，见 [AgentCard 字段](#s-agentcard-fields)。 {{spec §5.4}} {{spec §3.6.2}}

规范三个示例发送 `A2A-Version: 0.3`，§10.2 的 gRPC 示例在 metadata 发送相同值。不要把示例值复制到 1.0 客户端（[冲突 D39](#s-ref-sources)）。§3.6.1 还允许客户端将 `A2A-Version` 作为请求参数而非头，但两种 JSON 绑定都要求头（[冲突 D31](#s-ref-sources)）。参考 SDK 只读头，套件两者都读，因此发送头。 {{spec §9.2}} {{spec §11.2}} {{spec §14.2.1}} {{spec §10.2}} {{spec §3.6.1}} {{sdk src/a2a/utils/version_validator.py}}

## 各 SDK 缺少头时的行为 {#s-version-and-extension-headers-what-each-sdk-does-without-the-header}

| 实现 | 头缺失或为空 | 接受的值 | 检查位置 |
|---|---|---|---|
| 套件，`a2a_ref.py` | 按 `0.3 (no header)` 拒绝 | 头或查询参数中精确的 `1.0` | JSON-RPC 和 HTTP+JSON |
| a2a-python 1.2.2 | 按 `0.3` 解读后拒绝 | `1`、`1.0`、`1.0.0`、`1.5`，只要求主版本为 1 | JSON-RPC 和 HTTP+JSON，不检查 gRPC  {{sdk src/a2a/utils/version_validator.py}}  {{sdk src/a2a/server/request_handlers/grpc_handler.py}} |
| a2a-js 1.3.0 | 按 `0.3` 解读，除非卡片列出它，否则拒绝 | 只接受卡片为该绑定声明的字符串，拒绝 `1.0.0` | 三种绑定  {{sdk-js src/server/version.ts at v1.3.0}} |
| a2a-java 1.4.0.Final | 按 `0.3` 解读后拒绝 | 相同主版本，`major.minor` 格式，拒绝 `1` | 三种绑定，gRPC 用 `UNIMPLEMENTED` 而非 `FAILED_PRECONDITION`  {{sdk-java server-common/src/main/java/org/a2aproject/sdk/server/version/A2AVersionValidator.java at v1.4.0.Final}} |
| a2a-go 2.6.0 | 接受 | 任何值，服务器代码不读取头 | 不检查  {{sdk-go a2a/svcparams.go at v2.6.0}} |
| a2a-dotnet 1.0.0-preview2 | 作为 1.0 接受 | `1.0` 或 `0.3`，但 `0.3` 按 1.0 处理 | 仅 JSON-RPC  {{sdk-dotnet src/A2A.AspNetCore/A2AJsonRpcProcessor.cs at v1.0.0-preview2}} |
| a2a-rs，a2a-server 0.5.1 | 按 `0.3` 解读后拒绝 | 主版本 1 | 仅 JSON-RPC  {{sdk-rust a2a-server/src/jsonrpc.rs at a2a-server-lf-v0.5.1}} |

表中每个客户端每次调用都发送 `1.0`，Python 和 JS 获取卡片时也发送。因此发送字面字符串 `1.0`，不要补丁版本，也别依赖服务器拒绝缺失头。

## A2A-Extensions {#s-version-and-extension-headers-a2a-extensions}

`A2A-Extensions` 是客户端希望用于请求的扩展 URI 的逗号分隔列表，在两种 JSON 绑定为一个头字段，在 gRPC 为一个 metadata 条目。§4.6.1 还允许 JSON-RPC 请求参数，但 §9.2 要求头，因此发送头（[冲突 D30](#s-ref-sources)）。参考 SDK 的客户端 `with_a2a_extensions` 辅助函数用逗号连接 URI，服务器将它们读入调用上下文。服务器如何处理、以 URI 为键的负载及 `ExtensionSupportRequiredError` 见[扩展](#s-extensions)。 {{spec §3.2.6}} {{spec §9.2}} {{spec §11.2}} {{spec §10.2}} {{spec §4.6.1}} {{sdk src/a2a/client/service_parameters.py}} {{sdk src/a2a/server/routes/common.py}}

```takeaways
- 每次请求通过头或 metadata 发送 `A2A-Version: 1.0`，不带补丁版本。
- 仅提供 1.0 时，以 `VersionNotSupportedError` 拒绝缺少 `A2A-Version` 的请求。
- 不依赖查询参数，也不依赖服务器拒绝缺失版本。
- 将 `A2A-Extensions` 作为一个逗号分隔的头字段发送，不用请求参数。
```

Sources: spec §3.2.6, §3.6, §3.6.1, §3.6.2, §4.6.1, §5.4, §9.2, §10.2, §11.2, §12.3, §14.2.1, §14.2.2 (research/sources/specification.md); sdk src/a2a/utils/version_validator.py, src/a2a/server/request_handlers/grpc_handler.py, src/a2a/client/service_parameters.py, src/a2a/server/routes/common.py (a2a-python 1.2.2); sdk-js src/server/version.ts at v1.3.0; sdk-java server-common/src/main/java/org/a2aproject/sdk/server/version/A2AVersionValidator.java at v1.4.0.Final; sdk-go a2a/svcparams.go at v2.6.0; sdk-dotnet src/A2A.AspNetCore/A2AJsonRpcProcessor.cs at v1.0.0-preview2; sdk-rust a2a-server/src/jsonrpc.rs at a2a-server-lf-v0.5.1; capture/out/11-errors.http, 01-agent-cards.http; capture/a2a_ref.py
