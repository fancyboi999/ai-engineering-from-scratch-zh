# 生产级 Agent 运行时——快速实例化与类型化工作流

> 生产级 agent 运行时会优化原型框架忽略的部分：实例化成本、类型化工作流接口，以及可直接服务的后端。2026 年的一组代表实现是 Agno（Python）与 Mastra（TypeScript）：前者瞄准微秒级 agent 实例化和无状态 FastAPI 后端，后者在 Vercel AI SDK 底座上提供 agent、工具、工作流、统一模型路由和复合存储。

**类型：** Learn
**语言：** Python、TypeScript
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 13（LangGraph）
**预计时间：** ~45 分钟

## 学习目标

- 认清 Agno 的性能目标，以及它们什么时候重要。
- 说出 Mastra 的三个原语 —— Agents、Tools、Workflows —— 以及支持的服务器适配器。
- 解释为什么一个无状态、会话范围的 FastAPI 后端是 Agno 推荐的生产路径。
- 为给定技术栈（Python 优先 vs TypeScript 优先）在 Agno 和 Mastra 之间做选择。

## 问题背景

LangGraph、AutoGen、CrewAI 都框架味很重。想要「就 agent 循环、快、在我的运行时里」的团队会上 Agno（Python）或 Mastra（TypeScript）。两者都拿一些框架掌管的原语换取原始速度，以及与周边技术栈更紧的贴合。

## 核心概念

### Agno

- Python 运行时，前身是 Phi-data。
- 「没有图、链或绕来绕去的模式 —— 就是纯 python。」
- 它们文档里的性能目标：~2μs agent 实例化、每 agent ~3.75 KiB 内存、~23 个模型提供方。
- 生产路径：无状态、会话范围的 FastAPI 后端。每个请求起一个全新 agent；会话状态住在数据库里。
- 原生多模态（文本、图像、音频、视频、文件）和 agentic RAG。

速度目标在你每秒有成千上万个短命 agent 时（聊天扇入、评估流水线）才重要。在一个 agent 跑 10 分钟时就没那么重要。

### Mastra

- TypeScript，建在 Vercel AI SDK 上。
- 三个原语：**Agents**、**Tools**（Zod 类型化）、**Workflows**。
- 统一模型路由器 —— 94 个提供方下 3,300+ 个模型（2026 年 3 月）。
- 复合存储：记忆、工作流、可观测性可分别到不同后端；规模化可观测性推荐 ClickHouse。
- Apache 2.0，`ee/` 目录在 source-available 企业许可证下。
- Express、Hono、Fastify、Koa 的服务器适配器；一等的 Next.js 和 Astro 集成。
- 提供 Mastra Studio（localhost:4111）供调试。
- 22k+ GitHub star，1.0 时（2026 年 1 月）每周 npm 下载 300k+。

### 定位

两者都不想成为 LangGraph。它们竞争的点在于：

- **语言贴合。** Agno 给 Python 优先的团队；Mastra 给 TypeScript 优先的。
- **运行时人体工学。** Agno = 近零开销；Mastra = 与 Vercel 生态集成。
- **可观测性。** 两者都与 Langfuse/Phoenix/Opik（第 24 课）集成，但 Mastra Studio 是第一方的。

### 什么时候选哪个

- **Agno** —— Python 后端、许多短命 agent、强性能要求、FastAPI 团队。
- **Mastra** —— TypeScript 后端、Next.js / Vercel 部署、统一多提供方模型路由、Zod 类型化工具。
- **LangGraph**（第 13 课）—— 当持久状态和显式图推理比原始速度更重要时。
- **OpenAI / Claude Agent SDK** —— 当你想要提供方的产品化形态时（第 16–17 课）。

### 这个模式在哪里会出错

- **为性能而性能。** 当工作负载是每请求一次慢 agent 调用时，因为「2μs」听着不错就选 Agno。开销不是瓶颈。
- **生态锁定。** Mastra 的 Vercel 风味集成在 Vercel 上是加分，在别处是减分。
- **企业许可证混淆。** Mastra 的 `ee/` 目录是 source-available 的，不是 Apache 2.0。如果你打算 fork，把许可证读了。

```figure
wb-runtime-spawn
```

## 动手构建

这一课主要是对比性的 —— 没有哪个单一代码产物能同时把两个框架讲到位。见 `code/main.py` 里的并排玩具：一个极简的「跑一个 agent、流式输出、持久化会话」流程实现两遍（一遍 Agno 形态，一遍 Mastra 形态）。

运行它：

```
python3 code/main.py
```

两条结构上不同但功能上等价的轨迹。

## 实际使用

- **Agno** —— 需要速度和 FastAPI 形态的 Python 后端。
- **Mastra** —— 带许多提供方和工作流原语的 TypeScript 后端。
- 两者都提供第一方可观测性 hook。两者都与 Langfuse 集成。

## 拿去用

`outputs/skill-runtime-picker.md` 基于技术栈、延迟预算和运维形态，在 Agno、Mastra、LangGraph 或某个提供方 SDK 之间挑选。

## 练习

1. 读 Agno 的文档。把标准库 ReAct 循环（第 01 课）移植到 Agno。什么消失了？什么留下了？
2. 读 Mastra 的文档。把同一个循环移植到 Mastra。工具类型化（Zod vs 什么都没有）有什么变化？
3. 基准测试：在你的技术栈上度量 agent 实例化延迟。Agno 的 2μs 对你的工作负载重要吗？
4. 设计一次迁移：如果你一直在 Python 里跑 CrewAI，移到 Agno 会有什么崩掉？
5. 读 Mastra 的 `ee/` 许可证条款。哪些限制会影响一个开源 fork？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Agno | 「快速 Python agent」 | 无状态、会话范围的 agent 运行时 |
| Mastra | 「Vercel AI SDK 上的 TypeScript agent」 | Agents + Tools + Workflows + Model Router |
| Unified Model Router | 「多提供方访问」 | 94 个提供方下 3,300+ 个模型的单一客户端 |
| Composite storage | 「多个后端」 | 记忆/工作流/可观测性各到不同存储 |
| Mastra Studio | 「本地调试器」 | localhost:4111 的 UI，用于内省 agent |
| Source-available | 「非 OSS」 | 许可证允许阅读源码但限制商业使用 |

## 延伸阅读

- [Agno Agent Framework docs](https://www.agno.com/agent-framework) —— 性能目标、FastAPI 集成
- [Mastra docs](https://mastra.ai/docs) —— 原语、服务器适配器、Model Router
- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) —— 有状态图替代品
- [Comet Opik](https://www.comet.com/site/products/opik/) —— Mastra 集成引用的可观测性对比
