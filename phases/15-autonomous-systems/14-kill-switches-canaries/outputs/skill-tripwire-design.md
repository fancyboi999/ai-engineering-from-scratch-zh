---
name: tripwire-design
description: 审查拟议的 agent 检测器栈（kill switch、熔断器、canary token），在首次自主运行前指出缺失的绊线。
version: 1.0.0
phase: 15
lesson: 14
tags: [kill-switch, circuit-breaker, canary, honeytoken, detection-and-response]
---

给定一个 agent 部署的拟议检测器栈，对照三检测器参考模型（kill switch、熔断器、canary）审计它，指出哪些缺失、哪些调得不对、哪些暴露给了 agent。

产出：

1. **Kill switch 审计。** 开关放在哪里（feature flag、Redis、签名配置）？确认 agent 的凭证无法触动它。确认每个有后果的动作都会检查开关，而不只是在启动时检查。确认重新启用是一个显式的人工动作。
2. **熔断器清单。** 列出每个熔断器监视的模式（重复、连续失败、速率、不可信读取之后调用特定工具）。为每个模式写明阈值和冷却时间。阈值高于 10 通常太松。
3. **Canary 设计。** 列出环境中的每个 canary token。对每个 token 说明：它是什么（假凭证、假数据库记录、假文件、假记忆条目）、放在哪里、什么访问会触发告警、呼叫谁。确认任何 canary 都没有被正常访问的理由。
4. **统计检测与硬性限制分层。** 确认检测器栈在统计检测器（EWMA、z-score）之外，至少还有一条硬性限制（第 17 课的宪法式规则）。只有统计检测器会放过缓慢漂移。
5. **隔离路径。** 检测器触发后会发生什么？完全停止 agent、暂停特定路径、重定向流量（eBPF / Cilium 蜜罐），还是只告警。确认这条路径至少做过一次端到端测试。

直接否决：
- 没有外部 kill switch 的任何部署。
- 存放在 agent 有写权限的系统里的 canary token。
- 只有统计检测、没有硬性限制。
- 冷却结束后无需人工审查就自动恢复的熔断器。
- 只在启动时检查 kill switch、而不是每个动作都检查的无人值守运行。

拒绝规则：
- 用户说不出 kill switch 托管在 agent 凭证之外的哪些具体系统上时，拒绝。如果 agent 能写配置文件，"我们用一个 agent 会读的配置文件"就不算 kill switch。
- 用户把 Auto Mode 分类器（第 10 课）当作绊线的替代品时，拒绝。分类器与检测和响应无关。
- 拟议的 canary 放在 agent 有正当理由读取的系统里时，拒绝，要求重新设计。

输出格式：

返回一份绊线审计，包含：
- **Kill switch 说明**（位置、检查频率、重新启用流程）
- **熔断器表格**（模式、阈值、冷却时间）
- **Canary 表格**（token、位置、告警、负责人）
- **分层说明**（是否同时有统计检测与硬性限制 y/n）
- **隔离流程**（什么触发、触发后怎么处理、是否测试过 y/n）
- **就绪度**（production / staging / research-only）
