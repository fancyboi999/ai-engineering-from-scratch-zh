---
name: terminal-coding-agent
description: 构建一个终端原生的编码 agent，在 SWE-bench Pro 上评估，要求成本有上限、工具跑在沙箱里、完整接入 2026 年的全部 hook 事件。
version: 1.0.0
phase: 19
lesson: 01
tags: [capstone, coding-agent, claude-code, swe-bench, mcp, hooks, sandbox]
---

给定一个目标仓库和一条自然语言任务，构建一套 harness：先做规划，再在沙箱中执行，最后开出 pull request。在 30 个任务的 SWE-bench Pro 子集上追平或超过 mini-swe-agent 基线，同时每个任务的花费控制在 $5 以内。

构建计划：

1. 用 Bun + Ink 搭一个 TUI harness，包含规划面板、工具调用流，以及实时的 token/美元预算显示。
2. 通过 Model Context Protocol StreamableHTTP 定义六个工具（read_file、edit_file、ripgrep、tree_sitter_symbols、run_shell、git）。每次调用最多返回 4k token。
3. 每次工具调用都在 E2B 或 Daytona 沙箱中执行，并且基于用 `git worktree add` 新建的分支。绝不碰宿主机文件系统。
4. 接入 2026 年全部八个 hook 事件：SessionStart、SessionEnd、PreToolUse、PostToolUse、UserPromptSubmit、Notification、Stop、PreCompact。至少交付四个自己写的 hook（危险命令拦截、token 计量、OTel span 发送、trace 包写入）。
5. 强制执行三项预算：50 轮、200k token、$5 美元。PreCompact 在 150k 时触发，对较早的轮次做摘要。
6. 按 GenAI 语义约定发出 OpenTelemetry span，送到自托管的 Langfuse。
7. 成功后推送分支并开 PR，PR 正文附上规划和 trace 包。
8. 在 30 个 issue 的 SWE-bench Pro Python 子集上与 mini-swe-agent 对比评估，记录每个任务的 pass@1、轮数、token 数和美元花费。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 | 在同一 30 任务子集上对比 mini-swe-agent 基线 |
| 20 | 架构清晰度 | 规划/执行/观察的分离、hook 接入面、工具 schema 的可读性 |
| 20 | 安全性 | 沙箱逃逸红队测试 + 危险命令拦截审计 |
| 20 | 可观测性 | 100% 的工具调用都有 span，每轮都有 token 计量 |
| 15 | 开发者体验 | 冷启动 2 秒以内、崩溃恢复、Ctrl-C 取消语义 |

直接否决：

- harness 在宿主机文件系统上调用 git，而不是在沙箱内。
- agent 能写入 worktree 之外的位置，或能在没有显式白名单 hook 的情况下 curl 外部 URL。
- 报告评估数字时，没有在同样的 30 个 issue 上跑对照基线。
- "通过率"依赖在重试之间执行 `git reset --hard`；SWE-bench Pro 的指标是 pass@1。

拒绝规则：

- 无论什么配置，都拒绝直接推送到 main。只走 PR 分支。
- 拒绝关闭危险命令拦截。这是评分标准的硬性要求。
- 拒绝在没有预算上限的情况下运行。不设上限的运行会污染评估对比。

输出：一个仓库，包含 harness、一套固定的 30 任务 SWE-bench Pro 评估 harness 及配套的 mini-swe-agent 基线运行结果、至少 5 次完整运行的 OpenTelemetry trace 归档，以及一份说明文档，写清哪些任务 harness 能解而基线不能，反之亦然。最后用一节写出你观察到的前三个失败模式，以及修复每个模式的 hook 改动。
