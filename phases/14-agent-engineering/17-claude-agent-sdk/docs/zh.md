# Harness 即库——子 agent 与会话存储

> 一套可以直接导入的 harness：内置工具、用于上下文隔离的子 agent、hook、W3C trace 传播和会话持久化。Claude Agent SDK 是参考实现，也就是 Claude Code harness 的库形态；Claude Managed Agents 则是面向长时异步工作的托管替代品。

**类型：** Learn + Build
**语言：** Python（标准库）
**前置要求：** 阶段 14 · 01（Agent 循环）、阶段 14 · 10（技能库）
**预计时间：** ~75 分钟

## 学习目标

- 解释 Anthropic Client SDK（原始 API）与 Claude Agent SDK（harness 形态）的区别。
- 描述子 agent —— 并行化和上下文隔离 —— 以及何时该上它们。
- 说出 Python SDK 的会话存储接触面（`append`、`load`、`list_sessions`、`delete`、`list_subkeys`）以及 `--session-mirror` 的作用。
- 用标准库实现一个 harness，带内置工具、上下文隔离的子 agent 派生、生命周期 hook 和一个会话存储。

## 问题背景

一个原始 LLM API 只给你一次往返。一个生产 agent 需要工具执行、MCP 服务器、生命周期 hook、子 agent 派生、会话持久化、trace 传播。Claude Agent SDK 把这个形态作为一个库提供出来 —— 和 Claude Code 用的同一个 harness，暴露出来给自定义 agent。

## 核心概念

### Client SDK vs Agent SDK

- **Client SDK（`anthropic`）。** 原始 Messages API。你掌管循环、工具、状态。
- **Agent SDK（`claude-agent-sdk`）。** 内置工具执行、MCP 连接、hook、子 agent 派生、会话存储。Claude Code 循环作为一个库。

### 内置工具

SDK 开箱提供 10+ 个工具：文件读/写、shell、grep、glob、网页抓取，等等。自定义工具通过标准的工具 schema 接口注册。

### 子 agent

Anthropic 记录了两个用途：

1. **并行化。** 并发跑相互独立的工作。「为这 20 个模块各找测试文件」就是 20 个并行的子 agent 任务。
2. **上下文隔离。** 子 agent 用它们自己的上下文窗口；只有结果返回给编排器。编排器的预算被保住了。

Python SDK 近期新增：`list_subagents()`、`get_subagent_messages()`，用于读取子 agent 的 transcript。

### 会话存储

与 TypeScript 协议对齐：

- `append(session_id, message)` —— 加一轮。
- `load(session_id)` —— 恢复对话。
- `list_sessions()` —— 枚举。
- `delete(session_id)` —— 级联到子 agent 会话。
- `list_subkeys(session_id)` —— 列出子 agent 键。

`--session-mirror`（CLI 标志）在 transcript 流式产出时把它镜像到一个外部文件，供调试用。

### Hook

你可以注册的生命周期 hook：

- `PreToolUse`、`PostToolUse` —— 对工具调用设关卡或审计。
- `SessionStart`、`SessionEnd` —— 建立和拆除。
- `UserPromptSubmit` —— 在模型看到用户输入之前对其采取行动。
- `PreCompact` —— 在上下文压实之前运行。
- `Stop` —— agent 退出时清理。
- `Notification` —— 旁路告警。

hook 就是 pro-workflow（阶段 14 课程参考）和类似系统添加横切行为的方式。

### W3C trace context

调用方上活跃的 OTel span 通过 W3C trace context 头传播进 CLI 子进程。整个多进程 trace 在你的后端里显示为一条 trace。

### Claude Managed Agents

托管替代品（beta 头 `managed-agents-2026-04-01`）。长时运行的异步工作、内置 prompt 缓存、内置压实。用控制权换托管基础设施。

### 这个模式在哪里会出错

- **子 agent 过度派生。** 为 100 个小任务派生 100 个子 agent。开销主导一切。改成批处理。
- **hook 蔓延。** 每个团队都加 hook；启动时间膨胀。每季度审查 hook。
- **会话膨胀。** 会话越攒越多；体积增长。用 `list_sessions` + 过期策略。

```figure
ae-subagent-isolation
```

## 动手构建

`code/main.py` 用标准库实现 SDK 的形态：

- `Tool`、`ToolRegistry`，带内置的 `read_file`、`write_file`、`list_dir`。
- `Subagent` —— 私有上下文、隔离运行、返回结果。
- `SessionStore` —— append、load、list、delete、list_subkeys。
- `Hooks` —— `pre_tool_use`、`post_tool_use`、`session_start`、`session_end`。
- 一个演示：主 agent 并行派生 3 个子 agent（各自隔离），聚合结果，持久化会话。

运行它：

```
python3 code/main.py
```

轨迹展示子 agent 的上下文隔离（编排器上下文大小保持有界）、hook 执行和会话持久化。

## 实际使用

- **Claude Agent SDK** 用于想要 Claude Code harness 形态的 Claude 优先产品。
- **Claude Managed Agents** 用于托管的长时运行异步工作。
- **OpenAI Agents SDK**（第 16 课）用于 OpenAI 优先的对应物。
- **LangGraph + 自定义工具** 如果你想要图形态的状态机。

## 拿去用

`outputs/skill-claude-agent-scaffold.md` 脚手架出一个 Claude Agent SDK 应用，带子 agent、hook、会话存储、MCP 服务器挂载和 W3C trace 传播。

## 练习

1. 加一个子 agent 派生器，把 20 个任务批成每组 5 个并行子 agent。度量编排器上下文大小，与每任务一个对比。
2. 实现一个 `PreToolUse` hook，对 `write_file` 调用限速（每会话每分钟 5 次）。追踪行为。
3. 把 `list_subkeys` 接起来渲染一棵子 agent 树。深层嵌套长什么样？
4. 把玩具移植到真实的 `claude-agent-sdk` Python 包。工具注册有什么变化？
5. 读 Claude Managed Agents 文档。你什么时候会从自托管切到托管？

## 关键术语

| 术语 | 大家怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Agent SDK | 「Claude Code 作为库」 | harness 形态：工具、MCP、hook、子 agent、会话存储 |
| Subagent | 「子 agent」 | 独立上下文、自己的预算；结果冒泡上来 |
| Session store | 「对话数据库」 | 持久化、加载、列出、删除轮次，带子 agent 级联 |
| Hook | 「生命周期回调」 | pre/post 工具、会话、prompt 提交、压实、停止 |
| W3C trace context | 「跨进程 trace」 | 父 span 传播进 CLI 子进程 |
| Managed Agents | 「托管 harness」 | Anthropic 托管的长时运行异步工作 |
| `--session-mirror` | 「transcript 镜像」 | 在会话轮次流式产出时把它们写到一个外部文件 |
| MCP server | 「工具接触面」 | 挂在 agent 上的外部工具/资源来源 |

## 延伸阅读

- [Claude Agent SDK overview](https://platform.claude.com/docs/en/agent-sdk/overview) —— Claude Code 的库形态
- [Anthropic, Building agents with the Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) —— 生产模式
- [Claude Managed Agents overview](https://platform.claude.com/docs/en/managed-agents/overview) —— 托管替代品
- [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) —— 对应物
