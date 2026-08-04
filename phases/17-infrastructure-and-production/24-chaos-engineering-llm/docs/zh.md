# LLM 生产环境的混沌工程

> 2026 年，面向 LLM 的混沌工程是它自己的一门学科。在生产里跑实验前的前提：定义好的 SLI/SLO、trace+指标+日志的可观测性、自动回滚、runbook、on-call。架构有四个面：控制（实验调度器）、目标（服务、基础设施、数据存储）、安全（守卫 + 中止 + 流量过滤）、可观测性（指标 + trace + 日志）、反馈（进 SLO 调整）。guardrails 是强制的：燃尽率告警在每日错误预算燃尽 > 2x 预期时暂停实验；抑制窗口 + trace-ID 关联给告警噪声去重。节奏：每周小 canary + SLO 复盘；每月 game day + 复盘；每季度跨团队韧性审计 + 依赖映射。LLM 专属实验：内存过载、网络故障、供应商宕机、畸形 prompt、KV cache 驱逐风暴。工具：Harness Chaos Engineering（LLM 推导的建议、爆炸半径缩小、MCP 工具集成）；LitmusChaos（CNCF）；Chaos Mesh（CNCF Kubernetes 原生）。

**类型：** Learn
**语言：** Python（标准库，一个玩具级混沌实验执行器）
**前置要求：** 阶段 17 · 23（面向 AI 的 SRE）、阶段 17 · 13（可观测性）
**预计时间：** ~60 分钟

## 学习目标

- 说出混沌工程的五个前提（SLI/SLO、可观测性、回滚、runbook、on-call），并解释为什么跳过任何一个都会破坏这门实践。
- 画出四个面（控制、目标、安全、可观测性）以及进 SLO 的反馈回路。
- 列举五个 LLM 专属实验（内存过载、网络故障、供应商宕机、畸形 prompt、KV 驱逐风暴）。
- 在给定栈下挑工具 —— Harness、LitmusChaos、Chaos Mesh。

## 问题背景

传统栈里的混沌测试已经成熟。LLM 栈加了新的故障模式。一个带毒字符的 4K token prompt 让分词器卡死 12 秒。一个上游供应商 429；你的网关重试；你的服务在重试放大的并发下 OOM。突发负载下一次 KV cache 驱逐风暴引发重 prefill 级联，把算力打满。

这些没一个在单元测试里露面。混沌工程就是你在用户之前发现它们的办法。

## 核心概念

### 前提

没有以下东西别在生产里跑混沌：

1. **SLI/SLO** —— 定义好的服务级指标和目标。
2. **可观测性** —— trace、指标、日志，接到仪表盘。
3. **自动回滚** —— 阶段 17 · 20 的策略 flag 回滚。
4. **runbook** —— 结构化的，阶段 17 · 23。
5. **on-call** —— 有人响应。

缺任何一个，混沌就变成真实事件。

### 四个面 + 反馈

**控制面** —— 实验调度器（Litmus workflow、Chaos Mesh schedule、Harness UI）。

**目标面** —— 服务、pod、节点、负载均衡器、数据存储。

**安全面** —— kill switch、抑制窗口、爆炸半径限制、错误预算闸门。

**可观测性面** —— 正常指标 + trace-ID 关联，用来区分混沌引发的和自然的故障。

**反馈回路** —— 发现反馈进 SLO 调整、runbook 更新、代码修复。

### guardrails 是强制的

- **燃尽率告警**：如果每日错误预算燃尽超过 2x 预期，暂停实验。
- **抑制窗口**：实验期间，对爆炸半径内的非实验告警静音。
- **trace-ID 关联**：所有实验引发的错误都带一个标签，让 on-call 能去重。

### 五个 LLM 专属实验

1. **内存过载** —— 用高并发发长上下文请求，强制一次 KV cache 抢占风暴。观察：服务是优雅卸载还是崩溃？

2. **网络故障** —— 切断推理网关和供应商之间的连接。观察：回退是否在 SLA 内启动？（阶段 17 · 19）

3. **供应商宕机模拟** —— OpenAI 100% 返回 429。观察：路由是否故障转移到 Anthropic？（阶段 17 · 16、19）

4. **畸形 prompt** —— 注入让分词器卡死的载荷（比如深度嵌套的 unicode、巨大的 UTF-8 码点）。观察：单个请求会不会锁死一个 worker？

5. **KV 驱逐风暴** —— 通过把 vLLM block 预算打满来强制驱逐。观察：LMCache 会恢复，还是服务降级？

### 节奏

- **每周** —— 预发里的小 canary 实验，也许 5% 生产。
- **每月** —— 针对某个具体场景的计划性 game day；跨团队参加；复盘。
- **每季度** —— 跨团队韧性审计；依赖图更新。

### 工具

- **Harness Chaos Engineering** —— 商用；AI 推导的实验建议；爆炸半径缩小；MCP 工具集成。
- **LitmusChaos** —— CNCF 毕业；基于 Kubernetes workflow。
- **Chaos Mesh** —— CNCF sandbox；Kubernetes 原生 CRD 风格。
- **Gremlin** —— 商用；支持广泛。
- **AWS FIS** / **Azure Chaos Studio** —— 托管云产品。

### 从小处开始

第一个实验：在稳态流量下 pod-kill 一个 decode 副本。观察重路由和恢复。如果这能跑且看起来安全，升级到网络混沌。

第一个 LLM 专属实验：注入一个供应商 429 持续 5 分钟。观察回退。大多数团队发现自己的回退没被完整测过。

### 你该记住的数字

- 四个面：控制、目标、安全、可观测性。
- 燃尽率暂停：2x 预期的每日预算燃尽。
- 节奏：每周 canary、每月 game day、每季度审计。
- 五个 LLM 实验：内存、网络、供应商、畸形 prompt、KV 风暴。

```figure
i4-chaos-guard
```

## 实际使用

`code/main.py` 用安全面闸门模拟三个混沌实验。报告哪些实验会触发燃尽率中止。

## 拿去用

这一课产出 `outputs/skill-chaos-plan.md`。给定栈和成熟度，挑前三个实验和工具。

## 练习

1. 跑 `code/main.py`。哪个实验触发燃尽率闸门，为什么？
2. 为一个基于 vLLM 的 RAG 服务设计前五个混沌实验。包含成功标准。
3. 你的燃尽率告警暂停了一个实验。你怎么判定根因 —— 混沌还是自然？
4. 论证混沌该在生产跑还是只在预发跑。什么时候生产是正确答案？
5. 说出三个通用网络混沌无法复现的 LLM 专属故障模式。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| SLI / SLO | "服务目标" | 指标 + 目标；必需的前提 |
| 爆炸半径 | "范围" | 受实验影响的服务 / 用户集合 |
| 燃尽率告警 | "预算闸门" | 错误预算燃尽率 > 2x 预期时触发 |
| Game day | "每月演练" | 计划性的跨团队混沌演练 |
| LitmusChaos | "CNCF workflow" | CNCF 毕业的 Kubernetes 混沌工具 |
| Chaos Mesh | "CNCF CRD" | CNCF sandbox 的 Kubernetes 原生混沌 |
| Harness CE | "商用 AI 辅助" | 带 AI 建议的 Harness 混沌 |
| 畸形 prompt | "分词器炸弹" | 让分词卡死的输入 |
| KV 驱逐风暴 | "抢占级联" | 引发重 prefill 的大规模驱逐 |

## 延伸阅读

- [DevSecOps School — Chaos Engineering 2026 Guide](https://devsecopsschool.com/blog/chaos-engineering/)
- [Ankush Sharma — Observability for LLMs (book)](https://www.amazon.com/Observability-Large-Language-Models-Engineering-ebook/dp/B0DJSR65TR)
- [LitmusChaos (CNCF)](https://litmuschaos.io/)
- [Chaos Mesh (CNCF)](https://chaos-mesh.org/)
- [Harness Chaos Engineering](https://www.harness.io/products/chaos-engineering)
- [AWS FIS](https://aws.amazon.com/fis/)
