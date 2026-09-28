# 清单审查检查表

这是一份在添加陌生 MCP 服务器前使用的一页参考，依据 MCP 2026-07-28 整理。第一次真实调用前，先读完三份文档：`server/discover` 结果、`tools/list` 结果，以及服务器发布后的注册表 `server.json`。

## 1. server/discover

- `capabilities`：记录 tools、resources、prompts、completions、logging 和 extensions 中出现了哪些能力。遇到陌生的 extension 键，先弄清它改变什么，再决定是否信任。
- `resources: {subscribe: true}` 表示可以接收单个资源更新；任何 primitive 上的 `listChanged: true` 都表示该列表变化时，服务器会通知正在监听的客户端。
- `instructions`：应描述服务器（它做什么、何时优先选择某个工具）。把直接命令模型的文字视为危险信号（见第 5 节）。
- complete 结果必须同时包含 `ttlMs` 和 `cacheScope`。缺少任一个都违反缓存契约。

## 2. tools/list：逐个检查工具

- `name`、`description`、`inputSchema` 为必填项；`inputSchema` 绝不能是 null。
- 对照默认值读取 `annotations`，不要绕开默认值：

| 注解 | 省略时的默认值 | 生效条件 |
|---|---|---|
| `readOnlyHint` | `false` | 始终 |
| `destructiveHint` | `true` | `readOnlyHint` 为 `false` |
| `idempotentHint` | `false` | `readOnlyHint` 为 `false` |
| `openWorldHint` | `true` | 始终 |

完全没有 `annotations` 块的工具，依照这些默认值，既不是只读工具，又具有破坏性。在明确出现 `readOnlyHint: true` 或 `destructiveHint: false` 前，都应据此处理。所有注解都只是提示：如果服务器本身不可信，就绝不能信任它的注解。

- `icons`：仅允许 `https:` 或 `data:` URI，并与服务器同源；把 SVG 当成可执行内容，而非装饰。
- `outputSchema` 和 `structuredContent`：声明 output schema 后，服务器必须遵守；为保持向后兼容，还应返回文本镜像。

## 3. x-mcp-header：逐个属性检查

- 值必须是非空、有效的 HTTP field-name token：不能有空格或控制字符。
- 在同一工具 schema 的所有 `x-mcp-header` 值中，忽略大小写后仍必须唯一。
- 只能用于 primitive 属性（string、integer、boolean），绝不能用于 `number`。
- 在 Streamable HTTP 上，只要违反上述任一规则，客户端就必须从 `tools/list` 中丢弃整个工具，不能悄悄忽略注解。
- 绝不能用于疑似密码、API key、token 或 credential 的参数：header 值对每个网络中间节点可见，并非只有服务器能看到。

## 4. cacheScope：结合它缓存的文本检查

- `public`：同一结果可用于不同调用方的缓存查询。`private`：不得跨越授权边界。
- `cacheScope` 本身绝不是访问控制。
- 危险信号：工具描述或 instructions 明显包含用户专属信息（“你的账号”“你的余额”“当前用户”），却搭配 `cacheScope: "public"`。

## 5. instructions：按不可信文本处理

- 正常内容：描述服务器、使用单位，或何时优先选择某个工具。
- 危险信号：面向模型的命令式语言，例如要求忽略先前指导、始终先调用某个工具，或向用户隐瞒信息。应将其视为 prompt injection 尝试，而不是指导。
- `instructions` 和 `serverInfo` 都是未经协议验证的服务器自述；两者都不应左右安全决策。

## 6. 注册表 server.json

- `name` 必须采用反向 DNS 命名空间，如 `io.github.user/server` 或 `com.example/server`。名称没有 `/`，就没有经过验证的所有者。
- `io.github.*` 名称通过 GitHub 验证；其他命名空间通过针对域名的 DNS 或 HTTP challenge 验证。
- `packages`（npm、PyPI、NuGet、Cargo、OCI、MCPB）和 `remotes`（streamable-http、sse）描述如何运行服务器；每种软件包类型都有自己的所有权证明，例如 `package.json` 中的 `mcpName`。
- 注册表不会扫描服务器代码中的漏洞，而是交由底层软件包注册表和下游聚合器完成。注册表自身保证的是命名空间验证。

## 考试要点

- 省略 annotations 并非中性状态：默认值会让没有注解的工具具有破坏性。
- `x-mcp-header` 约束由客户端执行（丢弃工具），不是由服务器执行。
- `cacheScope` 控制共享，不控制访问。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 6、10、15 节。
