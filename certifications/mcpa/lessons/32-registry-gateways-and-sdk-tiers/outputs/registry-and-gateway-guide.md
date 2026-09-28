# Registry 与 Gateway 指南

面向 MCPA“用例与生态系统”领域的一页参考资料，与 MCP 2026-07-28 保持一致。MCP Registry 目前仍处于 preview 阶段：正式可用前可能发生破坏性变更和数据重置。

## Registry 接收检查清单

server.json 条目只有同时满足以下条件才会获准：

- [ ] 名称是一组反向 DNS 标识，`io.github.username/server`（GitHub 身份验证）或 `com.example/server`（域名身份验证）
- [ ] 发布者已证明拥有该确切 authority（GitHub OAuth、DNS TXT 记录，或 well-known 路径下的 HTTP 文件）；从未验证或属于他人的命名空间都会被拒绝
- [ ] 服务器公开可访问：公开 package（npm、PyPI、NuGet、Cargo 或公开 OCI registry），或可从公网访问的 remote URL；私有网络或私有 feed 中的服务器会被拒绝
- [ ] 版本字符串在本次发布中唯一，发布后不可更改，且不是版本范围（禁止 `^1.2.3`、`~1.2.3`、`>=1.2.3`、`1.x` 等范围语法）
- [ ] 底层产物携带与 server.json 名称一致的所有权证明：npm 在 package.json 中使用 `mcpName`；PyPI、NuGet 和 Cargo 在渲染后的 README 中使用 `mcp-name: name` 字符串（Cargo 要求可见文本，因为 crates.io 会移除 HTML 注释）；Docker 或 OCI image 使用 `io.modelcontextprotocol.server.name` label

## Packages 与 remotes

| 字段 | 指向 | 客户端选择时机 |
|---|---|---|
| `packages` | 包 registry（npm、PyPI、NuGet、Cargo、OCI 或 MCPB）上通过 stdio 启动的产物 | 希望在本地运行服务器时 |
| `remotes` | 服务器直接响应的 `streamable-http`（或已弃用的 `sse`）URL | 希望通过网络调用托管服务器时 |

一个条目可同时包含两者，由 host 选择。让 server.json 顶层的 `version` 与底层 package 或 remote API version 保持一致，避免两者含义发生漂移。

## 值得记住的一项事实

server.json 中的 `$schema` URL（例如 `.../schemas/2025-12-11/server.schema.json`）代表元数据格式版本。它独立于运行中服务器通过 `server/discover` 实际协商的 MCP protocol version（`2026-07-28`）。绝不能把其中一个当作另一个的证明。

## Gateway 请求检查清单（按顺序）

1. 解析 `params._meta`，确认 `io.modelcontextprotocol/protocolVersion` 和 `io.modelcontextprotocol/clientCapabilities` 均存在。
2. 将 `MCP-Protocol-Version`、`Mcp-Method` 以及（对 `tools/call`、`resources/read`、`prompts/get`）`Mcp-Name` 与匹配的 body 字段比较。任何不一致都是 `HeaderMismatch`：错误码 `-32020`、HTTP `400`，必须在第 3 步前返回。
3. 使用 header 值路由（这正是镜像 header 的全部意义），绝不能再次读取 body 来决定路由。
4. 授权调用方访问解析出的后端与工具或资源。
5. 转发一条新的、自包含的请求；绝不把调用方自身 token 放入请求。
6. 将 `resultType`、`ttlMs` 和 `cacheScope` 原样传回客户端。

## 可直接复述的 cacheScope 规则

`"private"` 结果绝不能提供给取得该结果之外的其他调用方。`"public"` 结果可以在所有调用方之间共享。`cacheScope` 是缓存提示，本身绝不是访问控制决策。

## SDK tier 要求

| 要求 | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|
| Conformance 通过率 | 100% | 80% | 无最低要求 |
| 新 protocol feature | 下一版规范发布前或同步 | 6 个月内 | 无时间表 |
| Issue triage | 2 个工作日内 | 1 个月内 | 无要求 |
| Critical（P0）bug 修复 | 7 天内 | 2 周内 | 无要求 |
| Stable release | 必需 | 至少一个 | 不要求 |
| Roadmap | 已发布 | 已发布（或说明为何停留 Tier 2） | 不要求 |

任何 tier 都不要求实现扩展（Tasks、MCP Apps、Skills 等）。

## 降级阈值

- Tier 1 降至 Tier 2：在当前 stable release 上，任一 conformance test 连续失败 4 周
- Tier 2 降至 Tier 3：超过 20% 的 conformance test 连续失败 4 周
- 任一 tier：issue 两个月未解决也可能触发降级
- 升级反向进行：自评、提交带证明的 issue、通过 conformance 运行，并由 SDK Working Group 批准

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 9、10 和 15 节。
