# 生产运行时：Queue、Event、Cron

> 生产 agent 跑在六种运行时形态上：请求-响应、流式、持久执行、基于队列的后台、事件驱动、定时。在挑框架之前先挑形态。可观测性在每种形态下都是承重的。

**类型：** Learn
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 13（LangGraph）、阶段 14 · 22（语音）
**预计时间：** ~60 分钟

## 学习目标

- 说出六种生产运行时形态，并把每种匹配到一个框架 / 产品模式。
- 解释为什么持久执行（LangGraph）对长跨度任务重要。
- 描述事件驱动运行时，以及 Claude Managed Agents 何时合适。
- 解释多步 agent 中「可观测性即承重」的主张。

## 问题背景

生产 agent 以 Jupyter notebook 不会暴露的方式失败：第 37 步网络超时、用户在语音通话中途挂断、cron 作业在机器重启时挂掉、后台 worker 内存耗尽。运行时形态决定了哪些失败是可挺过去的。

## 核心概念

### 请求-响应

- 同步 HTTP。用户等待完成。
- 只对短任务可行（<30s）。
- 技术栈：Agno（Python + FastAPI）、Mastra（TypeScript + Express/Hono/Fastify/Koa）。
- 可观测性：标准 HTTP 访问日志 + OTel span。

### 流式

- SSE 或 WebSocket 做渐进式输出。
- LiveKit 把它扩展到 WebRTC 用于语音/视频（第 22 课）。
- 技术栈：任何支持流式的框架 + 一个处理 SSE/WS 的前端。
- 可观测性：每块计时、首 token 延迟、尾延迟。

### 持久执行

- 每一步后状态检查点；失败时自动恢复。
- AutoGen v0.4 actor 模型把失败隔离到一个 agent（第 14 课）。
- LangGraph 的核心差异化（第 13 课）。
- 当步数未知、恢复成本高时不可或缺。

### 基于队列 / 后台

- 作业进队列，worker 拾取，结果通过 webhook 或 pub/sub 流回。
- 对长跨度 agent 不可或缺（每个任务几十到几百步，据 Anthropic 的 computer use 公告）。
- 技术栈：Celery（Python）、BullMQ（Node）、SQS + Lambda（AWS）、自定义。
- 可观测性：队列深度、每作业延迟分布、DLQ 大小。

### 事件驱动

- agent 订阅触发器：新邮件、PR 打开、cron 触发。
- Claude Managed Agents 开箱覆盖这个（第 17 课）。
- CrewAI Flows（第 15 课）结构化事件驱动的确定性工作流。
- 可观测性：触发来源、事件到启动的延迟、agent 延迟。

### 定时

- cron 形态的 agent，周期性运行。
- 与持久执行结合，这样一次失败的夜间运行会在下一次触发时恢复。
- 技术栈：Kubernetes CronJob + 一个持久框架；托管（Render cron、Vercel cron）。

### 2026 年部署模式

- **CrewAI Flows** 用于事件驱动生产。
- **Agno** 无状态 FastAPI 用于 Python 微服务。
- **Mastra** 服务器适配器（Express、Hono、Fastify、Koa）用于嵌入。
- **Pipecat Cloud / LiveKit Cloud** 用于托管语音（第 22 课）。
- **Claude Managed Agents** 用于托管的长时运行异步。

### 可观测性是承重的

没有 OpenTelemetry GenAI span（第 23 课）加一个 Langfuse/Phoenix/Opik 后端（第 24 课），你就没法调试一个在第 40 步失败的多步 agent。这对生产来说不是可选项。它是「我们调试得快」和「我们加更多日志从头重放」之间的区别。

### 生产运行时在哪里会失败

- **错误的形态选择。** 给一个 5 分钟任务选请求-响应。用户挂断；worker 堆积；重试叠加。
- **没有 DLQ。** 队列 worker 没有死信。失败作业消失。
- **不透明的后台工作。** 后台 agent 跑而不导出 trace。失败在用户报告前都是看不见的。
- **跳过持久状态。** 任何 > 30 秒、又承受不起重启的运行都需要持久执行。

```figure
wb-runtime-shapes
```

## 动手构建

`code/main.py` 是一个标准库多形态演示：

- 请求-响应端点（普通函数）。
- 流式处理器（生成器）。
- 带 DLQ 的基于队列的 worker。
- 事件触发器注册表。
- cron 形态的调度器。

运行它：

```bash
python3 code/main.py
```

输出：五条轨迹，展示每种形态在同一任务上的行为。同样的 agent 逻辑，不同的外壳。持久执行（第六种形态）有意放在第 13 课用 LangGraph 检查点讲。

## 实际使用

- **请求-响应** 用于聊天式 UX。
- **流式** 用于渐进式响应。
- **持久** 用于长跨度任务。
- **队列** 用于批处理 / 异步 / 长时运行。
- **事件** 用于 agent 的反应性。
- **Cron** 用于杂务（记忆整合、评估、成本报告）。

## 拿去用

`outputs/skill-runtime-shape.md` 为一个任务挑选运行时形态并接好可观测性要求。

## 练习

1. 把你第 01 课的 ReAct 循环移植到你技术栈里的全部六种形态。哪种形态适合哪个产品接触面？
2. 给基于队列的演示加一个 DLQ。模拟 10% 的作业失败；暴露 DLQ 大小。
3. 写一个 cron 触发的评估 agent，每晚对着当天 top 20 trace 运行。
4. 实现带背压的流式：如果客户端慢，暂停 agent。这与轮数预算怎么相互作用？
5. 读 Claude Managed Agents 文档。你什么时候会把一个自托管的长跨度 agent 迁到托管？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Request-response | 「同步」 | 用户等待；只限短任务 |
| Streaming | 「SSE / WS」 | 渐进式输出；更好的 UX；延迟可按块观测 |
| Durable execution | 「从失败恢复」 | 检查点状态；从上一步重启 |
| Queue-based | 「后台作业」 | 生产者 / worker 池 / DLQ |
| Event-driven | 「基于触发器」 | agent 对外部事件做反应 |
| DLQ | 「死信队列」 | 失败作业的停车场 |
| Claude Managed Agents | 「托管 harness」 | Anthropic 托管的长时运行异步，带缓存 + 压实 |

## 延伸阅读

- [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview) —— 持久执行细节
- [Claude Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview) —— 托管的长时运行异步
- [Anthropic, Introducing computer use](https://www.anthropic.com/news/3-5-models-and-computer-use) —— 「每个任务几十到几百步」
- [AutoGen v0.4 (Microsoft Research)](https://www.microsoft.com/en-us/research/articles/autogen-v0-4-reimagining-the-foundation-of-agentic-ai-for-scale-extensibility-and-robustness/) —— actor 模型故障隔离
