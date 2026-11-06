---
id: governance-narrows-never-widens
title: 所有笔记本共用一份放行列表，谁能放宽它
card: sandboxes
kind: tradeoff
level: 3
roles: [forward-deployed-ai-engineer, agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, design-review]
tags: [sandbox, governance, audit-log, network-policy, compliance]
minutes: 10
lessons: []
manuals: [docker-sandboxes-101#s-org-policies-profiles-and-the-audit-log, docker-sandboxes-101#s-sbx-policy-init-allow-deny-and-check-network]
practice: []
cheatsheet: [sandbox-policy, ai-governance]
related: [sandboxes/deny-wins-and-the-two-scopes]
updated: 2026-11-03
---

安全团队希望在每位开发者的笔记本电脑上强制执行统一的外发白名单、记录 Agent 访问的每个主机，并确保证明任何开发者都无法单方面拓宽该列表。对比每台笔记本上的本地策略与来自集中治理产品的组织统一策略。当组织策略激活的瞬间，笔记本本地会发生哪些变化，一条审计日志记录具体包含哪些内容？

## Short answer

本地策略让每台笔记本各自拥有独立的预设和规则、单主机粒度的 `policy log` 日志，且开发者可随意添加全局放行规则，因而无法满足第三项刚性要求。组织策略由中心下发并在 5 分钟内到达守护进程，从此唯有组织层面的放行规则能够赋予网络访问权限：本地和工具包的放行规则即刻全部失效，本地和工具包的拒绝规则依然强制生效，且本地拒绝规则甚至能压制组织的审批弹窗要求。守护进程随后为每次安全决策生成一条 JSONL 格式的审计日志，包含决策结论、请求资源、拒绝原因、操作类型和执行 Agent 等元数据，且不包含 prompt 内容、agent 输出或参数值；该功能需要付费订阅，且覆盖范围仅限于本地沙箱。

## Full answer

### 组织治理策略可配置的维度

支持三种策略类型：网络访问策略、文件系统访问策略以及 MCP 访问策略。网络规则细化为 HTTP 维度（单个目标结合请求方法和路径模式），或针对 TCP、UDP 或两者全部流量的放行或拒绝，并支持配置强制审批，使每个放行目标在首次连接时必须等待开发者确认一次。MCP 策略在 `MCP` 命名空间下采用 Cedar 策略语言，遵循默认拒绝，且 `forbid` 绝对优先于任何 `permit`。单个组织最多容纳 100 条策略，每条上限 250 个规则，单条大小上限 400 KB。网络规则在下一个网络请求到来时即时生效，文件系统规则仅在创建新沙箱时生效，而 MCP 注册规则在下一次调用 `sbx mcp add` 时生效。

### 笔记本本地失去与保留的权限

| 规则类型 | 在集中治理下是否参与求值 |
|---|---|
| organization allow（组织放行） | 是 |
| organization deny（组织拒绝） | 是 |
| local allow（本地放行） | 否 |
| local deny（本地拒绝） | 是 |
| kit allow（工具包放行） | 否 |
| kit deny（工具包拒绝） | 是 |

执行 `sbx policy reset` 会强制从远端拉取最新策略，代价是清空所有本地规则和已记录的审批放行记录。验证策略是否激活的依据是查看 `sbx policy ls` 输出中是否存在 `Governance: Managed by <org>`，未受管机器上的 `check network` 会明确汇报 `"governance": {"active": false}`，这正是录制捕获所呈现的状态。强制登录机制在受管配置文件中列出 `allowedOrgs`，随后的 `sbx login` 会自动吊销任何其他未授权账户的凭据。

### 审计日志记录的结构细节

仅有在受管策略约束下、持有治理许可证且已登录的用户，其本地守护进程才会写入审计日志；CLI 命令行自身从不记录审计日志。日志文件命名遵循 `audit-<utc-timestamp>-<process-uuid>-<seq>.jsonl`，每隔 5 分钟、累积 1000 个事件或达到 50 MiB 时从 `.tmp` 归档定稿，且从不删除。`category` 划分为 management（管理）、evaluation（评估）或 execution（执行）；`decision` 包含从 allow 到 approval-deny 五种裁决取值；`action_type` 指明有效载荷类型，例如 `network_egress`、包含方法、主机、端口和路径的 `http_request`，或 `tool_invocation`。示例记录的 `deny_reason` 携带与本地 `policy log` 打印完全一致的字符串：`no applicable policies for op(action=net:connect:tcp, resource=net:domain:example.com:443)`。云端交付让事件在 90 天内可供检索，并能转发到 SIEM 系统。

### 集中治理的边界局限

它仅覆盖本地沙箱；云端沙箱使用其独立的账户体系与策略存储。在宿主机上通过 `--command` 注册的本地服务以外部宿主用户身份直接运行在代理之外。此外，一条放行了某主机的规则依然允许向其发送任何请求，除非配套有更细粒度的 HTTP 规则予以收窄。

## Follow-ups

- **Level 3:** 在集中治理下，开发者添加了针对新主机的全局放行规则，Agent 能访问它吗？ Expected: 不能；集中治理激活时本地放行规则处于禁用失效状态，只有组织放行规则能赋予权限。
- **Level 3:** 组织收紧了一项文件系统规则，哪些沙箱会立即受影响？ Expected: 新创建的沙箱；文件系统规则仅在创建时应用，运行中的沙箱必须销毁并重新创建。
- **Level 4:** SIEM 日志流水线不能期望从这些审计记录中提取什么？ Expected: prompt 文本、输出或参数值；应按 `schema_version` 映射字段，且仅采集定稿归档的 `.jsonl` 文件。
- **Level 4:** 控制了本地笔记本的攻击者还能从哪里拓宽外发通道？ Expected: 无法通过策略系统拓宽；但宿主机侧通过 `--command` 启动的 MCP 服务或登录另一账户的云端沙箱完全绕过了受管本地代理。

## Wrong answers

- "组织策略会直接追加合并到本地放行列表中。" 它直接覆盖替代了本地放行；激活期间本地与工具包的放行规则不再授权。
- "每台笔记本电脑都默认保留审计日志。" 只有在强制受管策略下持有许可证且正常登录的用户才会生成审计日志；未受管机器完全不产生该记录。
- "集中治理下的本地拒绝仍会弹出审批确认。" 它会直接阻断且不弹窗；本地拒绝的优先级高于组织审批要求。

## Taught in

[治理章节](../../../manuals/docker-sandboxes-101/sections/7-2-org-policies-profiles-and-the-audit-log.md)打印了优先级仲裁表格与示例审计记录，[策略章节](../../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)展示了 `check network` 中的治理标志。
