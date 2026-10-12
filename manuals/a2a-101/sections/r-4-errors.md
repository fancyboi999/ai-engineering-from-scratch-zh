# 错误

> 每种 A2A 错误都有 JSON-RPC 代码、HTTP 状态、gRPC 状态及 `ErrorInfo` reason，HTTP 中需靠 reason 区分其中七种。

九种 A2A 错误代码来自 §5.4 的标准表。各有 `ErrorInfo` reason：去掉 `Error` 的大写蛇形名称，如 `TASK_NOT_FOUND`。规范只明确写出它和 `TASK_NOT_CANCELABLE`，参考 SDK 使用相同九个字符串。 {{spec §5.4}} {{spec §11.6}} {{sdk src/a2a/utils/errors.py}}

| 错误 | JSON-RPC | HTTP | gRPC |
|---|---|---|---|
| TaskNotFoundError | -32001 | 404 | NOT_FOUND |
| TaskNotCancelableError | -32002 | 400 | FAILED_PRECONDITION |
| PushNotificationNotSupportedError | -32003 | 400 | FAILED_PRECONDITION |
| UnsupportedOperationError | -32004 | 400 | FAILED_PRECONDITION |
| ContentTypeNotSupportedError | -32005 | 400 | INVALID_ARGUMENT |
| InvalidAgentResponseError | -32006 | 500 | INTERNAL |
| ExtendedAgentCardNotConfiguredError | -32007 | 400 | FAILED_PRECONDITION |
| ExtensionSupportRequiredError | -32008 | 400 | FAILED_PRECONDITION |
| VersionNotSupportedError | -32009 | 400 | FAILED_PRECONDITION |
| JSONParseError | -32700 | 无 | none |
| InvalidRequestError | -32600 | 无 | none |
| MethodNotFoundError | -32601 | 无 | none |
| InvalidParamsError | -32602 | 400 | INVALID_ARGUMENT |
| InternalError | -32603 | 500 或 503 | INTERNAL 或 UNAVAILABLE |
| 认证错误 | 自定义 | 401 | UNAUTHENTICATED |
| 授权错误 | 自定义 | 403 | PERMISSION_DENIED |

最后七行没有 A2A 代码。五种是标准 JSON-RPC 错误，原始消息为 `Invalid JSON payload`、`Request payload validation error`、`Method not found`、`Invalid parameters`、`Internal error`。§3.3.2 给出其中两种及认证、授权错误的 HTTP 和 gRPC 示例代码。JSON-RPC 为 A2A 错误保留 `-32001` 至 `-32099`，仅分配 `-32001` 至 `-32009`。 {{spec §9.5}} {{spec §3.3.2}}

官方 a2a-tck 标签 `1.0.0.alpha2` 维护自己的表，有六处偏离 §5.4：`TaskNotCancelableError` 预期 HTTP `409`，`ContentTypeNotSupportedError` 为 `415`，`InvalidAgentResponseError` 为 `502`。`UnsupportedOperationError`、`PushNotificationNotSupportedError`、`VersionNotSupportedError` 预期 gRPC `UNIMPLEMENTED`。遵循 §5.4 的服务器会失败，a2a-java 在 `UnsupportedOperationError` 上符合套件预期。[合规测试](#s-conformance-testing)说明运行方法。

[按绑定列出的操作](#s-ref-operations-by-binding)列出会抛出各错误的操作，没有一个列出 `InvalidAgentResponseError`。`UnsupportedOperationError` 覆盖终态任务、流式能力关闭、扩展卡片关闭，需读消息和 metadata。服务器 `MUST NOT` 暴露无权访问的资源是否存在，因此无权访问的任务返回 `TaskNotFoundError`。 {{spec §3.3.2}} {{spec §3.1.1}} {{spec §3.3.4}}

每个错误带代码、消息、可选详情，每个详情有 `@type` 键。JSON-RPC 使用 `error.code`、`error.message`、`error.data`，规范未定 HTTP 状态，套件与 SDK 返回 `200 OK`。gRPC 发送 `google.rpc.Status`，HTTP+JSON 在 `error` 对象发送其 JSON 形式。A2A 错误两者均有包含 `reason` 及 `domain` 为 `a2a-protocol.org` 的 `ErrorInfo`。[错误](#s-errors)逐一解读。 {{spec §3.3.2}} {{spec §9.5}} {{sdk src/a2a/server/routes/jsonrpc_dispatcher.py}} {{spec §10.6}} {{spec §11.6}}

Sources: spec §3.1.1 to §3.1.11, §3.3.2, §3.3.4, §5.4, §9.5, §10.6, §11.6 (research/sources/specification.md); research/brief-spec.md sections 7.1 to 7.5 and 12.1; sdk src/a2a/utils/errors.py and src/a2a/server/routes/jsonrpc_dispatcher.py at v1.2.2; a2a-tck tck/requirements/base.py and tests/compatibility/http_json/test_http_status.py at tag 1.0.0.alpha2 (research/conformance-tools.md); capture/out/10-cancel.http, 11-errors.http, 16-rest-binding.http
