# 从 GitHub 学习 MCPA 认证课程

仓库与网站是同等完整的学习入口。网站提供交互图和浏览器进度；GitHub 则向 AI 编码 harness 提供逐课教学所需的课程源文件、场景代码、测试、产物、测验、诊断和路线顺序。

## 从 AI 导师开始

先克隆仓库，让导师能够运行所有实验和测试：

```bash
git clone https://github.com/fancyboi999/ai-engineering-from-scratch-zh.git
cd ai-engineering-from-scratch-zh
```

Claude Code 会自动发现仓库内的导师。运行：

```text
/mcpa-certification
```

Codex、Cursor 或其他读取 `SKILL.md` 的本地 agent，可以安装可移植课程 skill：

```bash
npx skills add fancyboi999/ai-engineering-from-scratch-zh
```

然后调用 `/mcpa-certification`。对于不安装本地 skill 或不支持斜杠命令的 ChatGPT 及其他 harness，请附加或打开本仓库，并粘贴：

```text
请完整阅读 skills/mcpa-certification/SKILL.md。用它帮我备考 MCPA 认证，
制定学习计划，并使用仓库内真实的实验、产物、测验和补弱材料，每次教我一课。
```

导师会询问你的 MCP 经验、学习节奏，以及是否现在参加诊断；随后写入 `MCPA-CERTIFICATION.md`，以后从该文件恢复。每课都要求你：

1. 用自己的话解释关键判断；
2. 预测并操作课程场景；
3. 运行仓库内实验和测试；
4. 构建或答辩自己的产物；
5. 通过课程测验；
6. 在继续前补强薄弱考试领域。

你的工作放在 `learning-artifacts/mcpa/`，与每课已完成的参考产物分开。

## 路线

MCPA 只有一条 track，不需要在多个选项中选择。

| 字段 | 值 |
|---|---|
| 考试代码 | MCPA |
| 认证 | Model Context Protocol Associate |
| 提供方 | Agentic AI Foundation，由 Linux Foundation Training and Certification 交付 |
| 级别 | 入门、厂商中立 |
| 协议版本 | 2026-07-28 无状态核心；带来源摘要见[协议简报](research/mcp-2026-07-28-brief.md) |
| 路线 | [34 课路线](tracks/mcpa-f.json) |
| 诊断 | `assessments/mcpa-f/diagnostic.json` 中的 30 题诊断 |
| 全真模拟 | `assessments/mcpa-f/` 中三套原创 60 题模拟卷：`mock-01.json`、`mock-02.json`、`mock-03.json` |

track JSON 是路线顺序、领域权重和评估路径的机器可读唯一来源。导师读取它，而不是凭通用学习计划猜测。

## MCPA 引导式无代码模式

MCPA 是知识考试，不要求软件开发经验。课程仍提供 Python，是因为确定性的 mock 与验证器能把协议行为、schema、生命周期和同意规则变成可测试证据。导师可以替你运行代码，不要求你编写代码。

安装或打开导师后，粘贴：

```text
请用引导式无代码模式带我学习 MCPA。替我运行本地 mock 和验证器，
以交互方式讲授每个场景，并根据我的判断帮助我创建学习者自己的产物。
不要跳过实践或测验，也不要要求我编写 Python。
```

你仍要预测结果、操作场景、为选择辩护、修改不合格产物并完成原创评估。变化的是交互方式，不是证据标准。

## 手动学习一课

每节认证课都遵循同一 GitHub 结构：

```text
certifications/mcpa/lessons/NN-lesson/
├── docs/zh.md          完整课程与交互实验推理
├── code/main.py        场景运行器、模拟器、评分器或验证器
├── code/tests/         确定性验证
├── outputs/            已完成的参考产物
└── quiz.json           六道有依据且带解析的问题
```

从路线中打开下一课。阅读 `docs/zh.md`，预测场景结果，再运行：

```bash
LESSON=certifications/mcpa/lessons/14-multi-round-trip-requests-and-elicitation
python3 "$LESSON/code/main.py"
python3 -m unittest discover -s "$LESSON/code/tests" -v
```

第 14 课演示多轮交互：deploy 工具先返回 `input_required`，通过 elicitation 请求人类确认；只有使用新请求 id，并原样回显服务端 `requestState` 的重试才会部署。运行器还会拒绝被篡改、过期、重放或被重新定向的 `requestState`。其他课程包含 schema 验证器、发现与缓存运行器、错误通道和生命周期 mock、OAuth 流程模型、审计链检查器以及完整综合交互验证器。

把 `outputs/` 当作完成示例，在 `learning-artifacts/mcpa/<lesson-slug>/` 创建自己的版本。验证器支持路径参数时，请针对副本运行，并把证据记录到 `MCPA-CERTIFICATION.md`。

## 运行完整本地验证

在仓库根目录执行：

```bash
python3 scripts/audit_certifications.py

find certifications/mcpa/lessons -path '*/code/main.py' -print0 \
  | xargs -0 -n1 python3

find certifications/mcpa/lessons -path '*/code/tests/test_*.py' -print0 \
  | xargs -0 -n1 python3

python3 scripts/check_mcpa_wire.py
```

线级检查器会导入每课 transcript，并标记不符合 2026-07-28 结构的消息：请求 `_meta` 缺少协议版本或客户端能力、结果缺少 `resultType`、把 `initialize` 等旧版方法当作当前行为，或使用规范未定义的错误码。

所有 MCPA 实验都是离线、仅用标准库的 mock，不调用网络 API、不需要 key，也没有真实网络模式。整套验证完全本地运行且无需凭据。

## 从 GitHub 完成评估

`mcpa-f` track 声明一套诊断和三套原创全真模拟，分别侧重运维场景、线级消息以及设计与安全权衡。每次重考应使用未见过的模拟卷。AI 导师可以读取 JSON，逐题主持：

- `single` 题回答一个字母；
- `multiple` 题回答完整字母集合；
- 使用集合完全相等计分，不给部分分；
- 提交前隐藏答案和解析；
- 报告原始百分比和分领域结果；
- 每道错题都按内部课程引用补弱。

练习百分比只是课程得分，不是 MCPA 官方分数、认证或通过保证。官方没有公布题量和通过分数，因此练习结果不能预测正式考试结果。

## 也可使用网站

同一课程可在 [aieng-zh.cn/certification?id=mcpa-f](https://aieng-zh.cn/certification?id=mcpa-f) 学习。网站适合直接操作图表、保存浏览器本地进度、计时和可视化补弱；需要 AI 导师运行代码、检查产物并维护详细计划时，GitHub 更合适。

本地预览：

```bash
node site/build.js
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4173/site/certification.html?id=mcpa-f`。

## 独立性与发布边界

这是独立社区备考课程，与 Agentic AI Foundation 或 Linux Foundation 没有隶属、认可、赞助或授权关系。课程依据公开领域与子能力名称和 MCP 规范编写原创场景，不含真实考题，不颁发认证，也不保证通过。报名之前请核验当前官方页面与资格规则。

认证内容通过 GitHub 和网站发布，不进入仓库的 EPUB/PDF 图书流程；实验、评估、路线状态和交互机制本身就是课程的一部分。
