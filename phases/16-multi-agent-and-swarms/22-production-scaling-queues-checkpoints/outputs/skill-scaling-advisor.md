---
name: scaling-advisor
description: 为多 agent 生产系统选择持久化执行方案。根据实际负载和状态保留需求，在 FastAPI + Postgres、LangGraph runtime、Temporal、Restate 或自研方案之间做选择。
version: 1.0.0
phase: 16
lesson: 22
tags: [multi-agent, production, scaling, durable-execution, queues, checkpoints]
---

给定一份多 agent 生产部署计划，推荐持久化执行的底层方案。

输出以下内容：

1. **负载画像。** 并发 agent 运行数（p50、p99）。单次运行时长（几秒到几小时）。需要等待人工介入的运行占比。部署频率。
2. **状态画像。** 单次运行的状态大小（KB 到 MB）。保留要求（几秒的 checkpoint 历史，还是完整审计日志）。确定性：能否从 checkpoint 确定性地重放，还是只能从日志重放？
3. **副作用画像。** 哪些副作用需要恰好一次（支付、外部 API、邮件）？哪些可以接受至少一次（纯工具读取）？恰好一次需要 outbox 模式。
4. **推荐档位。**
   - 第 1 档（Bedi 法则）：FastAPI + Postgres。并发运行少于约 100、时长不到一小时、重试逻辑简单。
   - 第 2 档：LangGraph runtime 或 Temporal。运行时长以小时计、需要中断/恢复、结构化重试。
   - 第 3 档：自研方案，配 outbox + 事件溯源。有特殊需求、高吞吐、严格审计。
5. **部署模型。** 单版本还是彩虹/金丝雀部署？长时间运行的有状态负载必须用彩虹部署。
6. **异步 / 线程边界。** 哪些部分用异步（LLM 调用、工具 I/O），哪些用线程/进程（CPU 密集的后处理、嵌入计算）。
7. **可观测性。** 每次运行的 trace、super-step 审计、重试计数。trace 的存储（与 checkpoint 存储分开）。

直接否决：

- 给只有 10 个并发运行的原型推荐 Temporal。繁琐成本大于价值。
- 每个任务一个线程的 LLM 调用架构。I/O 密集 + 每线程 1MB 内存，扩展不了。
- 涉及付费副作用却没有 outbox 模式的设计。重复扣费代价很高。
- 对持续数小时的 agent 运行用单版本部署。每次推代码，用户都会丢失状态。

拒绝规则：

- 如果负载未知且没测过，推荐第 1 档并做负载测试。过早优化只会浪费时间。
- 如果用户想要代币化 / 区块链持久化的系统，说明持久化执行引擎通常解决不了这个（需要自己写事件溯源）；涉及代币化的流程建议做法律审查。
- 如果团队没有 on-call 工程师，Temporal / LangGraph runtime 的运维人手不够；在 on-call 到位之前推荐第 1 档。

输出：两页简报。开头用一句话给出推荐（"按当前负载用第 1 档（FastAPI + Postgres + outbox）；当 p99 运行时长超过 10 分钟或并发运行超过 200 时，升级到 LangGraph runtime。"），然后是上面七个部分。最后给出 90 天升级路径：要关注的指标、升级阈值、运行手册大纲。
