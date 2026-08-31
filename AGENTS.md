# AGENTS.md

本文档是贡献者和 AI agent 修改本仓库时的操作手册。开 PR 前必须阅读。

这是一套课程，不是 SaaS 应用。课程内容就是产品。中文翻译以 [TRANSLATION.md](TRANSLATION.md) 为唯一权威契约。

## 定位

核心课程包含 20 个阶段、503 节课。每个算法都先从原始数学构建，再使用生产框架完成同一操作。
你会亲手写出反向传播、分词器、注意力机制和 agent 循环，所以当 PyTorch 或其他库登场时，它们不再是黑盒。

`certifications/claude/` 是独立的 Claude 认证备考层，包含 4 条路线、33 节认证课、诊断和原创模拟题。
它不计入 503 节核心课程，也不进入 EPUB/PDF 图书流程。

## 仓库结构

```text
phases/
  NN-phase-slug/
    NN-lesson-slug/
      docs/zh.md              # 中文课程正文
      code/                   # 实现与测试
      quiz.json               # 6 道题
      outputs/                # 可复用产物
certifications/claude/
  program.json                # 项目声明、核验日期、官方链接
  tracks/*.json               # 考试蓝图、路线和学习计划
  lessons/NN-slug/            # 认证课程
  assessments/<exam-code>/    # 诊断和完整模拟题
glossary/terms.md              # 术语表唯一数据源
site/                          # 纯静态站点
scripts/                       # 审计和构建工具
.github/workflows/build.yml    # 中文站 CI
```

## 强制规则

1. 新增课程时，每个 lesson 目录用一个原子提交。上游同步或批量翻译可按可审查的逻辑批次提交。
2. 提交标题使用约定式前缀且不超过 72 字符；本中文镜像优先使用 `sync(zh):`、`i18n(quiz):`、`feat(site):`、`fix(site):`。
3. 图表只使用 Mermaid、SVG 或站点注册的 `figure` 机制，不用 ASCII/绘图字符假装图表。
4. 所有代码围栏必须带语言标记。
5. 不使用外部 LLM API 做翻译；不提交考题泄露内容、机密题目或包过承诺。
6. 代码保持 stdlib-first，不为满足形式而伪造 provider API 集成。
7. 不直接 push `main`；所有更改走 PR。
8. 不提交构建产物 `site/sitemap.xml`、`site/llms.txt`、`site/build-meta.js`、`site/certification-data.js`、`site/lessons/`。
9. `site/data.js` 是中文仓跟踪的构建产物；课程、术语或站点数据变动后必须重建并与源文件一起提交。

## 依赖约束

| 语言 | 允许的依赖 |
|---|---|
| Python | `numpy`、`torch`、`h5py`、`zstandard`、`safetensors`、标准库 |
| TypeScript | `hono`、`zod`、`ws`（只在需要 WebSocket 时）、`@hono/node-server`、Node 20+ 标准库 |
| Rust | 标准库，单文件 `rustc --edition 2021` |
| Julia | `Random`、`Statistics`、`LinearAlgebra`、`Printf` |

## 课程契约

### `docs/zh.md`

```markdown
# <标题>

> <一句话摘要>

**类型：** <Learn | Build | Reference>
**语言：** <与 code/main.* 匹配的语言>
**前置要求：** <课程链接或“无”>
**预计时间：** <分钟>

## 学习目标
- <4–6 条以动词开头的目标>
```

`**语言：**` 必须与 `code/` 中的 `main.*` 一致。中文正文完成后删除 `docs/zh.md`。

### `quiz.json`

```json
{
  "lesson": "<dir-slug>",
  "title": "<标题>",
  "questions": [
    {"stage": "pre", "question": "...", "options": ["a", "b", "c", "d"], "correct": 0, "explanation": "..."}
  ]
}
```

每课恰好 6 题：1 道 `pre`、3 道 `check`、2 道 `post`。`correct` 是从 0 开始的索引，翻译时绝不改动。

## Claude 认证契约

- 每节认证课必须有可运行 `main.*` 和至少 5 个确定性测试。
- 概念课用场景运行器、政策评分器、产物校验器、批准模拟器、威胁模型检查器或证据评分器承载实践。
- 完整课程必须包含 `交互实验`、`实践实验`、`交付产物`、`验证`、`综合项目关联`，并嵌入已注册 figure。
- `program.json` 管理独立性声明、核验日期和官方链接。
- `prerequisites.json` 管理课程依赖图；`tracks/*.json` 管理考试蓝图、权重、路线、评估和学习计划。
- 诊断和模拟题的 `correct` 始终是数组；`single` 只有一个索引，`multiple` 至少两个。
- 题目必须映射到公开 objective，包含实质性解析，且不得复制或推测真实考题。
- 公开页面和课程必须明确声明：这是独立社区课程，不隶属于 Anthropic，不颁发证书，不保证通过。

## AI-native 认证学习模式

当用户要求选择、开始、继续、学习、练习或评估 Claude 认证时，先阅读 `skills/claude-certification/SKILL.md`。

学习模式必须：

- 每次读取当前 track manifest，不凭记忆虚构路线、权重或政策。
- 每次教一课，运行真实实验和测试，要求学习者在 `learning-artifacts/` 产出自己的交付物。
- 进度写入 `CLAUDE-CERTIFICATION.md`，不覆盖仓库内置的 `outputs/` 参考产物。
- 练习百分比不是 Anthropic 官方量表分数。

## 本地验证

提交前按实际改动执行：

```bash
node site/build.js
node site/build.js --check
python3 scripts/audit_certifications.py
python3 scripts/backfill_certification_references.py --check
python3 scripts/debias_certification_questions.py --check
find certifications/claude/lessons -path '*/code/tests/test_*.py' -print0 | xargs -0 -r -n1 python3
find certifications/claude/lessons -path '*/code/main.py' -print0 | xargs -0 -r -n1 python3
node scripts/check_figure_loader.js
node scripts/test_tts.js
```

完成声明前还必须：

1. 从仓库根目录启动 `python3 -m http.server`，在真实浏览器里检查主课程、认证路线、测评、figure、quiz 和移动端。
2. 明确列出 skip、warning 和未验证路径。
3. 通过 PR 合并，再验证 `https://aieng-zh.cn`。

## 同步与冲突

- 只跟踪 `upstream/main`，以 `.sync-upstream-base` 作为已检视基准。
- 不用上游英文 `build.js`、`lesson.html`、域名、GitHub 链接或营销数据覆盖中文保护层。
- 必须保留 `aieng-zh.cn`、中文仓链接、`docs/zh.md`、`md-render.js` 单一渲染器、静态 `/lessons/` 预渲染和中文 quiz 锚点。
- 冲突时以当前中文实现为基底，语义移植上游变更，不整文件覆盖。

---

最后审校：2026-08-18。
