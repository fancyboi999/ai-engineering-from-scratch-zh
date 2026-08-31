---
name: start-learning
version: 1.0.0
description: >
  AI Engineering from Scratch 课程的一次性入门流程（523 节课、20 个阶段）。访谈学习者、
  运行分级测验，并写入由 learn skill 驱动的持久学习计划 LEARNING.md。触发短语：
  “开始学习”、“设置课程”、“开始课程”、“带我入门”、“创建学习计划”，或
  "start learning", "set up the course", "begin the curriculum", "onboard me",
  "create my learning plan"
tags: [onboarding, curriculum, ai-engineering, learning-plan]
---

# 开始学习

你正在引导学习者进入 **AI Engineering from Scratch** 课程：20 个阶段、523 节课，从线性代数到自主 agent。你的任务是在当前目录产出 `LEARNING.md`，这份单一文件记录他们为何学习、应从哪里开始以及学习路径。之后每次 `learn` session 都会读取并更新它，因此把它当作学习者的唯一事实来源。

适用于任何 agent。环境有结构化问题/选项工具时，每个问题都使用它；否则用纯文本展示带字母选项并等待回复。

## 宿主调用契约

skill 名称可移植，但调用语法属于宿主。展示下一条命令前，使用正确形式：

- Codex：`start-learning`、`learn`、`course-guide` 等 `skill-name` 形式，或告诉学习者从 `/skills` 选择 skill。
- Claude Code：`/start-learning`、`/learn`、`/course-guide` 等 `/skill-name` 形式。
- 其他兼容宿主：使用自然语言，例如 `Use learn to start my first lesson.`

绝不把 Claude Code 的斜杠命令说成通用语法。宿主未知时，使用自然语言。

## 跨课程模式的续学路由

通用入门前，将每个“继续”或“续学”请求按以下支持的状态文件和路线所有者解析：

- `LEARNING.md` 属于完整课程的 `learn`。
- `MCP-LEARNING.md` 属于 Model Context Protocol (MCP) 路线的 `learn-mcp`。
- `MCP-ENGINEERING-LEARNING.md` 是同一 `learn-mcp` 路线的旧文件名，不是独立路线。
- `AGENT-SKILLS-LEARNING.md` 属于 `learn-agent-skills`。
- `CLAUDE-CERTIFICATION.md` 属于 `claude-certification`。

学习者在续学请求中点名路线时，即使其他状态文件存在，也立即分派给该所有者，然后停止此 skill。

未点名的续学请求，收集存在状态文件的所有者，并将两个 MCP 文件名归为 `learn-mcp`。若仅剩一个路线所有者，在通用入门前调用它并停止此 skill。`learn-mcp` 负责旧文件迁移及冲突报告。若有两个或更多所有者，列出面向学习者的路线名，在进行定位或改动任何状态前询问要恢复哪一条。没有文件时继续通用入门。绝不依据文件修改时间推断路线，也绝不将一个路线的进度并入其他状态文件。

旧 runtime 可能将 `learn-mcp-engineering` 暴露为别名。只接受它以到达 `learn-mcp`；面向学习者的交接一律渲染为 `learn-mcp`，路线名称为 Model Context Protocol (MCP)。

## 专门 MCP 交接

学习者明确想学习 Model Context Protocol (MCP) 而非完整课程时，不运行定位，也不创建 `LEARNING.md`。路由至可移植 skill `learn-mcp`，其来源为 `learning-paths/model-context-protocol.json`，状态文件为 `MCP-LEARNING.md`。在 Codex 使用 `learn-mcp`、Claude Code 使用 `/learn-mcp`，或要求其他兼容宿主使用 `learn-mcp`。专用 tutor 拥有课程选择、wire evidence 及 public-deployment security gate。

## 专门 Agent Skills 交接

学习者明确想学习 Agent Skills 而非完整课程，或存在 `AGENT-SKILLS-LEARNING.md` 且其要求恢复该路线时，不运行定位，也不创建 `LEARNING.md`。路由至可移植 skill `learn-agent-skills`，来源是 `learning-paths/agent-skills.json`，状态文件是 `AGENT-SKILLS-LEARNING.md`。在 Codex 使用 `learn-agent-skills`、Claude Code 使用 `/learn-agent-skills`，或要求其他兼容宿主使用 `learn-agent-skills`。专用 tutor 拥有五课顺序、真实宿主证据、sandbox boundaries、第 26 课前的第 25 课和 tool-poisoning prerequisite gate，以及 release gate。

若 `LEARNING.md` 已存在，绝不覆盖。概述它的内容（mission、entry point、目前进度），并只提供恰好三条路径：

- **恢复：** 使用上方宿主语法调用 `learn`；完全跳过访谈与定位。
- **重新定位：** 再次进行测验，然后只更新 Placement 部分和 Path 状态；保留 Mission、Progress log 与 Review queue。
- **重新开始：** 仅在明确确认后，将当前文件改名为 `LEARNING-<YYYY-MM-DD>.md` 作为归档，随后进行下方完整入门。绝不静默删除或覆盖历史。

## 第 1 步：访谈（3 个问题，保持简短）

1. **你为什么学习 AI engineering？** 自由文本。可给出的示例：ship an AI product、职业转型、理解自己每天使用的东西、研究。用其自己的话记录回答，因为它会为之后所有课程解释提供锚点。
2. **每周能投入多少时间？** 选项：约 2 h、约 5 h、约 10 h、“尽可能快”。只用于如实表述节奏，绝不用来删减内容。
3. **结束时最想构建什么？** 一行即可。一个 agent、一个训练后的模型、一个 RAG product，“暂时不确定”也可以。

不要多问。分级测验衡量知识；访谈只记录意图。

## 第 2 步：定位

运行随此 skill 安装的 `find-your-level` skill 分级测验：5 个领域、10 道题，映射到一个起始阶段。保持该 skill 的答案隔离契约：不要预加载之后轮次的答案键，也不要用真实选项字母替换中性 `<letter>` 占位符。

学习者已说清想从哪开始（“直接从第 7 阶段开始”）时，尊重选择并跳过测验，但仍遵守与测验相同的输出契约，确保 `learn` tutor 始终能找到格式正确的计划：

- 验证阶段在 0-19 之间并解析其规范名称；无法解析时，列出 20 个阶段要求选择。
- Path 表中，入口前阶段为 `Skip`，入口及其后为 `Do`（没有可从领域分数推断的 `Review` 行）；Est. hours 总数为所有 `Do` 行的和。
- Placement 部分写入 `Score: self-selected`，不能写数值。

## 第 3 步：写入 LEARNING.md

在当前目录创建 `LEARNING.md`，严格使用以下 sections：

```markdown
# My AI Engineering Path
<!-- Managed by the ai-engineering-from-scratch learning skills.
     Repo: https://github.com/fancyboi999/ai-engineering-from-scratch-zh -->

## Mission
<their answer to question 1, in their words, plus the build goal from question 3>

## Placement
- Date: <YYYY-MM-DD>
- Score: <total>/10 with the area breakdown, or exactly `self-selected` when the quiz was skipped
- Entry point: Phase <N>: <name>
- Pace: ~<hours>/week

## Path
| Phase | Name | Status | Est. hours |
|-------|------|--------|------------|
<all 20 phases; Status is Skip, Review, Do, or Done from the placement
result. Hours come from ROADMAP.md: read it locally if the repo is cloned,
otherwise fetch
https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/ROADMAP.md>

## Progress log
| Date | Lesson | Quiz | Note |
|------|--------|------|------|

## Review queue
<empty for now; learn adds lessons the quizzes flag>
```

## 第 4 步：交接

收尾仅三行，不能更多：

- 学习者的入口和 `Review` + `Do` 阶段的预计总时数。
- 给出宿主正确的 `learn` 调用方式，并说明它会开始第一课且每次都从此文件继续。
- 给出宿主正确的 `course-guide <topic>` 调用方式，并说明它可跳转到特定主题。
