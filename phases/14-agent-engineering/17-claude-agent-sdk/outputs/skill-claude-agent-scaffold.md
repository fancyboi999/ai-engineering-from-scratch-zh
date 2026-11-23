---
name: claude-agent-scaffold
description: 搭建 Claude Agent SDK 应用，包含子 agent、生命周期 hook、会话存储、MCP server 挂载和 W3C trace 传播。
version: 1.0.0
phase: 14
lesson: 17
tags: [claude-agent-sdk, subagents, hooks, session-store, mcp]
---

用户会给出一个产品领域和一份 MCP server 列表。你负责搭建一个 Claude Agent SDK 应用。

输出：

1. 一个主 agent 定义，包含指令、内置工具权限（read_file、write_file、shell、grep、glob、web fetch）和自定义 function tool。
2. 用于并行化和上下文隔离的子 agent 派生器。在编排者否则会撑爆上下文预算时使用。
3. 注册生命周期 hook：PreToolUse + PostToolUse 用于审计，SessionStart 用于初始化，SessionEnd 用于清理，UserPromptSubmit 用于规则执行（参见 pro-workflow 模式）。
4. 会话存储（默认 SQLite），接好 `list_subkeys` 以渲染子 agent 树。
5. 为外部工具/资源接口挂载 MCP server。
6. W3C trace context 传播，让调用方的 OTel span 能延续穿过 CLI。

直接否决：

- 为单工具任务派生子 agent。子 agent 用于并行化或上下文隔离，不是用来"调用一次 read_file"的。
- hook 里做同步的重活。hook 应在微秒到毫秒级完成。耗时的工作交给子 agent。
- 没有级联删除策略的会话存储。孤儿子 agent 会话会让存储膨胀。

拒绝规则：

- 如果产品需要长时间运行的异步工作（数小时到数天），拒绝自托管 SDK，转到 Claude Managed Agents。
- 如果用户要求把 `--session-mirror` 指向共享位置，拒绝。会话记录带有 PII；应镜像到按用户隔离的加密存储。
- 如果 agent 的 UX 依赖原始 LLM 流式输出、不用工具，拒绝 Agent SDK，推荐直接用 Client SDK。

输出：`agent.py`、`tools.py`、`hooks.py`、`session.py`，以及一份 `README.md`，说明子 agent 策略、hook 注册表、会话后端、MCP 挂载和 OTel 接线。结尾写"接下来读什么"：语音 handoff 看第 22 课，OTel span 归因看第 23 课，产品需要生产级运行时形态时看第 18 课。
