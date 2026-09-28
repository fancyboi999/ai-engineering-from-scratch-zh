# 扩展协商指南

面向 MCPA“用例与生态系统”领域的一页参考资料，与 MCP 2026-07-28 保持一致。

## 标识符格式

`{vendor-prefix}/{extension-name}`，必须包含前缀（规则与 `_meta` 键相同，但这里不能省略前缀）。

| 发布者 | 前缀 | 示例 |
|-----|--------|---------|
| 官方扩展 | `io.modelcontextprotocol` | `io.modelcontextprotocol/oauth-client-credentials` |
| 第三方扩展 | 作者拥有域名的反写形式 | `com.example/my-extension` |
| 无效标识符 | 完全没有前缀 | `my-extension`（缺少强制要求的斜杠和前缀） |

## 双方声明支持的位置

| 一方 | 位置 | 结构 |
|------|----------|-------|
| 客户端 | 每个请求中的 `params._meta["io.modelcontextprotocol/clientCapabilities"].extensions` | 标识符到设置对象的映射 |
| 服务器 | `server/discover` 结果中的 `capabilities.extensions` | 标识符到设置对象的映射 |

空设置对象 `{}` 表示“支持，无需配置”。声明逐请求生效，不会从先前调用中继承，因为 2026-07-28 没有 `initialize` 握手，也没有用于保存声明的 session。

## 协商决策表

| 客户端声明 | 服务器声明 | 扩展是否为本次调用所必需 | 结果 |
|---|---|---|---|
| 是 | 是 | 否（可选） | 激活：执行增强行为 |
| 是 | 是 | 是 | 激活：执行增强行为 |
| 否，或标识符畸形 | 是或否 | 否（可选） | 回退到核心行为 |
| 否，或标识符畸形 | 是或否 | 是 | 拒绝：`-32021 MissingRequiredClientCapability`，并在 `data.requiredCapabilities` 中点名 |
| 是 | 否 | 任意 | 不激活：服务器从未实现该扩展，因此无法运行 |

缺少强制前缀的畸形标识符，即使同时出现在双方声明中，也绝不会激活。校验标识符形式是计算活跃集合的一部分。

## 生命周期检查清单

1. **提出**：按照标准 SEP 指南，在 `modelcontextprotocol/modelcontextprotocol` 主仓库提交 Extensions Track SEP。
2. **实现**：在官方 SDK 中提供可工作的参考实现；这是 Core Maintainers 开始评审前的硬性要求。
3. **评审**：Core Maintainers 评审 SEP，并对是否接受保留最终决定权。
4. **发布**：通过 pull request 将它加入扩展仓库。该仓库位于 `modelcontextprotocol` GitHub 组织下，名称带 `ext-` 前缀，例如 `ext-auth` 或 `ext-apps`。
5. **采用**：其他客户端、服务器和 SDK 可以实现该扩展，但没有任何一方必须实现。

在 SEP 出现之前，Working Group 或 Interest Group 可以把方案放入 `experimental-ext-` 仓库孵化，并明确标记为非官方；Core Maintainers 可自行决定归档或删除。

扩展独立于核心协议，也彼此独立地进行版本演进。破坏性变更（删除或重命名字段、改变字段类型、改变既有行为含义，或新增必填字段）必须使用新标识符发布，通常添加 `-v2` 后缀，绝不能沿用旧标识符。

## 当前官方扩展

| 扩展 | 标识符 | SEP | 简介 |
|-----------|-----------|-----|----------|
| Tasks | `io.modelcontextprotocol/tasks` | SEP-2663 | 为耗时工作提供持久任务句柄；通过轮询代替阻塞 |
| MCP Apps | `io.modelcontextprotocol/ui` | SEP-1865 | 工具可以指向可在沙箱中渲染的界面，而不再只能返回文本 |
| Skills over MCP | `io.modelcontextprotocol/skills` | SEP-2640 | 通过 resources primitive 发现并读取可复用的工作流说明 |
| OAuth Client Credentials | 发布自 `ext-auth` | -- | 无需浏览器的机器间身份验证 |
| Enterprise-Managed Authorization | 发布自 `ext-auth` | -- | 面向企业身份提供商的集中式访问控制 |

每项扩展都由客户端自行选择启用。设计假定特定客户端已经实现某项扩展之前，先检查扩展网站上的客户端支持矩阵。

## 考试要点

- 扩展标识符的前缀是强制要求，不只是命名惯例。
- 声明逐请求生效，位于 `_meta` 和 `server/discover` 中，绝不是一次性握手。
- 可选扩展不可用时回退到核心行为；必要扩展未被双方共同激活时以 `-32021` 拒绝，而不是 `-32601` 或 `-32602`。
- 扩展的破坏性变更需要新标识符，非破坏性补充则不需要。
- 客户端和服务器上的扩展都默认关闭；符合核心规范从不要求实现任何扩展。

来源：`certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 14 节。
