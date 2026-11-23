---
name: durable-execution-review
description: 审查拟议的长时运行 agent 部署是否具备正确的持久化执行形态（activity、确定性、检查点后端、人工输入状态、恢复时 HITL）。
version: 1.0.0
phase: 15
lesson: 12
tags: [durable-execution, workflows, checkpointing, temporal, langgraph, agents-sdk]
---

给定一个拟议的长时运行 agent 部署（Temporal + OpenAI Agents SDK、带 PostgreSQL checkpointer 的 LangGraph、Microsoft Agent Framework、Claude Code Routines、Cloudflare Durable Objects，或自研的等价方案），对照持久化执行模式审计其设计。

产出：

1. **Activity 清单。** 列出每个 activity（LLM 调用、工具调用、HTTP 请求、文件写入）。逐一确认它被包装成带重试策略、超时和幂等键的 activity。游离在 activity 封装之外的裸 LLM 调用是可靠性漏洞。
2. **工作流确定性。** 找出工作流代码里每一处非确定性读取（墙钟时间、随机数、外部状态）。每一处都必须注册为副作用 activity，这样重放时才能返回相同的值。隐藏的非确定性是重放漂移最常见的原因。
3. **检查点后端。** 指出所用后端（PostgreSQL、SQLite、Redis、Durable Objects）。确认它在部署后依然保留。SQLite 只适合开发环境。Redis 需要配置 AOF 或快照。Cloudflare Durable Objects 对使用者透明，但要求严格遵守唯一键规范。
4. **人工输入状态。** 确认 HITL 暂停是工作流的一等状态，而不是轮询循环。工作流应阻塞在一个外部信号上（审批队列、webhook、`interrupt()` 原语），审批一到就准确恢复。
5. **恢复时 HITL 策略。** 对崩溃后的任何恢复，说明执行下一个 activity 之前是否需要重新经过 HITL。没有这一条，持久化执行加上崩溃前已批准的审批，可能在上下文已经变化时再次触发那个已批准的动作。对长时间跨度的任务至关重要。

直接否决：
- 使用 Agent SDK 却没有把 LLM 调用包装成 activity。
- 部署后无法保留的检查点后端。
- 嵌入墙钟时间或随机数却没有用 activity 包装的工作流。
- 用轮询循环而不是信号来建模人工输入。
- 没有恢复时 HITL 策略的长时间跨度运行（超过一小时）。
- 在持久化之上没有叠加预算 kill switch（第 13 课）的运行。

拒绝规则：
- 用户提出的持久化工作流没有对副作用 activity 显式做幂等时，拒绝，要求先加上幂等键。否则重试会导致重复执行。
- 用户拿不出重放测试（运行工作流、中途崩溃、重放、断言没有重复副作用）时，拒绝，要求上生产前先补上这个测试。
- 用户提出 24 小时无人值守运行却没有 HITL 检查点时，拒绝。35 分钟性能衰减现象（见第 12 课笔记）说明，即使持久化做对了，这仍然是个可靠性问题。

输出格式：

返回一份设计审查备忘录，包含：
- **Activity 表格**（activity、重试策略、超时、幂等键）
- **确定性审计**（非确定性读取及各自的处理方式）
- **检查点后端**（名称、部署后保留 y/n、重放测试状态）
- **HITL 状态形态**（一等状态 / 轮询 / 缺失）
- **恢复时 HITL 策略**（明确写出，附理由）
- **就绪度**（production / staging / research-only）
