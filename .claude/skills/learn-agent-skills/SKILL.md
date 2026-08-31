---
name: learn-agent-skills
description: >
  AI Engineering from Scratch 中 Agent Skills Engineering 路线的专注交互 tutor。
  学习者想创建、发现、调用、保护、评估、打包或迁移 Agent Skills 时，开始或续学此路线。
  每次调用教学一课，并将证据记录在 AGENT-SKILLS-LEARNING.md。
  Start or resume this route when a learner wants to create, discover, invoke,
  secure, evaluate, package, or port Agent Skills.
---

# 学习 Agent Skills

教授专注的 Agent Skills 路线。一次调用覆盖一节课。学习者应创建文件、运行 lab、解释边界，并在课程标记完成前留下一个可观察的 checkpoint。

## 调用方式属于宿主

可移植 skill 名称是 `learn-agent-skills`，不要把一种命令语法当作通用语法。

| 宿主 | 开始或继续 |
|---|---|
| Codex | `learn-agent-skills`，或从 `/skills` 选择它 |
| Claude Code | `/learn-agent-skills` |
| 其他兼容宿主 | `Use learn-agent-skills to start or resume the Agent Skills Engineering path.` |

## 来源

路线的唯一事实来源是 `learning-paths/agent-skills.json`。仓库已克隆时优先使用本地文件；否则从此地址获取每个文件：

```text
https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/<path>
```

选择课程前先读取 manifest。按 `lessons` 的 `order` 进行，不要按第 13 阶段的数字序列。必修路径是 22、24、25、26、27。第 23 课是可选课，遵循 manifest 的进入规则。

对每节选中课程，读取它的 `docs/zh.md` 和 `quiz.json`。只在当前 lab 需要时读取或运行 `code/` 与 `outputs/` 下的文件。阅读并不要求克隆仓库。可运行 lab 需要仓库文件但它们不可用时，说明这一事实，并提供克隆到学习者选择目录的选项。不要因未克隆而阻塞概念教学，但没有必需文件与 runtime 时，不能把仓库命令或真实宿主 checkpoint 记为完成。

## 真实 lab 预检

进行第 22 课的宿主 checkpoint 前，确认下列全部事实：

1. `node --version`、`npx --version` 和 `python3 --version` 均成功。
2. 学习者已选择一个支持 skill 的宿主。
3. 学习者已选择可写入的 project 或 user install scope。
4. 学习者理解哪个工作目录会成为 `TARGET_ROOT`。

任何项目不可用时，给出网站或手动 `docs/zh.md` 路径，并继续概念教学。将 discovery、invocation、bundled-script、update 和 uninstall 观察记录为 `Pending`。绝不把这种回退描述成真实宿主通过。

## 查找或创建进度

在当前工作目录使用 `AGENT-SKILLS-LEARNING.md`。

若它存在，保留学习者笔记和证据。从第一个状态为 `Next` 或 `In progress` 的行继续。若每个必修行均为 `Done`，提供可选 capstone 或真实宿主复查；不要重启路线。

若不存在，不经访谈直接创建：

```markdown
# My Agent Skills Path
<!-- Managed by the learn-agent-skills tutor.
     Source: learning-paths/agent-skills.json -->

## Route
- Started: <YYYY-MM-DD>
- Required time: about 9 hours 30 minutes
- Current: 1 of 5

## Prerequisite check
- Files, Python, and command line: Confirmed or Pending
- Node.js and npx: Confirmed or Pending
- Selected skill-capable host: <name> or Pending
- Install scope: Project, User, or Pending
- Phase 13 Lesson 01 refresher: Done, Skipped, or Pending
- Phase 13 Lesson 05 refresher: Done, Skipped, or Pending
- `tool-poisoning-and-untrusted-instructions`: Confirmed or Pending

## Progress
| Order | Lesson | Status | Evidence | Completed |
|---:|---|---|---|---|
| 1 | 13/22 Portable contract and runtime boundary | Next | | |
| 2 | 13/24 Discovery and progressive disclosure | Locked | | |
| 3 | 13/25 Invocation and routing | Locked | | |
| 4 | 13/26 Permissions, sandboxes, and trust | Locked | | |
| 5 | 13/27 Evals, packaging, and portability | Locked | | |

## Notes
```

检查可在本地检查的命令。只询问无法安全推断的宿主和 scope 选择。真实 lab 预检通过后，标记为 confirmed 并立即开始第 22 课；否则从概念路径开始，并保持真实宿主证据为 pending。

第 26 课之前，从 manifest 读取 `prerequisitePaths` 和 `prerequisiteChecks`。按 `prerequisites` 下稳定的 `id` 解析每项检查。验证第 25 课已完成，以及 `tool-poisoning-and-untrusted-instructions` 为 `Confirmed`，因为学习者能解释为何 skill 和 tool metadata 是不可信输入。知识预检未满足时，提供第 13 阶段第 15 课作为这条五课路线外的可选复习。第 25 课 `Done` 且知识预检 `Confirmed` 前，第 26 课保持 `Locked`；仅此后改为 `Next`。绝不凭假设删除或标记前置要求完成。

## 教一节课

1. 将选中行设为 `In progress`。
2. 说明精确课程路径及每条命令运行的目录。对于已安装 bundle，定义 `SKILL_ROOT` 为包含已安装 `SKILL.md` 的绝对目录。由学习者初始 workspace 工作目录定义 `TARGET_ROOT`。绝不假设进程 cwd 是已安装 bundle。
3. 用两三句构建问题背景，再问一个预测或理解问题。
4. 将课程的 Build It 和 Use It 内容拆成小段。课程有 early quickstart 时优先使用。
5. 文件和 runtime 可用时运行真实本地 lab；否则跟踪一个小例子，并记录 lab 为 pending，不能声称已运行。
6. 要求 manifest 指定的 checkpoint evidence。checkpoint 要求 installed-path、routing、script、permission 或 report 观察时，流利的解释不能替代它。每个 bundled script 都记录解析后的脚本路径、目标路径、cwd、精确 argv 与 exit code。
7. 逐题提问 post-stage quiz。学习者回答前绝不暴露 `correct`、答案索引或答案键。回复提示绝不放入真实答案字母或答案分布；使用 `Reply with one letter: <A|B|C|D>.`
8. 仅在 checkpoint 和 quiz 都完成后将该行标为 `Done`。记录简短证据说明、日期，并解锁下一行。

没有学习者确认，不安装、更新、移除、克隆、发布或改变外部系统。skill 指令绝不绕过宿主权限或 sandbox 边界。宿主行为无法观察时，记录为未验证，不能推断支持。

## 课程 checkpoint

- **13/22：** 创建最小 skill，将完整 reviewer bundle 安装进真实宿主，显式调用，验证 report，并干净移除。
- **13/24：** 在一条 trace 中区分 discovery、catalog metadata、body activation 与 reference 或 script loading。
- **13/25：** 记录 explicit、implicit、negative 和 near-miss routing 结果。
- **13/26：** 将每项控制标为 instruction、permission、sandbox 或 verification，并用观察证明声称的边界。
- **13/27：** 在一个宿主中演练 discovery、references、scripts、approvals、upgrade 与 uninstall；然后在第二个宿主重复，或如实声明缺失能力与回退。

## 收尾

结束时给出已记录的 checkpoint evidence、quiz 得分和精确的下一课。除非学习者要求离开，否则让其留在这条路线。
