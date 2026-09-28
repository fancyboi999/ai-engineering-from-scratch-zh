# Resource 设计指南

这是设计与审查 MCP resources 的一页参考，依据 MCP 2026-07-28 整理。

## 三个方法

| 方法 | 返回内容 | 可缓存 |
|---|---|---|
| `resources/list` | 调用方可见的 resource 目录：uri、name、description、mimeType、icons | 是：ttlMs、cacheScope |
| `resources/templates/list` | resource family 使用的 RFC 6570 URI template | 是：ttlMs、cacheScope |
| `resources/read` | 指定 uri 对应的一个或多个 content item，放在 `contents` 中 | 是：ttlMs、cacheScope |

## 选择 URI scheme

| Scheme | 适用场景 | 说明 |
|---|---|---|
| `https://` | 具备能力的客户端可直接从 Web 获取相同字节 | 如果服务器是访问内容的唯一途径，优先使用其他 scheme |
| `file://` | 内容表现得像文件系统 | 不必映射到真实文件系统；清理每个 path segment |
| `git://` | 内容受版本控制 | 在 authority 或 path 中标识 ref，不要放在 query string 中 |
| 自定义 | 其他情况 | 必须遵循 RFC 3986；命名空间应与服务器域名绑定 |

## Content 形态

- 文本：`{"uri": ..., "mimeType": ..., "text": ...}`
- 二进制：`{"uri": ..., "mimeType": ..., "blob": "<base64>"}`
- 一次读取可在 `contents` 中返回多项内容（例如类似目录的 resource 返回其下每个文件）。

## 错误处理检查表

- [ ] 缺失或无效 resource 返回 JSON-RPC error `-32602`（Invalid params），绝不使用 `-32601` 或 `-32002`。
- [ ] `error.data.uri` 指明请求的 resource。
- [ ] 缺失 resource 绝不返回 `contents` 为空数组的 complete result。
- [ ] 内部故障使用 `-32603`，不伪装成 resource 形态的错误。
- [ ] 客户端仍能识别旧服务器返回的 `-32002`，即使 2026-07-28 服务器自身不得发出它。

## Cache scope 决策表

| 内容 | cacheScope | 常见 ttlMs |
|---|---|---|
| 每个调用方看到都相同的公共目录或 changelog | `public` | 数分钟到数小时 |
| 依赖已认证调用方的 resource | `private` | 数秒到数分钟 |
| 每次读取都会变化的内容 | 任意 | `0` |

`cacheScope` 是共享边界，不是访问控制。无论缓存提示写什么，每次读取都要授权。

## 安全检查表

- [ ] 每个 URI 抵达存储或数据库查询前都要验证。
- [ ] 相对合成 root 清理 path segment，例如 `posixpath.normpath("/" + tail)`，使 `..` 序列绝不能解析到 root 之外。
- [ ] 单独授权每次读取；resource 出现在 `resources/list` 中，不代表每个调用方都能读取。
- [ ] 二进制内容在 `blob` 中编码为 base64，绝不把原始字节放入 `text`。
- [ ] resource content 进入模型后，应视为不可信数据，而不是 instructions。

## 考试要点

- Resources 由应用驱动：由 host 决定何时进入上下文，不是模型。
- `-32602` 是现代 not-found 代码，并携带 `data.uri`；`-32002` 只用于兼容旧版本。
- 空 `contents` 数组绝不是报告 resource 缺失的有效方式。
- `resources/read` 是 complete result 必须携带 `ttlMs` 和 `cacheScope` 的六种操作之一。
- 现代订阅请求是带 `resourceSubscriptions` filter 的 `subscriptions/listen`，不是已废弃的 `resources/subscribe`。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 10 节。
