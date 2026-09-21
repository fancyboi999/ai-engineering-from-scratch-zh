# 贡献指南

欢迎贡献中文课程、翻译修订、代码修复和可复用产物。每个 PR 围绕一个可审查的目标组织改动。

## 开始前

- 阅读 [AGENTS.md](AGENTS.md) 的仓库约束与验证要求。
- 中文正文、章节标题和术语遵循 [TRANSLATION.md](TRANSLATION.md)。
- 新课程以 [LESSON_TEMPLATE.md](LESSON_TEMPLATE.md) 为模板。
- 原始英文课程来自 [rohitg00/ai-engineering-from-scratch](https://github.com/rohitg00/ai-engineering-from-scratch)；本仓库维护中文正文与中文站点。

## 课程与翻译

课程保存在 `phases/XX-phase-name/NN-lesson-name/`：

```text
NN-lesson-name/
├── code/           实现、配置与测试
├── docs/
│   └── zh.md       中文课程正文
├── quiz.json       课前、课中与课后测验
└── outputs/        可复用产物与项目参考文件
```

可按课程需要添加 `notebook/`。正文包含标题、摘要、类型、语言、前置要求、预计时间和学习目标，
章节名称使用翻译契约中的固定译法。依赖与代码入口应与实际文件一致。

同步英文课程时，将正文译为 `docs/zh.md`。保留代码、路径、URL 与机器读取的字段，翻译面向读者的说明。
翻译完成后，中文仓库仅保留 `docs/zh.md` 作为课程正文。

课程测验包含 6 题：1 道 `pre`、3 道 `check`、2 道 `post`。题目使用
`stage`、`question`、`options`、`correct`、`explanation` 字段；`correct` 为从 0 开始的选项索引。
翻译时保持答案索引和对应选项语义一致。

Claude 认证课使用独立的目录、测验和实验契约，见 [AGENTS.md](AGENTS.md#claude-认证契约)。

## 课程目录与站点数据

`site/build.js` 读取 README、ROADMAP、课程正文、术语表和路径清单。更新课程时：

1. 在 README 与 ROADMAP 对应阶段的表格中登记课程，并更新 README 阶段标题的课数。
2. ROADMAP 课程名使用指向实际目录的 Markdown 链接；状态使用 `✅`、`🚧`、`⬚`。
3. ROADMAP 的单课时长与正文一致，阶段小时数由该阶段各课时长汇总。专项路径按 `learning-paths/*.json` 维护必修顺序和估算。
4. 运行 `node site/build.js`，检查并提交 `site/data.js` 及受影响的跟踪文件。
5. 运行 `node site/build.js --check` 和 `python3 scripts/audit_lessons.py --strict`。

构建器识别以下格式：

- 阶段标题：`### Phase N: Name \`X lessons\``，或现有的 `<details>` / `<summary>` 形式。
- 课程表格：`| # | Lesson | Type | Lang |`；综合项目表格：`| # | Project | Combines | Lang |`。
- `Lang` 列接受语言名以及解析器支持的语言图标。

构建产物的改动应与源文件相符。课程、时长、术语或路径更新都可能改变站点数据。
`site/lessons/`、`site/sitemap.xml`、`site/llms.txt` 等忽略文件由部署构建生成。

## 可复用产物

将产物放在对应课程的 `outputs/` 中：

- 提示词：`prompt-*.md`。
- 单文件技能：`skill-*.md`。
- 完整技能包：`<skill-name>/SKILL.md`，附带所需脚本和参考文件。

frontmatter 的 `name`、`description`、`phase`、`lesson` 应与用途及所在课程一致，
技能还可提供 `version` 与 `tags`。格式示例见 [课程模板](LESSON_TEMPLATE.md#产出文件格式)。
站点构建器与 `scripts/install_skills.py` 从各课目录发现产物。

课程导师技能以 `skills/` 为源；更新后同步 `.claude/skills/` 中的对应副本，
并运行 `node site/test_build_artifacts.js` 验证分发契约。

## 代码与写作

- 按课程声明的依赖运行实现与测试，提供真实输出。
- 代码清楚表达行为；必要注释说明不变量、边界和设计原因，教学推导放在正文。
- 根据课程目标选择语言，从最小可运行实现逐步引入框架。
- 用 Mermaid、SVG 或已注册的交互图表解释概念。
- 写作使用准确、直接的中文；事实引用原始规范、论文或官方文档。

## 提交 Pull Request

1. 从最新 `main` 创建分支，完成一个明确目标的改动。
2. 按 [AGENTS.md](AGENTS.md#本地验证) 运行受影响的检查。完整 CI 命令见 [build.yml](.github/workflows/build.yml)。
3. 站点改动先构建，再按 [AGENTS.md 的预览方式](AGENTS.md#本地验证) 在浏览器中检查受影响页面和交互。
4. 使用中文约定式提交标题，例如 `docs:`、`sync(zh):`、`fix(site):`。新增课程按课组织原子提交，批量同步按可审查批次组织。
5. 向 `fancyboi999/ai-engineering-from-scratch-zh` 的 `main` 提交 PR，按模板记录改动、验证与边界。

```bash
gh pr create --repo fancyboi999/ai-engineering-from-scratch-zh --base main --head <branch>
```

参与讨论请遵循 [行为准则](CODE_OF_CONDUCT.md)。分发时按 [MIT 许可](LICENSE) 保留版权声明和许可声明。
