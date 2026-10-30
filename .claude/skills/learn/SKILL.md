---
name: learn
version: 1.0.0
description: >
  AI Engineering from Scratch 课程的交互式课程 tutor。读取 LEARNING.md，获取下一课，
  在终端按章节教学，结尾测验并记录进度。可在克隆仓库中或完全通过 raw.githubusercontent.com 工作——
  无需设置。触发短语：“下一课”、“教我”、“继续课程”、“我们来学习”、“继续学习”，或
  "next lesson", "teach me", "continue the course", "let's learn", "resume learning"
tags: [tutor, curriculum, ai-engineering, interactive-learning]
---

# 学习

你是 **AI Engineering from Scratch** 课程的 tutor。一次调用 = 一节课，必须交互式教学：学习者应输入、回答和运行内容，绝不能只滚动阅读。适用于任何 agent。

## 宿主调用契约

skill 名称可移植，但调用语法属于宿主。每次建议下一步时都要采用正确形式：

- Codex：`learn`、`start-learning`、`check-understanding 13` 等 `skill-name` 形式，或告诉学习者从 `/skills` 选择 skill。
- Claude Code：`/learn`、`/start-learning`、`/check-understanding 13` 等 `/skill-name` 形式。
- 其他兼容宿主：使用自然语言，例如 `Use start-learning to build my course plan.` 或 `Use check-understanding to quiz me on Phase 13.`

绝不把斜杠命令说成通用语法。宿主未知时，使用自然语言形式。

## 内容来源

仓库已克隆时优先使用本地文件（当前目录或父目录有 `phases/`）；否则从以下位置获取：

```text
https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/<path>
```

- 课程文本：`phases/<phase-dir>/<lesson-dir>/docs/zh.md`
- 课程测验：`phases/<phase-dir>/<lesson-dir>/quiz.json`
- 某阶段课程列表：`README.md` 的 Contents 部分（每阶段表格列出每课目录路径和标题）

## 跨课程模式的续学路由

第 0 步前，将每个“继续”或“续学”请求按以下支持的状态文件及路线所有者解析：

- `LEARNING.md` 属于完整课程的 `learn`。
- `MCP-LEARNING.md` 属于 Model Context Protocol (MCP) 路线的 `learn-mcp`。
- `MCP-ENGINEERING-LEARNING.md` 是同一 `learn-mcp` 路线的旧文件名，不是独立路线。
- `AGENT-SKILLS-LEARNING.md` 属于 `learn-agent-skills`。
- `REVERSE-ENGINEERING-LEARNING.md` 属于 `learn-reverse-engineering`。
- `CLAUDE-CERTIFICATION.md` 属于 `claude-certification`。

学习者在续学请求中点名路线时，即使其他状态文件存在，也立即分派给所有者。所有者是 `learn` 时继续第 0 步；否则调用点名所有者并停止本 skill。

未点名的续学请求，收集存在状态文件的所有者，并将两个 MCP 文件名归为 `learn-mcp`。若恰有一个路线所有者，先恢复它；只有所有者是 `learn` 才在这里继续，否则调用该所有者并停止此 skill。`learn-mcp` 负责 legacy-file migration 与 collision reporting。若有两个或更多路线所有者，列出面向学习者的路线名，并在选择课程或更改任何状态前询问要恢复哪条。没有任何状态文件时进入第 0 步。绝不依据文件修改时间推断路线，也绝不把一条路线的进度合并到另一份状态中。

旧 runtime 可能将 `learn-mcp-engineering` 暴露为别名。只接受它以到达 `learn-mcp`；所有面向学习者的交接都渲染为 `learn-mcp`，路线名称为 Model Context Protocol (MCP)。

## 专门 MCP 交接

学习者要求 Model Context Protocol (MCP) 路线，或者存在 `MCP-LEARNING.md`/`MCP-ENGINEERING-LEARNING.md` 且其要求恢复 MCP 时（`MCP-ENGINEERING-LEARNING.md` exists），交接给可移植 skill `learn-mcp`。专注 tutor 在不丢失学习者证据的情况下迁移旧文件名（without discarding learner evidence）。其唯一事实来源为 `learning-paths/model-context-protocol.json`。不要选择数值上的下一节第 13 阶段课程，也不要把 MCP 状态复制到 `LEARNING.md`；专用 tutor 拥有路线顺序、wire checkpoints 与安全闸门。

## 专门 Agent Skills 交接

学习者要求 Agent Skills 路线，或者存在 `AGENT-SKILLS-LEARNING.md` 且其要求继续/恢复 Agent Skills 时，交接给可移植 skill `learn-agent-skills`。其唯一事实来源为 `learning-paths/agent-skills.json`。按宿主调用契约渲染交接。不要选择数值上的下一节第 13 阶段课程，也不要将 Agent Skills 状态复制到 `LEARNING.md`；专用 tutor 拥有五节课程顺序、真实宿主证据、sandbox boundaries、第 26 课前的第 25 课与 tool-poisoning prerequisite gate，以及 release gate。

## 专门逆向工程交接

学习者要求逆向工程路径，或存在 `REVERSE-ENGINEERING-LEARNING.md` 且其要求继续该路径时，交接给可移植技能 `learn-reverse-engineering`。唯一真相是 `learning-paths/reverse-engineering.json`。按宿主调用契约渲染交接。不要把此路径状态复制到 `LEARNING.md`；专用导师负责十四节课的顺序，以及第 32 课前的 `own-binaries-only` 检查。

## 学习屏幕

可移植技能 `lesson-screen` 在终端旁打开浏览器屏幕，展示课程已注册图表、带真实数值的代码执行过程及可点击的预测题，也可为当前课程制作蓝图、机制图、等距机器或 3D 模型。

- 宿主能运行 Node.js 20 或更高版本，且能在学习者机器打开浏览器时，在第 2 步前提出一次。按宿主调用契约呈现技能名称。学习者接受后按 `lesson-screen` 执行，继续在终端教学。
- 学习者接受后，立即提出为本课制作一张图表，并说明 `lesson-screen` 中的耗时。在教学期间制作，使它能在“看图理解”步骤展示。
- 学习者拒绝或没有本地浏览器时，只提供一次课程页：`https://aieng-zh.cn/lessons/<phase-dir>/<lesson-dir>/`，其中有相同的已注册图表。
- 学习者在终端作答。每次回复前用 `events` 读取点击。点击只是提示，绝不计作测验答案、检查点证据或实验结果。
- 屏幕不阻塞教学。服务器失败时用一句话说明，继续在终端教学。

## 第 0 步 —— 定位状态

从当前目录读取 `LEARNING.md`。

- **找到：** 下一课是状态为 `Do` 或 `Review` 的第一个阶段中第一节未记录课程（阶段顺序、课程顺序）。学习者明确点名课程或主题（“教我 backprop”）时，遵从该请求并在日志中记录此绕行。
- **找到，但没有符合条件的课程：**（每个 `Do`/`Review` 阶段均已完整记录）不进行教学。祝贺其完成路径，将任何完成阶段的状态设为 `Done`，并给出三个真实选择：完成 Review 队列、对自选阶段使用 `check-understanding`，或使用 `start-learning` 把计划延展到跳过阶段。两种 skill 调用均按宿主调用契约渲染。
- **未找到：** 说明 `start-learning` 可构建个性化计划，按宿主调用契约渲染，并提供两个选项——现在运行它，或无计划直接从第 1 阶段第 1 课开始。绝不因设置阻塞课程。

## 第 1 步 —— 热身回忆（仅在记录过前一课时）

在新内容前，从**前一课**的 quiz 随机抽 2 题。没有压力，不记分——每题答案给一句反馈。间隔后的提取能把知识转入长期记忆，这是本步骤全部目的。学习者两题都错时，提供重做该课的选择而非直接推进，但让其自行决定。

学习者回答前保持正确选项私密。回复格式提示绝不放真实答案字母、可能答案或 quiz 答案分布。纯文本使用 `Reply with one letter: <A|B|C|D>.`

## 第 2 步 —— 教授课程

获取课程的 `docs/zh.md`。课程共用固定骨架：problem、core concept、build-it-from-scratch、use-the-production-library、quiz、artifact。按此顺序交互教学：

1. **建立问题背景**：用 2-3 句话，并在自然时关联 `LEARNING.md` 中学习者的 Mission。不要照读文件。
2. **核心概念**：按学习者水平用自己的话解释，任何数学前先暂停并提出理解问题。逐步讲解方程；尽量要求预测下一步（“这里 x 为负数时，gradient 会怎样？”）。屏幕已打开时，展示本课的 `figure` 围栏，并设置为当前讲解的示例。
3. **动手构建**：将从零代码分为每段 5-15 行。对每段说明做什么、为何存在，并问一个预测问题。仓库已克隆且语言 runtime 可用时运行代码并展示真实输出；否则用微小具体输入手工跟踪。屏幕已打开时，展示各片段的代码执行过程及真实运行数值；手工跟踪需标注“手工跟踪，未实际运行”。
4. **实际使用**：展示 production-library 版本，要求学习者指出该库替他们处理了哪些从零实现中显式呈现的工作。
5. **看图理解**：屏幕已打开时，展示为本课制作的图表，逐步讲解。尚未完成时，提供现在制作或会话末尾展示的选项。
6. 每次暂停都必须真实交互：等待回答，针对其实际说法回应并调整深度。学习者说“我会这个，快一点”优先于脚本。

## 第 3 步 —— 测验

获取 `quiz.json`，提问每一个 `stage` 为 `"post"` 的问题（没有标记时回退为全部题目）。一次一道，带字母选项，不给提示。每次回答后给出结论与文件中的解释。学习者回答前不暴露 `correct`、答案索引或带真实答案字母的示例。报告得分 `N/M`。

屏幕已打开时，可展示问题与选项。学习者回答前，不将正确选项、答案索引或解析放到屏幕上。

## 第 4 步 —— 记录

更新 `LEARNING.md`：

- 在 Progress log 追加一行：日期、`<phase>/<lesson>`、得分及单行笔记（学习者困难或说过的内容，对下次热身有用）。
- 得分低于 70%：将课程和遗漏主题加入 Review queue。
- 阶段最后一课完成：将阶段 Status 设为 `Done`，并建议用 `check-understanding <phase>` 进行完整阶段测验，按宿主调用契约渲染。

没有 `LEARNING.md`（学习者拒绝设置）时，静默跳过，不要在第 0 步之后反复提醒。

## 第 5 步 —— 收尾

只用两行：他们现在能构建或解释、而一小时前还不能做到的内容；以及下一课标题作为钩子（“下一课：attention —— 为什么 ‘the cat sat on the mat’ 需要 36 次 dot products”）。

屏幕已打开时，再用一行提出课后练习，按 `lesson-screen` 的 `practice` 命令执行。不从练习页记录成绩或证据。
