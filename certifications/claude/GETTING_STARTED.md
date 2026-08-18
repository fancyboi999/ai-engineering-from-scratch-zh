# 在 GitHub 上学习 Claude 认证

仓库和网站是同等的学习入口。网站提供交互图表和浏览器内的学习进度；GitHub 则为你的 AI
编程环境提供逐步教学所需的课程源码、场景代码、测试、产物、测验、诊断题和路线顺序。

## 使用 AI 导师开始学习

先克隆仓库，让导师可以运行每个实验和测试：

```bash
git clone https://github.com/fancyboi999/ai-engineering-from-scratch-zh.git
cd ai-engineering-from-scratch
```

Claude Code 会自动发现仓库中的导师。请从下面的命令开始：

```text
/claude-certification
```

若使用 Codex、Cursor 或其他能读取 `SKILL.md` 的本地 agent，请安装可移植的课程 Skill：

```bash
npx skills add fancyboi999/ai-engineering-from-scratch-zh
```

然后调用 `/claude-certification`。若使用 ChatGPT，或使用不能安装本地 Skill、也不支持斜杠命令的环境，请附加或打开此仓库，并粘贴下面这段提示：

```text
Read skills/claude-certification/SKILL.md completely. Use it to choose my
Claude certification track, create my learning plan, and teach me one lesson
at a time with the real labs, artifacts, quizzes, and remediation in this repo.
```

导师会询问你的目标、经验、学习节奏，以及是否需要路线诊断。它会写入
`CLAUDE-CERTIFICATION.md`，并在后续会话中从该文件继续。每一课都要求你：

1. 用自己的话解释决策；
2. 预测并操作课程场景；
3. 运行仓库中的实验和测试；
4. 构建或论证自己的产物；
5. 通过本课测验；
6. 在推进前补强薄弱的考试领域。

你的学习成果应存放在 `learning-artifacts/claude/`，与每节课中已完成的参考产物分开。

## 选择一条路线

| 路线 | 适合人群 | 路线 | 诊断 | 完整模拟题 |
|-------|----------|-------|------------|-----------|
| CCAO-F | 知识工作、分析、验证与负责任地使用 Claude | [9 课路线](tracks/ccao-f.json) | [16 道题](assessments/ccao-f/diagnostic.json) | [60 道题](assessments/ccao-f/mock-01.json) |
| CCDV-F | 构建并保护 Claude 应用的工程师 | [15 课路线](tracks/ccdv-f.json) | [16 道题](assessments/ccdv-f/diagnostic.json) | [53 道题](assessments/ccdv-f/mock-01.json) |
| CCAR-F | 需要论证 Claude Code、Agent SDK、API、MCP 和编排方案取舍的构建者 | [21 课路线](tracks/ccar-f.json) | [15 道题](assessments/ccar-f/diagnostic.json) | [60 道题](assessments/ccar-f/mock-01.json) |
| CCAR-P | 负责从发现阶段到运维的资深工程师与架构师 | [25 课路线](tracks/ccar-p.json) | [14 道题](assessments/ccar-p/diagnostic.json) | [63 道题](assessments/ccar-p/mock-01.json) |

路线 JSON 是路线顺序、前置知识覆盖、领域权重、学习计划和测评路径的机器可读来源。导师会读取它，而不是根据泛泛的学习计划猜测。

## 以引导式无代码模式学习 Associate

CCAO-F 不要求有软件开发经验。课程仍附带 Python，因为确定性校验器能让策略、证据、工作流和评审标准得到测试。导师可以替你运行这些代码；你不需要亲自编写它们。

安装或打开导师后，粘贴下面这段提示：

```text
Start me on CCAO-F in guided no-code mode. Run the local validators for me,
teach every scenario interactively, and help me create each learner-owned
workflow, policy, evidence, or review artifact from my decisions. Do not skip
the practical work or quizzes, and do not require me to write Python.
```

你仍要预测结果、操作场景、论证选择、修订未通过的产物，并完成原创测评。界面会变，证据标准不会变。

## 手动学习一节课

每节认证课都遵循相同的 GitHub 约定：

```text
certifications/claude/lessons/NN-lesson/
├── docs/zh.md          full lesson and interactive-lab reasoning
├── code/main.py        scenario runner, simulator, scorer, or validator
├── code/tests/         deterministic verification
├── outputs/            completed reference artifact
└── quiz.json           six grounded questions with explanations
```

从所选路线中打开下一课的路径。阅读 `docs/zh.md`，预测场景结果，然后运行：

```bash
LESSON=certifications/claude/lessons/27-enterprise-governance-compliance-and-hitl
python3 "$LESSON/code/main.py"
python3 -m unittest discover -s "$LESSON/code/tests" -v
```

第 27 课是治理示例：它的可运行内容会校验一份策略和人工评审材料包。它不会为了概念性主题硬塞虚构的 provider 代码。其他课程提供威胁模型、ADR、审批流程、证据包、工具循环模拟器、RAG 报告、API 生命周期实验和综合项目校验器。

把 `outputs/` 作为已完成的示例。在 `learning-artifacts/claude/<exam-code>/<lesson-slug>/` 中创建自己的版本；支持时针对副本运行校验器，并将证据记录到 `CLAUDE-CERTIFICATION.md`。

## 运行完整的本地验证套件

在仓库根目录运行：

```bash
python3 scripts/audit_certifications.py

find certifications/claude/lessons -path '*/code/main.py' -print0 \
  | xargs -0 -n1 env -u ANTHROPIC_API_KEY -u ANTHROPIC_MODEL python3

find certifications/claude/lessons -path '*/code/tests/test_*.py' -print0 \
  | xargs -0 -n1 env -u ANTHROPIC_API_KEY -u ANTHROPIC_MODEL python3
```

第 30 课的实时 Messages API 测试会在没有显式提供凭证时跳过。默认课程在本地运行，不需要凭证。若要进行可选的连线检查，只能使用环境变量，并遵循该课程的说明。绝不要把 API key 写入源代码、提示或学习状态文件。

## 在 GitHub 上完成测评

每条路线都声明一套诊断题和一套原创完整模拟题。AI 导师可以读取 JSON，并一次出一道题：

- 用一个字母回答 `single` 题；
- 用完整的字母集合回答 `multiple` 题；
- 按精确集合计分，不给部分分；
- 在提交前隐藏答案与解析；
- 报告原始百分比和各领域结果；
- 对每道错题跟随内部课程引用复习。

练习百分比是课程分数，不是 Anthropic 量表分数、认证资格或通过保证。

## 同时使用网站

同一套课程也可在以下网站学习：
[aieng-zh.cn/certifications.html](https://aieng-zh.cn/certifications.html).
可用它查看可直接操作的图表、本地浏览器进度、计时器和可视化测评补强。当你希望 AI 导师运行代码、检查产物并保留详细学习计划时，GitHub 仍是更合适的入口。

若要本地预览网站：

```bash
node site/build.js
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/site/certifications.html`。

## 独立性与发布边界

这是独立的社区备考材料，不隶属于 Anthropic，也未获其背书、赞助或授权。它依据公开目标和原创场景编写，不包含真实考题，不颁发认证，也不保证通过。报名前请查看最新官方指南和资格规则。

认证内容通过 GitHub 和网站发布。它有意不进入仓库的 EPUB/PDF 图书流程，因为实验、测评、路线状态和交互机制本身就是课程的一部分。
