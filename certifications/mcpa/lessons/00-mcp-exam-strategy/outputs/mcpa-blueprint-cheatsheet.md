# MCPA 蓝图速查表

MCPA 考试蓝图的一页参考：五个领域、官方权重、子能力、不随学习领域变化的考试事实、旧版协议干扰项清单，以及完整的 34 课路线。

## 五个领域及其权重

| 领域 | 权重 | 子能力（官方表述） |
|------|------|-------------------|
| MCP 基础 | 16% | MCP 的目的与范围；MCP 核心概念；互操作性与价值 |
| 架构与组件 | 14% | Schema 与结构化数据；MCP Host、Client 与 Server；模型交互流程 |
| 交互与执行 | 26% | 交互模式与响应处理；错误处理；工具调用生命周期；协议原语 |
| 安全与治理 | 24% | 信任边界；权限与同意；风险与安全控制；审计能力与可观测性 |
| 用例与生态 | 20% | 角色、职责与采用；实际用例；生态与可移植性 |

权重合计 100%。交互与执行、安全与治理两个领域合计占蓝图的一半，应为它们安排最多的学习时间和练习题。

## 把权重转换成学习时间

若学习时间预算为 `H` 小时，权重为 `W`% 的领域应分配 `H * W / 100` 小时。以 40 小时预算为例：

- MCP 基础（16%）：6.4 小时
- 架构与组件（14%）：5.6 小时
- 交互与执行（26%）：10.4 小时
- 安全与治理（24%）：9.6 小时
- 用例与生态（20%）：8.0 小时

使用 `code/main.py` 中的 `allocate_study_hours`，根据自己的时间预算重新计算。

## 把练习分数转换成备考程度

不要对五个领域做简单平均，而应让每个领域的练习正确率乘以蓝图权重后求和。尚未做题的领域在估算中按零分计算，这是有意设计：它会暴露覆盖缺口，而不是把缺口藏起来。未知领域名会被拒绝，不会静默忽略。使用 `code/main.py` 中的 `estimate_readiness`，根据自己的练习记录重新计算。

## 固定考试事实

- 形式：在线、监考、选择题。
- 对应规范：Model Context Protocol 2026-07-28。
- 费用：仅考试为 250 美元。
- 有效期：2 年。
- 重考：包含一次重考机会。
- 时长：认证页面写 90 分钟；Linux Foundation 自己的发布新闻稿写 120 分钟。本课程以认证页面为准，同时标记此冲突；依赖任一数字前应重新核验。
- 题数：两个官方来源都未公布。
- 及格分数：两个官方来源都未公布。

## 读题：识别旧版协议干扰项

- 首个真实请求前需要设置步骤、握手或版本协商：2026-07-28 没有这些步骤；每个请求都在 `_meta` 中携带版本和能力。
- 会话或粘性连接负责记住调用之间的状态：协议没有会话；跨请求状态通过服务器生成的显式 handle 传递，并作为普通参数回传。
- 未知工具使用 `-32601`：正确代码是 `-32602`；`-32601` 表示方法本身未知。
- schema 校验失败的参数被报告为协议错误：它应是工具执行错误，即带有 `isError: true` 的普通结果，而不是 JSON-RPC 错误。
- 完整陷阱表位于 `certifications/mcpa/research/mcp-2026-07-28-brief.md` 第 16 节。

## 34 课路线

| 课程 | 领域 |
|------|------|
| 00 mcp-exam-strategy | MCP 基础 |
| 01 reading-the-specification | MCP 基础 |
| 02 the-integration-problem | MCP 基础 |
| 03 json-rpc-and-meta | MCP 基础、架构与组件 |
| 04 the-stateless-core | MCP 基础 |
| 05 protocol-eras-and-compatibility | MCP 基础 |
| 06 hosts-clients-and-servers | 架构与组件 |
| 07 discovery-and-capability-negotiation | 架构与组件 |
| 08 tool-schemas-and-structured-content | 架构与组件 |
| 09 reading-server-manifests | 架构与组件 |
| 10 model-interaction-flow | 架构与组件 |
| 11 the-tools-primitive | 交互与执行 |
| 12 the-resources-primitive | 交互与执行 |
| 13 prompts-and-completion | 交互与执行 |
| 14 multi-round-trip-requests-and-elicitation | 交互与执行 |
| 15 deprecated-client-features | 交互与执行 |
| 16 notifications-and-subscriptions | 交互与执行 |
| 17 tool-invocation-lifecycle | 交互与执行 |
| 18 error-handling | 交互与执行 |
| 19 transports-and-http-headers | 交互与执行、架构与组件 |
| 20 caching-and-pagination | 交互与执行 |
| 21 long-running-work-and-tasks | 交互与执行 |
| 22 trust-boundaries | 安全与治理 |
| 23 oauth-authorization | 安全与治理 |
| 24 client-registration-and-identity | 安全与治理 |
| 25 consent-and-least-privilege | 安全与治理 |
| 26 risk-and-safety-controls | 安全与治理 |
| 27 auditability-and-observability | 安全与治理 |
| 28 roles-and-adoption | 用例与生态 |
| 29 operational-use-cases | 用例与生态 |
| 30 the-extensions-framework | 用例与生态 |
| 31 mcp-apps | 用例与生态 |
| 32 registry-gateways-and-sdk-tiers | 用例与生态 |
| 33 mcpa-capstone-readiness | 全部五个领域 |

使用 `code/main.py` 中的 `allocate_study_hours` 和 `estimate_readiness`，按自己的数据重新计算时间与备考程度；使用同一文件中的 `route_for_domain` 查询路线。

以上事实及检索日期的来源：仓库中的 `certifications/mcpa/research/source-verification-ledger.md`。
