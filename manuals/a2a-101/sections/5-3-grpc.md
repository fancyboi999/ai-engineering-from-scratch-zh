# gRPC

> gRPC 绑定就是 proto 本身：包 `lf.a2a.v1` 中 `A2AService` 的十一种 rpc，通过带 TLS 的 HTTP/2 传输，服务参数放在 metadata。

planner 读取三张卡片，只找到 `JSONRPC` 和 `HTTP+JSON` 接口，`19-planner.http` 没有 gRPC 调用。套件只用标准库，而标准库没有 gRPC，因此本手册采集不展示 gRPC 调用。参考 SDK 示例 agent 列出第三个接口 `protocol_binding='GRPC'`，地址是普通主机和端口。 {{sdk samples/hello_world_agent.py}}

读完本节后，你可以读取 `GRPC` 接口，通过生成的 stub 调用 `A2AService`，读取错误和流。

## 服务 {#s-grpc-the-service}

绑定有四项要求：带 TLS 的 HTTP/2 上的 gRPC、`specification/a2a.proto` 中的规范定义、Protocol Buffers version 3，以及 `A2AService` 服务。文件声明 `package lf.a2a.v1`，全名因此是 `lf.a2a.v1.A2AService`。十一种 rpc 与 JSON-RPC 方法使用相同 PascalCase 名称，[按绑定列出的操作](#s-ref-operations-by-binding)列出它们及消息。 {{spec §10.1}} {{proto A2AService}}

两种 rpc 返回 `stream StreamResponse`：`SendStreamingMessage` 和 `SubscribeToTask`。其余九种是 unary，没有客户端流。每种 rpc 还带定义 HTTP+JSON 路由的 `google.api.http` 注解，见 [HTTP+JSON](#s-http-json)： {{proto A2AService}} {{spec §10.7}}

```listing
title: proto 定义的流式发送
source: research/sources/a2a.proto
lang: text
note: rpc 及 HTTP 注解完整保留。additional_bindings 块是 tenant 路由。
---
  // Sends a streaming message to an agent, allowing for real-time interaction and status updates.
  // Streaming version of `SendMessage`
  rpc SendStreamingMessage(SendMessageRequest) returns (stream StreamResponse) {
    option (google.api.http) = {
      post: "/message:stream"
      body: "*"
      additional_bindings: {
        post: "/{tenant}/message:stream"
        body: "*"
      }
    };
  }
```

卡片通过 `protocolBinding` 为 `GRPC` 指定绑定。该标签版 proto 对所有接口要求绝对 HTTPS URL，gRPC 客户端却连接主机和端口（[冲突 D34](#s-ref-sources)）。[AgentCard 字段](#s-agentcard-fields)也指出此空缺。[PR #1997](https://github.com/a2aproject/A2A/pull/1997)在 main 将注释改为 `hostname:port`，这是排入 1.0.2 的唯一变更，尚未发布。 {{proto AgentInterface}}

## metadata、错误与流 {#s-grpc-metadata-errors-and-streams}

两个服务参数 `MUST` 通过 gRPC metadata（头）传输。gRPC 将 metadata 键转为小写，因此键为 `a2a-version` 和 `a2a-extensions`，服务器 `SHOULD` 从 metadata 验证必要服务参数，如 `A2A-Version`。§10.2 示例仍发送旧值 `0.3`，1.0 客户端应发送 `1.0`，见 [A2A-Version 与 A2A-Extensions](#s-version-and-extension-headers)。 {{spec §10.2}}

错误是包含 `status.code`、`status.message`、`status.details` 的 `google.rpc.Status`。A2A 错误的详情 `MUST` 含 `google.rpc.ErrorInfo`。`reason` 为去掉 `Error` 的大写蛇形错误名，如 `TASK_NOT_FOUND`，`domain` 为 `a2a-protocol.org`。[错误](#s-errors)表给出各错误状态，九种中六种都用 `FAILED_PRECONDITION`，所以要读取 reason。 {{spec §10.6}}

流是服务器流式 rpc，每条消息是含 `task`、`message`、`status_update` 或 `artifact_update` 之一的 `StreamResponse`。rpc 以其状态完成时流结束，Go 服务器在事件序列结束时返回 `OK`。[此图](#fig-grpc-call)跟踪从请求到结束的一次流式调用。 {{spec §10.7}} {{proto StreamResponse}} {{sdk-go a2agrpc/v1/handler.go at v2.6.0}}

```figure
id: fig-grpc-call
kind: sequence
title: gRPC 上的一次 SendStreamingMessage
claim: 一个 rpc 连同 metadata 发送请求，服务器流式发送 StreamResponse 直到任务结束，rpc 状态关闭流。
caption: 从上到下读。客户端发送 metadata 中带 a2a-version 的一个 SendMessageRequest，每个回复是一个 StreamResponse 负载。名称来自 proto，套件无 gRPC 采集，因此不展示值。来自 research/sources/a2a.proto。
```

## SDK 支持 {#s-grpc-sdk-support}

| SDK | gRPC 服务器 | gRPC 客户端 | 启用方式 |
|---|---|---|---|
| a2a-python 1.2.2 | `GrpcHandler` | `GrpcTransport` | `pip install a2a-sdk[grpc]`，将 handler 注册为 servicer，并在客户端工厂列出 `GRPC`  {{sdk src/a2a/server/request_handlers/grpc_handler.py}}  {{sdk src/a2a/client/transports/grpc.py}}  {{sdk src/a2a/client/client_factory.py}} |
| a2a-js 1.3.0 | `grpcService`，仅 Node | `GrpcTransport` | 添加默认工厂省略的 `GrpcTransportFactory`  {{sdk-js src/server/grpc/grpc_service.ts at v1.3.0}}  {{sdk-js src/client/factory.ts at v1.3.0}} |
| a2a-go 2.6.0 | `a2agrpc/v1.NewHandler` | `a2agrpc/v1.WithGRPCTransport` | 添加默认客户端省略的传输选项  {{sdk-go a2agrpc/v1/handler.go at v2.6.0}}  {{sdk-go a2aclient/factory.go at v2.6.0}} |
| a2a-java 1.4.0.Final | `transport/grpc` 及 Quarkus `reference/grpc` 服务器 | `client/transport/grpc` | 添加 Maven 模块  {{sdk-java README.md at v1.4.0.Final}} |
| a2a-dotnet 1.0.0-preview2 | 无，只有名称常量 | 无 | main 有 `A2A.Grpc.AspNetCore` 和 `A2A.Grpc`，尚未发布  {{sdk-dotnet src/A2A/Client/ProtocolBindingNames.cs at v1.0.0-preview2}} |
| a2a-rs，a2a-grpc 0.3.9 | `a2a-grpc` crate 中的 `GrpcHandler` | 同一 crate 的 `GrpcTransport` | 自行注册，客户端工厂只列 JSON-RPC 和 HTTP+JSON  {{sdk-rust a2a-client/src/factory.rs at a2a-server-lf-v0.5.1}} |

服务器版本检查不同：Python、Go、Rust 的 gRPC 服务器从不读取 `a2a-version`，见 [A2A-Version 与 A2A-Extensions](#s-version-and-extension-headers)中的表。

项目目前有一种自定义绑定 SLIMRPC：通过 SLIM 而非 HTTP/2 传输 Protocol Buffers RPC。卡片用 `https://a2a-protocol.org/bindings/experimental-slimrpc/v1` 指定，[仓库](https://github.com/a2aproject/experimental-cpb-slimrpc)标为实验性。自定义绑定 `SHOULD` 用 URI 标识，项目指南给出规则。 {{spec §5.8}} {{docs custom-protocol-bindings}}

```takeaways
- 从 `specification/a2a.proto` 生成 stub，包名为 `lf.a2a.v1`，保留 rpc 名称。
- 每次调用用小写 metadata 键发送 `a2a-version` 和 `a2a-extensions`。
- 从 `status.details` 读取 `ErrorInfo.reason`，因为 `FAILED_PRECONDITION` 覆盖六种 A2A 错误。
- 在 JS、Go、Rust 客户端工厂中自行注册 gRPC 传输。
```

Sources: spec §5.8, §10, §10.1, §10.2, §10.6, §10.7 (research/sources/specification.md); proto A2AService, AgentInterface, StreamResponse (research/sources/a2a.proto); docs custom-protocol-bindings (research/sources/docs.md); sdk samples/hello_world_agent.py, src/a2a/server/request_handlers/grpc_handler.py, src/a2a/client/transports/grpc.py, src/a2a/client/client_factory.py (a2a-python 1.2.2); sdk-go a2agrpc/v1/handler.go, a2aclient/factory.go at v2.6.0; sdk-js src/server/grpc/grpc_service.ts, src/client/factory.ts at v1.3.0; sdk-java README.md at v1.4.0.Final; sdk-dotnet src/A2A/Client/ProtocolBindingNames.cs at v1.0.0-preview2; sdk-rust a2a-client/src/factory.rs at a2a-server-lf-v0.5.1; capture/out/01-agent-cards.http, 19-planner.http; capture/README.md
