# 面向 AI 的 SRE —— 多 agent 事件响应、Runbook、预测性检测

> AI SRE 用 LLM，经由 RAG 接地在基础设施数据（日志、runbook、服务拓扑）上，把调查、文档和协调阶段自动化。2026 年的架构模式是多 agent 编排 —— 专门的 agent（日志、指标、runbook）由一个 supervisor 协调；AI 提出假设和查询，人来批准判断性的决定。Datadog Bits AI 和 Azure SRE Agent 把这作为托管产品发布。Runbook 在进化：NeuBird Hawkeye 用对抗式评估（两个模型分析同一事件；一致 = 置信，分歧 = 不确定）；运维记忆跨团队变动持续存在。自动修复保持谨慎：AI 建议，人批准。完全自主的动作很窄（重启 pod、回滚特定部署），带紧的 guardrails —— 任何兜售"设好就不管"的人都在夸大其词。新兴前沿：事件前预测。MIT 研究报告一个训练在历史日志 + GPU 温度 + API 错误模式上的 LLM，提前 10-15 分钟预测了 89% 的宕机。预测：到 2026 年底，95% 的企业 LLM 都有自动故障转移。

**类型：** Learn
**语言：** Python（标准库，一个玩具级多 agent 事件分诊模拟器）
**前置要求：** 阶段 17 · 13（可观测性）、阶段 17 · 24（混沌工程）
**预计时间：** ~60 分钟

## 学习目标

- 画出多 agent 的 AI SRE 架构：supervisor + 专门 agent（日志、指标、runbook）+ 人工批准闸门。
- 解释为什么自动修复是窄的（重启 pod、还原部署）而不是宽的（重构服务）。
- 说出对抗式评估模式（NeuBird Hawkeye）：两个模型一致 = 置信；分歧 = 升级。
- 引用 MIT 的 89% 早期检测结果，以及那条运维约束：没有执行的预测只是仪表盘。

## 问题背景

一个 on-call 工程师凌晨 3 点被呼叫。"结账高错误率。"他们查 Datadog、Loki、三份 runbook、部署日志。30 分钟后才意识到根因是一次 KV cache 尖峰引发的 vLLM OOM。他们重启 pod；错误消失。

2026 年，那次调查的头 20 分钟是可自动化的。按服务分组日志、关联到近期部署、对照 runbook 匹配 —— 全是 RAG + 工具使用。一个受监督的 agent 能做首遍分诊，在人打开 Datadog 之前给出一个假设。

完全自主的修复是另一个问题。重启 pod：安全。扩 GPU 池：策略允许的话安全。重构服务：绝对不行。这门纪律就是画出那条窄线。

## 核心概念

### 多 agent 架构

```
          事件
             │
             ▼
        Supervisor
        /    |    \
       ▼     ▼     ▼
  日志 agent  指标 agent  Runbook agent
       │     │     │
       └─────┴─────┘
             │
             ▼
        假设 + 证据
             │
             ▼
        人工批准
             │
             ▼
        动作 (窄集合)
```

Supervisor 把事件拆成子查询。专门 agent 有工具访问（日志搜索、PromQL、文档检索）。Supervisor 综合，把假设 + 证据呈给人。人批准或重新引导。

### 自动修复的范围

**安全（窄）**：重启 pod、还原特定部署、在预批准边界内扩池、启用预批准的 feature flag。

**不安全（宽）**：改服务拓扑、改资源限制、部署新代码、改 IAM、改数据库。

任何兜售"设好就不管"的人都在夸大其词。安全集合随 AI SRE 成熟而扩大，但那条边界是真实的。

### 对抗式评估（NeuBird Hawkeye）

两个模型独立分析同一事件。如果它们对根因一致，置信度高。如果分歧，连同两个假设一起升级给人。简单的模式，对幻觉根因是个有效过滤器。

### 运维记忆

人员流动是传统 SRE 的无声杀手 —— 部落知识随人离开。AI SRE 把 runbook + 复盘存进向量数据库；agent 在每个新事件上检索。新工程师加入时，AI 拥有全部历史。

### 事件前预测

MIT 2025 研究：训练在历史日志、GPU 温度、API 错误模式上的 LLM，在测试集上提前 10-15 分钟预测了 89% 的宕机。

清醒一下：没有执行的预测就是仪表盘。运维问题是"当我们预测到时，我们做什么？"抢先排空？呼叫？自动扩缩？答案是策略特定的。

### 2026 年的产品

- **Datadog Bits AI** —— Datadog 内的托管 SRE 副驾。
- **Azure SRE Agent** —— Azure 原生。
- **NeuBird Hawkeye** —— 对抗式评估 + 运维记忆。
- **PagerDuty AIOps** —— 分诊 + 去重。
- **Incident.io Autopilot** —— 事件指挥官 + 协调。

### Runbook 即代码

Runbook 从 Confluence 页面进化成带结构化章节（症状、假设、验证、动作）的版本化 markdown。结构化 runbook 喂出更好的 RAG 检索。任何 AI-SRE 上线都从把非结构化 runbook 变成结构化开始。

### 你该记住的数字

- MIT 早期检测：89% 的宕机，10-15 分钟提前量。
- 多 agent 分诊：supervisor + （日志、指标、runbook）+ 人。
- 安全自动修复集合：重启 pod、还原部署、边界内扩缩。
- 对抗式评估：两个模型独立；一致 = 置信。

```figure
i4-incident-agents
```

## 实际使用

`code/main.py` 模拟一次多 agent 分诊：日志 agent 找到错误，指标 agent 找到 CPU 尖峰，runbook agent 匹配到已知问题。Supervisor 给假设排序。

## 拿去用

这一课产出 `outputs/skill-ai-sre-plan.md`。给定当前 on-call、事件量、团队成熟度，设计一次 AI SRE 上线。

## 练习

1. 跑 `code/main.py`。如果日志和指标 agent 分歧呢？supervisor 怎么裁决？
2. 为你的服务定义三个"安全"的自动修复动作。论证每个。
3. 写一个结构化 runbook 模板：章节、必填字段、验证命令。
4. 预测性检测以 12 分钟提前量触发。你的策略是什么 —— 呼叫、预排空，还是两者都？
5. 论证一个 3 人团队在 2026 年是该采用 AI SRE 还是等等。考虑成熟度、量、风险。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| AI SRE | "on-call 的 agent" | LLM 支撑的事件调查 + 协调 |
| Supervisor agent | "编排器" | 把事件拆成子查询的顶层 agent |
| 专门 agent | "领域 agent" | 带工具访问的子 agent（日志、指标、runbook） |
| 自动修复 | "AI 来修" | 窄的预批准动作；不是宽的重构 |
| 运维记忆 | "向量 runbook" | 复盘 + runbook 存进向量数据库做 RAG |
| 对抗式评估 | "双模型检查" | 独立分析；一致 = 置信 |
| NeuBird Hawkeye | "那个对抗式的" | 带对抗式评估 + 记忆模式的产品 |
| Bits AI | "Datadog 的 SRE agent" | Datadog 托管的 AI SRE |
| 事件前预测 | "早期检测" | 宕机预测有 10-15 分钟提前量 |

## 延伸阅读

- [incident.io — AI SRE Complete Guide 2026](https://incident.io/blog/what-is-ai-sre-complete-guide-2026)
- [InfoQ — Human-Centred AI for SRE](https://www.infoq.com/news/2026/01/opsworker-ai-sre/)
- [DZone — AI in SRE 2026](https://dzone.com/articles/ai-in-sre-whats-actually-coming-in-2026)
- [Datadog Bits AI](https://www.datadoghq.com/product/bits-ai/)
- [NeuBird Hawkeye](https://www.neubird.ai/)
- [awesome-ai-sre](https://github.com/agamm/awesome-ai-sre)
