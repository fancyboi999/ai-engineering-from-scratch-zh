# 业务发现、需求与 SLA

> 架构设计的第一步，是确定你真正负责解决什么问题。

**类型：** 参考
**语言：** Python
**前置要求：** 阶段 11，第 13 课；阶段 14，第 12 课；阶段 17，第 08 课
**预计时间：** 约 120 分钟

## 学习目标

- 将宽泛的 AI 需求转化为可衡量的问题陈述
- 区分功能、质量、基础设施、安全和生命周期需求
- 定义成功指标、服务级别目标和升级边界
- 找出架构设计开始前需要证据验证的假设
- 产出一份技术与业务利益相关方都能批准的发现简报

## 问题所在

一位客服主管要求开发一个能自动解决所有工单的 agent。
这个需求听起来很具体，其实并不是。

你还不知道哪些工单类别属于范围之内、“解决”究竟意味着什么、agent 可以修改哪些
系统、它有多大的财务权限、用户能够容忍多长的延迟，以及哪些操作必须由人来完成。
你甚至不知道真正的问题是响应时间、政策执行不一致、积压、成本，还是客户满意度。

如果一上来就列模型和工具清单，你优化的只是一个假设。技术上再出色的系统也可能失败：
它也许改善了错误的指标，自动执行了禁止的步骤，或只是把工作从客服人员转移给审核人，
并没有减少总工作量。

架构设计始于发现。考试会检验你能否把业务意图转化为解决方案，并为其中的取舍给出
站得住脚的理由。在实际工作中，这项能力能避免数月返工。

## 核心概念

### 从决策出发，而不是从功能出发

把需求改写成一项有负责人、有证据、有后果的决策。

薄弱的问题陈述：

```text
Build a Claude support agent.
```

以决策为中心的陈述：

```text
Reduce median time to a policy-correct first response for billing questions
from 11 minutes to under 3 minutes, while keeping unsupported-refund actions at
zero and preserving human approval for refunds above the team threshold.
```

第二种陈述告诉你应该衡量什么，也明确了什么不该自动化。

在第一次发现会议中问五个问题：

1. 哪个可观察结果应该发生变化？
2. 谁对这个结果负责？
3. 输出之后会执行什么操作？
4. 答案错误、迟到或缺失的代价是什么？
5. 哪些约束不可妥协？

### 先对需求分类，再确定优先级

如果把所有诉求都变成“需求”下面的普通项目符号，架构师就会丢失信息。应该明确分类。

| 类别 | 问题 | 客服示例 |
|------|------|----------|
| 功能 | 系统必须做什么？ | 读取工单、查找政策、起草回复 |
| 质量 | 需要达到多好的效果？ | 在 98% 的评估草稿中引用当前有效的政策版本 |
| 性能 | 速度要多快，规模要多大？ | 每秒 40 个请求时，草稿延迟 P95 低于 8 秒 |
| 安全 | 谁可以查看或修改什么？ | 只有负责该工单的客服人员可以查看账户上下文 |
| 安全防护 | 哪些结果必须阻止或经过审批？ | 未通过有效权限决策，绝不退款 |
| 可运维性 | 如何发现故障并恢复？ | 对检索新鲜度和工具错误率发出告警 |
| 生命周期 | 谁负责更新、审批和退役？ | 政策团队负责来源新鲜度，平台团队负责运行时 |

分类会暴露矛盾。“立即作答”与“进行三来源合规审查”互相冲突。“自动执行所有退款”与
人工审批要求互相冲突。发现阶段会在代码把这些矛盾变成事故之前，先让它们浮出水面。

### 梳理当前工作流

不要根据幻灯片里描述的理想流程来设计。观察真实工作。

```mermaid
flowchart LR
    I["Ticket arrives"] --> T["Agent classifies intent"]
    T --> P["Agent searches policy"]
    P --> A["Agent checks account authority"]
    A --> D["Agent drafts or escalates"]
    D --> R["Reviewer approves risky action"]
    R --> O["Reply and action recorded"]
    O --> F["Outcome becomes feedback"]
```

针对每个步骤，记录：

- 输入和输出
- 记录系统
- 负责角色
- 决策规则
- 常见例外
- 延迟和返工
- 数据分类
- 留存的证据

价值最高的介入点可能是政策步骤的检索、受理环节的窄范围分类器，或更好的审批界面。
自主 agent 只是可能的模式之一。

### 将价值与能力分开

Claude 可能有能力起草回复。但它能否创造业务价值，取决于草稿在审核后是否减少了总处理
时间、提高了一致性，或实现了新的服务级别。

使用一个简单的价值假设：

```text
For [user or team], changing [workflow step] with [bounded capability] will
improve [business measure] from [baseline] to [target], without violating
[guardrail]. We will know after [evaluation window].
```

每个字段都必须用证据填写，否则就标记为假设。不要把不确定性藏进一张看似笃定的架构图。

### 把风险转化为审核边界

人工审核不是万能的安全答案。它必须有触发条件、审核人、证据包、时间预算和回退方案。

针对每项操作，评估：

- 出错时的影响
- 可逆性
- 证据所能提供的置信度
- 法规或政策义务
- 滥用风险
- 审核成本

低影响、可逆的草稿可以自动推进。高影响或不可逆的操作需要确定性检查和明确授权。
中等风险通常需要抽样、基于阈值的审核或事后审计。

### 正确定义 SLI、SLO 和 SLA

服务级别指标（SLI）是实际测量的信号。服务级别目标（SLO）是内部目标。服务级别协议
（SLA）是带有业务或合同后果的承诺。

| 层级 | 示例 |
|------|------|
| SLI | 草稿中带有当前有效政策引用的比例 |
| SLO | 在滚动七天窗口内至少达到 98% |
| SLA | 在合同约定的客服时限内向客户首次响应 |

不要承诺模型准确率 SLA，除非已经定义了样本总体、标签、测量方法，以及目标未达成时的
响应措施。“模型准确率为 95%”在运维层面没有意义。

对于 AI 系统，应包含多类指标：

- 任务质量：事实准确性、完整性、政策遵循情况
- 系统性能：延迟、可用性、吞吐量
- 经济性：每个成功任务的成本、缓存命中率、审核工作量
- 安全性：被阻止的不安全操作、错误阻止、升级准确率
- 运维：检索新鲜度、工具故障、回滚时间

### 明确写出非目标

非目标可以防止系统范围在不知不觉中扩大。

例如：

- 首个版本只起草回复，不发送回复。
- 它处理账单常见问题，但不处理账户关闭。
- 它会建议退款金额，但不能执行退款。
- 试点期间只支持英文工单。

如果利益相关方不同意，说明发现阶段找到了一项需要明确负责人的决策。这就是进展。

## 动手构建

## 交互实验

```figure
22-sla-value-tradeoff
```

使用价值和 SLA 探索器调整基线、目标、审核工作量、质量、延迟和不可妥协的权限约束。
它会显示一个能力足够的系统何时仍会让整个工作流得不偿失，或违反不可让步的门槛。

## 实践实验

把一项基线改成没有证据支撑的主张，正确分类，并在选择架构之前为它补上负责人、证据来源
和决策日期。

## 交付产物

填写完成的 [`outputs/discovery-brief.md`](../outputs/discovery-brief.md) 是一份经批准、以决策
为中心的客服试点方案，其中包含可衡量的 SLI、SLO、假设、非目标和负责人。

## 验证

验证事实、估算、偏好和约束没有被混为一谈：

```bash
cd certifications/claude/lessons/22-business-discovery-requirements-and-slas
python3 code/main.py
python3 -m unittest discover -s code/tests -v
```

测验检查你对发现和服务级别决策的掌握程度。

## 综合项目关联

在 Architect Professional 综合项目中，把这份简报作为第一项产物。

绘制架构之前，先创建一页发现简报。

```markdown
# Discovery Brief

## Outcome
- Owner:
- Current baseline:
- Target:
- Evaluation window:

## Users and Workflow
- Primary user:
- Current workflow step:
- Downstream action:
- Exceptions:

## Requirements
- Functional:
- Quality:
- Performance:
- Security:
- Safety:
- Operability:
- Lifecycle:

## Data and Authority
- Data classes:
- Systems of record:
- Read permissions:
- Write permissions:
- Human approval triggers:

## Measures
- SLIs:
- SLOs:
- Business measures:
- Guardrail measures:

## Assumptions to Test
- Assumption:
- Evidence needed:
- Owner:
- Decision date:

## Non-Goals
- Not in the first release:
```

接着进行假设审计。将每项陈述标记为事实、估算、偏好或约束。事实需要来源，估算需要置信
区间，偏好需要负责人，约束需要权威依据。

### 按错误成本确定优先级

对每个候选用例使用下面的决策表：

| 维度 | 低 | 中 | 高 |
|------|----|----|----|
| 错误输出的影响 | 小幅编辑 | 引起客户不满 | 财务、法律或安全损害 |
| 可逆性 | 一键撤销 | 手动更正 | 不可逆或难以更正 |
| 数据敏感性 | 公开 | 内部 | 受监管或机密 |
| 操作权限 | 仅草稿 | 有限写入 | 破坏性或财务写入 |
| 证据质量 | 直接来源 | 部分来源 | 模糊或缺失 |

高分并不意味着自动禁止使用 AI，而是要让架构转向更窄的范围、确定性门禁、更强的证据、
人工审批和更保守的上线方式。

## 上手使用

把这份简报应用到三个候选架构：

1. 由人工审批的检索辅助草稿生成。
2. 仅在分类和起草环节调用 Claude 的确定性工作流。
3. 能使用工单、政策、账户和退款工具的自适应 agent。

根据需求为每个方案评分。能力最强的方案未必合适。如果工作流稳定且路径已知，确定性编排
通常能降低延迟、成本和故障面。只有当执行路径取决于执行过程中发现的证据，而且额外的灵活性
值得承担控制成本时，才使用 agent。

在架构决策记录中写下选择：

```markdown
# ADR: Support Resolution Pattern

## Status
Proposed

## Context
Decision, constraints, evidence, and unresolved assumptions.

## Options
1. Retrieval-assisted draft workflow
2. Deterministic multi-step workflow
3. Adaptive tool-using agent

## Decision
Chosen option and the requirement it best satisfies.

## Rejected Alternatives
Why each alternative loses under current constraints.

## Consequences
New operational work, residual risk, and reversal plan.

## Verification
Offline evaluation, pilot guardrails, SLOs, and review date.
```

## 考试决策模式

当场景以宽泛的业务需求开头时，最有力的第一步通常是在选择技术之前消除歧义。

优先选择符合以下特征的答案：

- 明确业务成果和当前基线
- 找出用户、记录系统和后续操作
- 区分硬性约束与偏好
- 定义质量和运维指标
- 指定审核和生命周期负责人
- 通过有限试点检验风险最高的假设

如果答案尚未厘清权限和错误成本，就直接选择最大模型、添加 agent 或承诺自动化，应保持警惕。

## 常见陷阱

### 把每个需求都变成 agent

agent 的灵活性有代价：更多工具调用、更大的攻击面、更难的测试和更不可预测的延迟。
只有在自适应规划本身就是需求时才应选择它。

### 把人工审核当成免费资源

审核队列可能成为新的瓶颈。要衡量审核时间、结论一致性和升级质量。

### 使用没有分母的准确率

明确数据集、样本总体、标签、评估人和时间窗口。否则这个数字无法指导运维决策。

### 忽视上线后的负责人

每个 prompt、来源、工具、控制措施、指标和升级路径都需要负责人。无人负责的控制措施会悄然失效。

## 练习

1. 把“开发一个 AI 分析师”改写成一项以决策为中心的问题陈述，其中包含基线、目标、护栏和负责人。
2. 梳理一个真实工作流，并找出其中一个确定性规则优于模型调用的步骤。
3. 为检索辅助的合规工作流定义五项 SLI，至少包含一项质量、安全、经济性和可运维性信号。
4. 写一份 ADR，拒绝采用 agent 架构，即使模型有能力完成这项工作。
5. 设计一个试点，在不给系统生产写入权限的前提下检验风险最高的假设。

## 关键术语

| 术语 | 人们常说的意思 | 实际含义 |
|------|----------------|----------|
| 需求 | 一项请求的功能 | 解决方案必须满足的可测试条件 |
| 约束 | 某件不方便的事 | 架构不可妥协的边界 |
| SLI | 一个 SLA 目标 | 用于判断服务行为的测量信号 |
| SLO | 供应商的承诺 | 针对某项指标的内部目标 |
| SLA | 任意性能目标 | 带有明确后果的服务承诺 |
| 非目标 | 被悄悄推迟的工作 | 防止范围漂移的明确边界 |
| ADR | 一张图 | 长期记录上下文、备选方案、决策和后果的文档 |

## 延伸阅读

- [Claude Certified Architect Professional 考试指南](https://everpath-course-content.s3-accelerate.amazonaws.com/instructor%2F6nizmqk8tpzpfjvt6qmmav7rh%2Fpublic%2F1783542810%2FClaude+Certified+Architect+%E2%80%93+Professional+Exam+Guide.pdf)，了解公开的生命周期和架构目标
- [Anthropic 关于构建高效 agent 的指南](https://www.anthropic.com/research/building-effective-agents)，了解工作流与 agent 的取舍
- [Claude Platform 文档](https://platform.claude.com/docs/en/home)，了解当前产品和 API 行为
- 阶段 11，第 13 课：生产应用边界
- 阶段 17，第 08 课：延迟、吞吐量和有效吞吐量指标
