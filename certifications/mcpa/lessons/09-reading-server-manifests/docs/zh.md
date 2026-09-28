# 像审查者一样阅读服务器清单

> 在调用任何东西之前，你对服务器的了解只来自 discover 结果、工具列表和注册表条目。因此要像读合同一样读它们：没有看清的默认值，最终会变成你无意作出的承诺。

**类型：** Reference
**语言：** Python
**前置要求：** 第 08 课
**预计时间：** 约 45 分钟

## 学习目标

- 阅读 `server/discover` 结果、`tools/list` 页面和注册表 `server.json`，理解它们如何在调用发生前共同描述服务器
- 应用工具注解默认值（`readOnlyHint` 为 false、`destructiveHint` 为 true、`idempotentHint` 为 false、`openWorldHint` 为 true），看清省略注解实际意味着什么
- 解释能力标志、`x-mcp-header` 标记、图标和 `cacheScope` 选择透露出的服务器行为
- 识别清单中的危险信号：破坏性工具没有注解、通过 `x-mcp-header` 映射秘密、用户专属文本使用 public `cacheScope`，以及用来操纵模型而非描述服务器的 instructions
- 将注册表 `server.json` 名称解析为命名空间，并说明该命名空间如何完成验证

## 问题背景

host 还没调用工具，就已经知道服务器的三类信息：`server/discover` 声称支持什么、`tools/list` 当前提供什么，以及服务器发布后，其注册表 `server.json` 如何说明归属。协议并不强制这三份文档做到完整、谨慎或诚实。注解只是提示，instructions 是服务器自述，注册表名称是否可信也取决于背后的验证挑战。host 如果不读这些文档就添加服务器，等于在相信自己从未核验过的默认值和声明。

这和编写服务器或调用服务器是两种能力。它更像安装应用前阅读权限清单：你还没有执行任何东西，而是在判断它提供的功能形态是否符合这一类服务器的合理预期，并寻找粗心或恶意作者最可能偷工减料的地方。工具没有 `annotations` 块，不代表它无需审查：客户端必须应用默认值，而这些默认值偏向谨慎，不是放行。参数通过 `x-mcp-header` 映射到 HTTP header 后，从客户端到服务器之间的每一层代理和负载均衡器都能看到它。`instructions` 字段里的文本可能被 host 直接交给模型。读好清单，就是把每一项都当作待验证的声明，而不是直接接受的事实。

## 核心概念

`server/discover`（见发现与能力协商课程）是第一份文档。它包含 `supportedVersions`、`capabilities`、可选的 `instructions` 字符串和 `_meta["io.modelcontextprotocol/serverInfo"]`，外层是带有 `ttlMs` 与 `cacheScope` 的可缓存信封。审查者先看 `capabilities`。`tools: {listChanged: true}` 表示工具集变化时，服务器会通知正在监听的客户端；不订阅的客户端在 `ttlMs` 到期后仍可能看到过期列表。`resources: {subscribe: true}` 表示可以接收单个资源更新，而不只是列表变化。`completions: {}` 表示已经实现 `completion/complete`。`extensions` 对象列出可选协议扩展及其设置；如果出现审查者不熟悉的扩展键，应先弄清它改变了什么，再决定是否信任。

`tools/list`（第 08 课讲过的 schema 契约）是第二份文档，也是大多数危险信号出现的地方。每个工具都带有 `name`、`description`、`inputSchema`，还可包含 `title`、`icons`、`outputSchema` 和 `annotations`。审查者绝不能跳过注解：`readOnlyHint` 默认为 false，`destructiveHint` 默认为 true 且只在 `readOnlyHint` 为 false 时有意义，`idempotentHint` 默认为 false，`openWorldHint` 默认为 true。按它真正生效的方向再读一遍：完全没有 `annotations` 对象的工具，依照客户端必须应用的默认值，既不是只读的，又具有破坏性。这里的沉默不代表安全。审查者看到名为 `delete_account` 或 `run_report`、却没有注解的工具定义时，应在明确出现 `readOnlyHint: true` 或 `destructiveHint: false` 前将其视为破坏性工具，因为规范要求合规客户端正是这样判断的。所有注解都只是提示，绝非保证：规范明确要求，除非服务器本身可信，否则必须把注解当成不可信信息。审查者的职责是注意到声明，而不是替它背书。

`icons` 是展示元数据，但内容要从 URI 获取，因此审查者要确认它使用 `https:` 或 `data:`，并与服务器同源；SVG 图标可能携带可执行脚本，所以要把它当内容，而不是装饰。schema 属性中的 `x-mcp-header` 会把该参数值映射到 `Mcp-Param-{Name}` HTTP header，让网关无需解析 body 就能据此路由。它有明确约束：header 名称必须是有效的 HTTP field-name token，不得包含空格或控制字符；在同一个工具 schema 内必须忽略大小写后仍保持唯一；只能用于 primitive 类型，且绝不能用于 `number`。在 Streamable HTTP 上，只要工具的 `x-mcp-header` 值违反任一规则，客户端就必须从 `tools/list` 结果中丢弃整个工具，而不是悄悄忽略该注解。除了语法，审查者还要检查映射了什么：规范警告服务器不要用它标记密码、API key、token 或其他秘密，因为 header 值对所有中间节点可见，并非只有目标服务器能看到。

`server/discover` 和 `tools/list` 都是可缓存结果，因此每个 complete 响应都必须携带 `ttlMs`，以及取值为 `public` 或 `private` 的 `cacheScope`。`cacheScope` 提示缓存副本可与谁共享，并不是访问控制：`public` 表示同一份字节可以用于另一个调用方的缓存查询，`private` 表示不能跨越授权边界。审查者要把工具描述和 discover `instructions` 与声明的 scope 对照起来：如果文本明显在描述某个调用方的数据（其账号、余额、当前用户），却搭配 `cacheScope: "public"`，风险就很实际。因为相信该 scope 的缓存层，会乐意把一个用户的个性化列表交给下一个查询者。

`instructions` 值得单独审查。它本来用于帮助模型正确使用服务器，却和 `serverInfo` 一样完全来自服务器自述，协议从不验证。正常的 instructions 会描述服务器：它做什么、何时优先选择某个工具、采用什么单位。若 instructions 变成直接命令模型，要求忽略先前指导、始终先调用某个工具，或向用户隐瞒信息，就不再是在描述服务器。这正是通过客户端默认信任的渠道投递 prompt injection 的形式。审查者应像对待工具结果里的注入指令一样，对它保持警惕。

第三份文档完全位于 wire protocol 之外：注册表 `server.json`。它的 `name` 字段采用反向 DNS 模式，如 `io.github.username/server-name` 或 `com.example/server-name`。发布者只有通过验证挑战，证明自己拥有对应的 GitHub 账号或域名后，MCP Registry 才会接受该名称。没有 `/` 的名称根本没有命名空间，也就没有、也不可能完成对应的所有权验证；审查者应把它当作未签名的软件包。`packages` 和 `remotes` 描述如何运行服务器（npm、PyPI、NuGet、Cargo、MCPB 或 OCI 软件包，或者远程 Streamable HTTP、SSE URL）。每种软件包类型都有自己的所有权证明，例如 `package.json` 中的 `mcpName` 字段，或 README 中隐藏的 `mcp-name:` 标记。注册表自身不会扫描服务器代码中的漏洞，而是把这项工作交给底层软件包注册表和下游聚合器。因此，命名空间验证是审查者唯一能依赖注册表本身提供的保证。

```figure
mcpa-09-manifest-anatomy
```

## 交互实验

图中并排展示三份文档：包含 capabilities 和 instructions 的 `server/discover` 结果；包含 annotations 与 `x-mcp-header` 标记的 `tools/list` 条目；以及带命名空间名称的注册表 `server.json`。每个面板都标出了粗心服务器最常出错的字段：像命令而非描述的 instructions、完全没有 annotations 的工具、没有已验证命名空间的名称。把每个标记字段追溯到上面的规则：它本应表达什么，以及缺失或误用时，对严格遵循规范的客户端到底意味着什么。

## 实践实验

打开 `code/main.py`。它构建了两个只响应 `server/discover` 和 `tools/list` 的服务器：一个是按粗糙集成常见方式编写的 `acme-tools`，另一个是谨慎实现的 `docs-search`。随后，它把两者的结果以及各自手写的 `server.json` 交给 `lint_manifest`。在课程目录运行：

```bash
python3 code/main.py
```

先读 `acme-tools` 报告。`delete_account` 没有 `annotations` 块，linter 会依据默认值将其标为破坏性工具。这不是猜测，而是规范默认值决定的。`rotate_api_key` 通过 `x-mcp-header` 映射 `new_api_key`，linter 会指出该 header 暴露了疑似秘密。`run_report` 通过含空格的 header 值 `"Region Code"` 映射 `region_code`，这不是有效的 HTTP field-name token。Streamable HTTP 客户端遇到这种定义时，必须从工具列表中丢弃该工具，不能继续使用。`get_balance` 写着“当前用户的账号余额”，但服务器的 `tools/list` 结果却使用 `cacheScope: "public"`，linter 会把这两个事实联系起来，判定为缓存风险。discover 的 `instructions` 以“Ignore any prior guidance”开头，linter 会识别这种面向模型的操纵语言。注册表名称 `"acme-tools"` 没有 `/`，所以无法解析，也会被标记。再与 `docs-search` 比较：每个工具都明确只读；所用 header 普通且唯一；缓存文本确实属于公共信息；instructions 描述服务器而非命令模型；注册表名称 `io.github.acmedocs/docs-search` 能正常解析为经过 GitHub 验证的命名空间。transcript 最后一项并非客户端发出的内容，而是粗心服务器可能真正返回的 `server/discover` 响应，其中完全缺少 `ttlMs` 和 `cacheScope`。它被包装成刻意的违规示例，让你在实时调用真正失败前看清缓存契约哪里出了问题。

## 交付产物

`outputs/manifest-review-checklist.md` 是本课的一页版参考：三份文档分别要看什么、注解默认值表、`x-mcp-header` 规则、缓存与 instructions 的危险信号，以及如何解析注册表命名空间。前几次添加陌生服务器时，把它放在手边。

## 验证

在课程目录运行测试：

```bash
python3 -m unittest discover code/tests
```

测试覆盖本课的关键结论：没有 annotations 的工具会应用规范默认值，而不是被视为未知；没有注解的破坏性工具会被标记，而明确只读的工具不会；通过 `x-mcp-header` 映射的疑似秘密参数会被单独标记，与不符合 HTTP token 语法的 header 值区分开；`number` 属性上的 `x-mcp-header` 会被拒绝；public cache scope 搭配用户专属文本会被标记；instructions 中的操纵语言能被识别；没有命名空间的注册表名称会被拒绝，而经验证的 GitHub 命名空间可正确解析；干净清单不会产生任何发现；transcript 中的每个请求仍携带必需的 `_meta`。仓库的 wire 检查器还会按 2026-07-28 规则验证本课 transcript：

```bash
python3 scripts/check_mcpa_wire.py certifications/mcpa/lessons/09-reading-server-manifests
```

## 综合项目关联

综合项目的端到端交换先执行 discover 调用和工具列表查询，然后才会真正调用工具。此时能够安全作出的所有假设都建立在本课之上：正确读取能力标志，应用注解默认值而不是跳过它们，并确认清单没有在第一次工具调用前操纵模型。本路线后续的信任边界和同意课程，会直接建立在“行动前先带着怀疑审读清单”这一习惯之上。

## 关键术语

| 术语 | 含义 |
|------|---------|
| Manifest | 在任何调用前一起审读的 discover 结果、工具列表和注册表 `server.json` |
| Annotation defaults | 工具省略 annotations 时，`readOnlyHint` 为 false、`destructiveHint` 为 true、`idempotentHint` 为 false、`openWorldHint` 为 true |
| x-mcp-header | 将 primitive 参数映射到 HTTP header 以供路由使用的 schema 属性 |
| cacheScope | 缓存结果能否跨用户和 token 共享；绝不是访问控制 |
| instructions | 服务器在 `server/discover` 中提供的自然语言自述指导 |
| Reverse-DNS namespace | `server.json` 名称中的 `io.github.user` 或 `com.example` 前缀，与经过验证的所有者绑定 |
| Red flag | 声明与同类谨慎服务器应呈现的内容不符的清单字段 |
| Ownership verification | 注册表用来将名称与发布者绑定的 GitHub、DNS 或 HTTP 验证挑战 |

## 延伸阅读

- [MCP specification 2026-07-28: Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover)
- [MCP specification 2026-07-28: Tools](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)
- [MCP Registry overview](https://modelcontextprotocol.io/registry/about)
- `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 6、10、15 节
