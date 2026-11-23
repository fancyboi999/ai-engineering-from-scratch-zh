---
name: stategraph-designer
description: 把 agent 任务转成 LangGraph StateGraph，包含命名节点、类型化状态、reducer、checkpointer 和人工中断。
version: 1.0.0
phase: 11
lesson: 16
tags: [langgraph, stategraph, checkpointer, interrupt, time-travel, react-agent, human-in-the-loop]
---

给定 agent 任务（面向用户的目标、可用工具、预期轮数、副作用及其安全影响范围、持久化要求、目标延迟预算），输出：

1. 节点列表。给每个独立步骤命名：LLM 思考节点、每个工具执行节点、每个人工复核步骤、任何摘要器或评审器、任何检索器。如果某个节点承担了不止一项职责，否决该设计并拆分它。
2. 状态 schema。TypedDict（或 Pydantic）字段，每个列表都配 reducer。消息日志一律用 Annotated[list, add_messages]。把任务专属的列表（计划、预算计数器、检索文档列表）从 messages 里提出来，确保并行更新时 reducer 依然正确。
3. 边映射。下一步确定时用静态边。只有由模型选择下一步时，才用带命名路由函数的条件边。如果路由函数依赖一次尚未在前序节点中完成的新 LLM 调用，否决该图。
4. 中断位置。每个有不可逆副作用的节点（写入、删除、支付、有成本的外部 API 调用）都加 interrupt_before。如果输出校验在独立进程中运行，在模型节点上加 interrupt_after。否决任何加在有副作用节点上的 interrupt_after；到那时副作用已经发生了。
5. Checkpointer。MemorySaver 只用于测试。任何必须撑过重启的环境，从 PostgresSaver、SQLiteSaver、RedisSaver 中选。确认 thread_id 策略（按用户、按会话、按对话）和 checkpoint TTL。

没有 checkpointer 的 LangGraph 拒绝交付。没有 checkpointer 就没有恢复、没有 time-travel、没有 human-in-the-loop 重放。messages 字段不带 add_messages 的拒绝交付；第二次写入会静默覆盖第一次，半段对话就没了。所有转移都是由规划 LLM 路由的条件边的图，也拒绝交付；那只是多绕几步的 AutoGen，每一轮都在烧 token。

示例输入："Refund-handling agent over Anthropic Claude with three tools (lookup_order, issue_refund, send_email), must pause for a human before any refund over 100 dollars, must resume after server restart, p95 latency budget 8 seconds."

示例输出：
- 节点：agent（LLM 调用）、lookup_tool、refund_tool、email_tool、human_review。
- 状态：messages 配 add_messages，order_context（覆盖），refund_amount（覆盖），reviewer_decision（覆盖）。
- 边：agent 连到 should_continue 路由，分支为 lookup_tool、refund_tool、email_tool、human_review、END。工具节点回到 agent。
- 中断：refund_amount > 100 时在 refund_tool 上加 interrupt_before。lookup_tool 和 email_tool 不加中断。
- Checkpointer：PostgresSaver，thread_id 为 "user:{user_id}:case:{case_id}"，TTL 30 天。
