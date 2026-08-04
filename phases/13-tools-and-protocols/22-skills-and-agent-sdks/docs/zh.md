# Skills 与 Agent SDK——Anthropic Skills、AGENTS.md、OpenAI Apps SDK

> MCP 说"存在哪些工具"。Skills 说"怎么做一个任务"。2026 年的栈把两者分层叠在一起。Anthropic 的 Agent Skills（开放标准，2025 年 12 月）以 SKILL.md 交付，带渐进式披露。OpenAI 的 Apps SDK 是 MCP 加 widget 元数据。AGENTS.md（如今在 6 万+ 个 repo 里）坐在 repo 根，作为项目级 agent 上下文。本课点名各自覆盖什么，并构建一个能跨 agent 流转的极简 SKILL.md + AGENTS.md 包。

**类型：** Learn
**语言：** Python（标准库，SKILL.md 解析器与加载器）
**前置要求：** 阶段 13 · 07（MCP server）
**预计时间：** ~45 分钟

## 学习目标

- 区分三个层：AGENTS.md（项目上下文）、SKILL.md（可复用知识）、MCP（工具）。
- 写一个带 YAML frontmatter 和渐进式披露的 SKILL.md。
- 以文件系统方式把 skill 加载进一个 agent 运行时。
- 把一个 skill 和一个 MCP server、一个 AGENTS.md 组合起来，让一个包在 Claude Code、Cursor 和 Codex 里都能用。

## 问题背景

一个工程师把一套写发布说明的工作流提炼成一个多步 prompt："读最近合入的 PR。按领域分组。各自摘要。按团队风格写一条 changelog 条目。发到 Slack 草稿。"他们把它放进了团队的一个 Notion 文档。

现在他们想从 Claude Code、Cursor 和 Codex CLI 用这个工作流。每个 agent 加载指令的方式不同：Claude Code 的 slash-command、Cursor 的 rule、Codex 的 `.codex.md`。工程师把工作流拷了三遍，维护三份。

AGENTS.md 和 SKILL.md 一起修掉这个：

- **AGENTS.md** 坐在 repo 根。每个兼容的 agent 在会话开始时读它。"这个项目怎么运作？有什么约定？哪些命令跑测试？"
- **SKILL.md** 是一个可移植的包：YAML frontmatter（name、description）+ markdown 正文 + 可选资源。支持 skill 的 agent 按名字按需加载它们。
- **MCP**（阶段 13 · 06-14）处理 skill 需要调用的工具。

三个层，一个可移植的产物。

## 核心概念

### AGENTS.md（agents.md）

2025 年底上线，到 2026 年 4 月被 6 万+ 个 repo 采纳。repo 根一个文件。格式：

```markdown
# Project: my-service

## Conventions
- TypeScript with strict mode.
- Use Pydantic for models on the Python side.
- Tests run with `pnpm test`.

## Build and run
- `pnpm dev` for local dev server.
- `pnpm build` for production bundle.
```

agent 在会话开始时读这个，用它来为那个项目校准自己的行为。2026 年每个编码 agent 都支持 AGENTS.md：Claude Code、Cursor、Codex、Copilot Workspace、opencode、Windsurf、Zed。

### SKILL.md 格式

Anthropic 的 Agent Skills（2025 年 12 月作为开放标准发布）：

```markdown
---
name: release-notes-writer
description: Write a changelog entry for the latest merged PRs following this project's style.
---

# Release notes writer

When invoked, run these steps:

1. List PRs merged since the last tag. Use `gh pr list --base main --state merged`.
2. Group by label: feature, fix, chore, docs.
3. For each PR in each group, write one line: `- <title> (#<num>)`.
4. Draft the release notes and stage them in CHANGELOG.md.

If the user says "ship", run `git tag vX.Y.Z` and `gh release create`.

## Notes

- Never include commits without a PR.
- Skip "chore" entries from the public changelog.
```

frontmatter 声明 skill 的身份。正文是 skill 加载时展示给模型的 prompt。

### 渐进式披露

Skill 可以引用 agent 仅在需要时才取的子资源。例子：

```
skills/
  release-notes-writer/
    SKILL.md
    style-guide.md
    template.md
    scripts/
      generate.sh
```

SKILL.md 说"风格规则见 style-guide.md"。agent 仅在 skill 正在运行时才拉 style-guide.md。这避免了用模型可能不需要的细节把 prompt 撑大。

### 文件系统发现

agent 运行时扫描已知目录寻找 SKILL.md 文件：

- `~/.anthropic/skills/*/SKILL.md`
- 项目的 `./skills/*/SKILL.md`
- `~/.claude/skills/*/SKILL.md`

加载靠文件夹名和 frontmatter 的 `name`。Claude Code、Anthropic Claude Agent SDK 和 SkillKit（跨 agent）都遵循这个模式。

### Anthropic Claude Agent SDK

`@anthropic-ai/claude-agent-sdk`（TypeScript）和 `claude-agent-sdk`（Python）在会话开始时加载 skill，把它们作为运行时内可调用的"agent"暴露。当用户触发某个 skill 时，agent 循环分发给它。

### OpenAI Apps SDK

2025 年 10 月上线；直接建在 MCP 上。把 OpenAI 之前的 Connectors 和 Custom GPT Actions 统一到单一开发者表面下。一个 Apps SDK app 是：

- 一个 MCP server（tools、resources、prompts）。
- 加给 ChatGPT UI 的 widget 元数据。
- 加一个可选的、给交互式表面用的 MCP Apps `ui://` 资源。

同样的协议，更丰富的 UX。

### 经由 SkillKit 的跨 agent 可移植性

SkillKit 这类工具和类似的跨 agent 分发层，把单个 SKILL.md 翻译成 32+ 个 AI agent（Claude Code、Cursor、Codex、Gemini CLI、OpenCode 等）各自的原生格式。一个事实标准；许多消费方。

### 三层栈

| 层 | 文件 | 何时加载 | 目的 |
|-------|------|-------------|---------|
| AGENTS.md | repo 根 | 会话开始 | 项目级约定 |
| SKILL.md | skills 目录 | skill 被触发 | 可复用工作流 |
| MCP server | 外部进程 | 需要工具时 | 可调用动作 |

三者都组合得起来：agent 在会话开始时读 AGENTS.md，用户触发一个 skill，skill 的指令含 MCP 工具调用，agent 经由一个 MCP client 分发。

```figure
t3-skill-layers
```

## 实际使用

`code/main.py` 交付一个标准库 SKILL.md 解析器和加载器。它在 `./skills/` 下发现 skill，解析 YAML frontmatter 加 markdown 正文，产出一个按 skill 名作键的 dict。它接着模拟一个按名字触发 `release-notes-writer` 的 agent 循环。

要看什么：

- YAML frontmatter 用一个极简标准库解析器解析（无 `pyyaml` 依赖）。
- skill 正文一字不差地存着；agent 在触发时把它前置到 system prompt。
- 渐进式披露经由一个 `read_subresource` 函数演示，它按需拉取被引用的文件。

## 拿去用

本课产出 `outputs/skill-agent-bundle.md`。给定一个工作流，这个 skill 产出组合的 SKILL.md + AGENTS.md + MCP-server 蓝图包，跨 agent 可移植。

## 练习

1. 跑 `code/main.py`。在 `skills/` 下加第二个 skill，确认加载器把它收进来。

2. 为本课程 repo 写一个 AGENTS.md。包含测试命令、风格约定，以及阶段 13 的心智模型。

3. 把你团队内部文档里的一个多步工作流移植进一个 SKILL.md。验证它在 Claude Code 里加载。

4. 手动把这个 skill 翻译成 Cursor 和 Codex 的原生 rule 格式。数格式之间的 diff——这就是 SkillKit 自动化的那个翻译表面。

5. 读 Anthropic Agent Skills 博文。找出 Claude Agent SDK 里一个本课加载器没覆盖的特性。（提示：agent 子调用。）

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| SKILL.md | "skill 文件" | YAML frontmatter 加 markdown 正文，由 agent 运行时加载 |
| AGENTS.md | "repo 根的 agent 上下文" | 会话开始时读的项目级约定文件 |
| Progressive disclosure | "懒加载子资源" | skill 正文引用仅在需要时才拉的文件 |
| Frontmatter | "顶部的 YAML block" | `---` 分隔符里的元数据（name、description） |
| Claude Agent SDK | "Anthropic 的 skill 运行时" | `@anthropic-ai/claude-agent-sdk`，加载 skill 并路由 |
| OpenAI Apps SDK | "MCP + widget 元数据" | OpenAI 建在 MCP 加 ChatGPT UI 钩子上的开发表面 |
| Skill discovery | "文件系统扫描" | 遍历已知目录找 SKILL.md，按名字作键 |
| Cross-agent portability | "一个 skill 多个 agent" | 经由 SkillKit 风格工具把一个 SKILL.md 翻译到 32+ 个 agent |
| Agent Skill | "可移植知识" | MCP 工具概念之外的可复用任务模板 |
| Apps SDK | "MCP 加 ChatGPT UI" | Connectors 和 Custom GPT 在 MCP 上统一 |

## 延伸阅读

- [Anthropic — Agent Skills announcement](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) — 2025 年 12 月发布
- [Anthropic — Agent Skills docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) — SKILL.md 格式参考
- [OpenAI — Apps SDK](https://developers.openai.com/apps-sdk) — 给 ChatGPT 的基于 MCP 的开发者平台
- [agents.md](https://agents.md/) — AGENTS.md 格式与采纳清单
- [Anthropic — anthropics/skills GitHub](https://github.com/anthropics/skills) — 官方 skill 示例
