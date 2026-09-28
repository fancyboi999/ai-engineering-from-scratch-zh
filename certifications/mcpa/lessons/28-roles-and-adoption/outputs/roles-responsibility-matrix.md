# 角色与责任矩阵

这是一份面向 MCPA“Use Cases and Ecosystem”领域、与 MCP 2026-07-28 对齐的一页式参考资料。

## 六种角色

| 角色 | 负责内容 |
|------|------|
| 服务器作者 | 实现：工具、schema、server/discover、无状态性 |
| Host 与 client 开发者 | 应用及其 client：capability 声明、OAuth client、同意界面 |
| 平台或网关运维方 | 运行进程：stdio 环境、连接终止、网络策略、边缘标头检查 |
| 安全与治理负责人 | 单个实现者无法负责的跨领域要求：token 处理、requestState 保护、同意策略 |
| 注册表发布者 | server.json、命名空间验证，以及注册表提供的服务器信息 |
| 终端用户 | 同意；对 host 代表自己执行的操作承担责任 |

## 三条采用路径

| 路径 | 变化 |
|------|---------------|
| 本地 stdio | 无需构建 OAuth client；运维方在进程启动前通过环境提供凭据 |
| 使用 OAuth 的远程 Streamable HTTP | 服务器作者直接实现 Protected Resource Metadata 和 Origin 验证；host 与 client 开发者实现 OAuth client 和 Resource Indicators |
| 使用扩展、网关前置的企业部署 | Origin 验证和标头检查转移给平台或网关运维方；安全与治理负责人制定网关执行的策略；扩展支持成为组织允许列表 |

## 推导示例：Origin 验证

Streamable HTTP 传输规定，为防止 DNS 重绑定攻击，服务器 MUST 验证所有入站连接的 Origin 标头。普通 HTTP：由服务器作者负责，因为请求首先触及服务器自己的代码。网关前置：由平台或网关运维方负责，因为连接首先在网关终止。规范中的要求从未移动，负责人随部署形态改变。

## 一页掌握治理

- 管理归属：Agentic AI Foundation 旗下项目。
- 层级：Lead Maintainers（最终否决权）高于 Core Maintainers（规范和项目方向），再高于 Maintainers（各管一个领域）和 Contributors；持续贡献者会先成为 Members。
- Working Group：构建具体交付物，通常是 SEP 加参考实现。
- Interest Group：讨论问题并提出无约束力的建议，而非具体设计。
- SEP 状态路径：draft、in-review，然后 accepted 或 rejected；参考实现与任何必要的合规测试均落地后成为 final。
- 功能生命周期：Active，可选进入 Deprecated（必须有迁移路径，窗口至少十二个月），最终成为 Removed。

## 把 SDK tier 当作采用决策

| Tier | 合规 | 新功能 | 严重 bug |
|------|-------------|---------------|-----------------|
| Tier 1 | 100% | 规范发布前或同时 | 7 天内修复 |
| Tier 2 | 80% | 6 个月内 | 2 周内修复 |
| Tier 3 | 无最低要求 | 无时间承诺 | 无要求 |

## 考试要点

- Host、client、server 描述线路拓扑；上面的六种角色描述真实部署中谁为要求负责。两组概念回答的问题不同。
- 同一个 MUST 可以因部署形态而有不同负责人；网关会吸收此前无需承担的责任。
- 团队矩阵中没有负责人的 MUST 是待解决的缺口，不是可跳过的细节。

来源：certifications/mcpa/research/mcp-2026-07-28-brief.md；MCP community documentation（governance、working-interest-groups、sep-guidelines、sdk-tiers）。
