# 顶点项目 01 —— 终端原生编码 agent

> 到 2026 年，编码 agent 的形态已经定型。一个 TUI 外壳、一份带状态的计划、一组沙箱化的工具面、一个负责规划、行动、观察、恢复的循环。从五十米开外看，Claude Code、Cursor 3、OpenCode 长得都一样。这个顶点项目要求你端到端做出一个——输入是 CLI，输出是 pull request——并在 SWE-bench Pro 上拿它跟 mini-swe-agent 和 Live-SWE-agent 比一比。你会明白，难的不是那次模型调用，而是工具循环、沙箱，以及一次 50 轮运行的成本上限。

**类型：** Capstone
**语言：** TypeScript / Bun（外壳）、Python（评测脚本）
**前置要求：** 第 11 阶段（LLM 工程）、第 13 阶段（工具与协议）、第 14 阶段（agent）、第 15 阶段（自主系统）、第 17 阶段（基础设施）
**涉及阶段：** P0 · P5 · P7 · P10 · P11 · P13 · P14 · P15 · P17 · P18
**预计时间：** 35 小时

## 问题背景

2026 年，编码 agent 成了主导性的 AI 应用品类。Claude Code（Anthropic）、带 Composer 2 和 Agent Tabs 的 Cursor 3（Cursor）、Amp（Sourcegraph）、OpenCode（11.2 万 stars）、Factory Droids、Google Jules，全都是同一套架构的变体：一个终端外壳、一组带权限的工具面、一个沙箱，以及围绕前沿模型搭起来的规划-行动-观察循环。前沿很窄——Live-SWE-agent 用 Opus 4.5 在 SWE-bench Verified 上拿到了 79.2%——但工程手艺的空间很宽。绝大多数失败模式都不是模型出错。它们是工具循环不稳、上下文中毒、token 成本失控，以及破坏性的文件系统操作。

你没法从外部去推演这些 agent。你得亲手做一个，亲眼看着它在第 47 轮因为 ripgrep 返回了 8MB 的匹配结果而崩掉循环，然后重建那一层截断逻辑。这就是这个顶点项目的意义。

## 核心概念

外壳有四个面。**Plan**（规划）维护一个 TodoWrite 风格的状态对象，模型每一轮都重写它。**Act**（行动）分派工具调用（读、改、运行、搜索、git）。**Observe**（观察）捕获 stdout / stderr / 退出码，做截断，再把摘要喂回去。**Recover**（恢复）处理工具错误，既不撑爆上下文窗口，也不无限循环。2026 年的形态又多了一样东西：**hooks**。`PreToolUse`、`PostToolUse`、`SessionStart`、`SessionEnd`、`UserPromptSubmit`、`Notification`、`Stop`、`PreCompact`——一组可配置的扩展点，运营方在这里注入策略、遥测和护栏。

沙箱是 E2B 或 Daytona。每个任务在一个全新的 devcontainer 里运行，挂载一个可读写的 git worktree。外壳从不碰宿主机的文件系统。任务成功或失败后，worktree 都会被拆掉。成本控制分三层执行：每轮的 token 上限、每个会话的美元预算、一个硬性的轮数上限（通常是 50）。可观测性这一层是带 GenAI 语义约定的 OpenTelemetry span，发往一个自托管的 Langfuse。

## 架构

```
  user CLI  ->  harness (Bun + Ink TUI)
                  |
                  v
           plan / act / observe loop  <--->  Claude Sonnet 4.7 / GPT-5.4-Codex / Gemini 3 Pro
                  |                          (via OpenRouter, model-agnostic)
                  v
           tool dispatcher (MCP StreamableHTTP client)
                  |
     +------------+------------+----------+
     v            v            v          v
  read/edit    ripgrep     tree-sitter   git/run
     |            |            |          |
     +------------+------------+----------+
                  |
                  v
           E2B / Daytona sandbox  (worktree isolated)
                  |
                  v
           hooks: Pre/Post, Session, Prompt, Compact
                  |
                  v
           OpenTelemetry -> Langfuse (spans, tokens, $)
                  |
                  v
           PR via GitHub app
```

## 技术栈

- 外壳运行时：Bun 1.2 + Ink 5（在终端里跑 React）
- 模型接入：OpenRouter 统一 API，接 Claude Sonnet 4.7、GPT-5.4-Codex、Gemini 3 Pro、Opus 4.5（用于最难的任务）
- 工具传输：Model Context Protocol StreamableHTTP（MCP 2026 修订版）
- 代码搜索：ripgrep 子进程、17 种语言的 tree-sitter 解析器（预编译）
- 隔离：每个任务一个 `git worktree add`，成功 / 失败后清理
- 评测外壳：SWE-bench Pro（verified 子集）+ Terminal-Bench 2.0 + 你自己的 30 个任务的留出集
- 可观测性：带 `gen_ai.*` 语义约定的 OpenTelemetry SDK → 自托管 Langfuse
- PR 发布：用细粒度 token 的 GitHub App，作用域只限定在目标仓库

```figure
ce-agent-loop
```

## 动手构建

1. **TUI 与命令循环。** 用 Ink 搭一个 Bun 项目。接收 `agent run <repo> "<task>"`。打印一个分屏视图：计划面板（上）、工具调用流（中）、token 预算（下）。加上 Ctrl-C 取消，退出前先触发 `SessionEnd` hook。

2. **计划状态。** 定义一个带类型的 TodoWrite schema（pending / in_progress / done 的条目，带备注）。模型每一轮以工具调用的形式重写整份状态——别让它增量地原地修改。把计划持久化到 `.agent/state.json`，这样崩溃后能恢复。

3. **工具面。** 定义六个工具：`read_file`、`edit_file`（带 diff 预览）、`ripgrep`、`tree_sitter_symbols`、`run_shell`（带超时）、`git`（status / diff / commit / push）。通过 MCP StreamableHTTP 暴露出去，让外壳与传输方式无关。每个工具都返回截断后的输出（每次调用上限 4k token）。

4. **沙箱封装。** 每个任务起一个 E2B 沙箱。`git worktree add -b agent/$TASK_ID` 拉一个全新分支。所有工具调用都在沙箱里执行。宿主机文件系统不可达。

5. **Hooks。** 把 2026 年的全部八种 hook 类型都实现出来。至少接上四个用户自己写的 hook：(a) `PreToolUse` 破坏性命令守卫，拦截 worktree 之外的 `rm -rf`；(b) `PostToolUse` token 计账；(c) `SessionStart` 预算初始化；(d) `Stop` 写出一份最终的 trace 包。

6. **评测循环。** 克隆 SWE-bench Pro Python 的一个 30 issue 子集。用你的外壳逐个跑。在 pass@1、每任务轮数、每任务美元成本这三项上跟 mini-swe-agent（最小基线）比。把结果写到 `eval/results.jsonl`。

7. **成本控制。** 硬性截断：50 轮、200k 上下文、每任务 5 美元。`PreCompact` hook 在 150k 那个点把较早的轮次摘要成一个先验状态块，腾出空间给新的观察结果，同时不丢掉计划。

8. **PR 发布。** 成功时，最后一步是 `git push` 加一次 GitHub API 调用，开一个 PR，正文里放上计划和 diff 摘要。

## 实际使用

```
$ agent run ./my-repo "Fix the race condition in worker.rs"
[plan]  1 locate worker.rs and enumerate mutex uses
        2 identify shared state under contention
        3 propose fix, verify tests
[tool]  ripgrep mutex.*lock -t rust           (44 matches, truncated)
[tool]  read_file src/worker.rs 120..180
[tool]  edit_file src/worker.rs (+8 -3)
[tool]  run_shell cargo test worker::          (passed)
[plan]  1 done · 2 done · 3 done
[done]  PR opened: #482   turns=9   tokens=38k   cost=$0.41
```

## 拿去用

可交付的 skill 放在 `outputs/skill-terminal-coding-agent.md`。给定一个仓库路径和一段任务描述，它会在沙箱里跑完整的规划-行动-观察循环，返回一个 PR URL 加一份 trace 包。这个顶点项目的评分标准：

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | SWE-bench Pro pass@1 对比基线 | 在 30 个匹配的 Python 任务上，你的外壳 vs mini-swe-agent |
| 20 | 架构清晰度 | 规划/行动/观察的分离、hook 面、工具 schema——对照 Live-SWE-agent 的布局来评审 |
| 20 | 安全性 | 沙箱逃逸测试、权限提示、破坏性命令守卫扛得住红队 |
| 20 | 可观测性 | trace 完整度（100% 的工具调用都有 span）、每轮的 token 计账 |
| 15 | 开发者体验 | 冷启动 < 2s、崩溃恢复能续上计划、Ctrl-C 在工具执行中途能干净地取消 |
| **100** | | |

## 练习

1. 把背后的模型从 Claude Sonnet 4.7 换成在 vLLM 上服务的 Qwen3-Coder-30B。比较 pass@1 和每任务美元成本。报告开源模型在哪些地方掉链子。

2. 加一个 `reviewer` 子 agent，在发 PR 之前读一遍 diff，可以发起一轮修订循环。测一下假阳性的评审会不会把 SWE-bench 通过率压到单 agent 基线之下（提示：通常会）。

3. 给沙箱做压力测试：写一个试图 `curl` 外部 URL 的任务，再写一个试图往 worktree 之外写文件的任务。确认两者都被 PreToolUse hook 拦下来。把这些尝试记下来。

4. 用一个更小的模型（Haiku 4.5）实现 `PreCompact` 摘要。测一下在 3 倍压缩下计划的保真度损失了多少。

5. 把 MCP StreamableHTTP 传输换成 stdio。给冷启动和单次调用延迟跑个基准。给纯本地使用挑个赢家。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Harness（外壳） | “那个 agent 循环” | 围在模型外面的代码，负责分派工具、维护计划状态、执行预算 |
| Hook | “agent 事件监听器” | 用户自己写的脚本，由外壳在八种生命周期事件之一上运行 |
| Worktree | “git 沙箱” | 在另一个路径上的一份关联的 git 检出；可随手丢弃，不碰主克隆 |
| TodoWrite | “计划状态” | 一份带类型的 pending/in-progress/done 条目列表，模型每一轮重写它 |
| StreamableHTTP | “MCP 传输” | 2026 MCP 修订版：长连接 HTTP，带双向流；取代 SSE |
| Token ceiling（token 上限） | “上下文预算” | 每轮或每会话对输入+输出 token 的上限；触发压缩或终止 |
| pass@1 | “单次尝试通过率” | 第一次运行就解决的 SWE-bench 任务占比，不重试、不偷看测试集 |

## 延伸阅读

- [Claude Code documentation](https://docs.anthropic.com/en/docs/claude-code) —— Anthropic 的参考外壳
- [Cursor 3 changelog](https://cursor.com/changelog) —— Agent Tabs 和 Composer 2 的产品说明
- [mini-swe-agent](https://github.com/SWE-agent/mini-swe-agent) —— SWE-bench 外壳对比用的最小基线
- [Live-SWE-agent](https://github.com/OpenAutoCoder/live-swe-agent) —— 用 Opus 4.5 在 SWE-bench Verified 上拿到 79.2%
- [OpenCode](https://opencode.ai) —— 开源外壳，11.2 万 stars
- [SWE-bench Pro leaderboard](https://www.swebench.com) —— 这个顶点项目瞄准的评测
- [Model Context Protocol 2026 roadmap](https://blog.modelcontextprotocol.io/posts/2026-mcp-roadmap/) —— StreamableHTTP、能力元数据
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) —— 工具调用和 token 用量的 span schema
