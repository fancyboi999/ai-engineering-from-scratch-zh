# 术语悬浮卡发布器

帮助教育者使用经过审核的术语表和最长短语匹配，为现有课程 HTML 添加上下文定义。保留代码与链接，支持键盘可访问的定义，并导出独立注解课程和可复用术语文件。

你将构建带注解的 HTML 课程、glossary.json 和术语覆盖报告。

## 用你自己的输入运行工具

需要 Node 22.18 或更新版本。无需安装包、API key、网络账号或 provider。

```bash
cd projects/glossary-hovercard-publisher/solution
node cli.ts sample.json output
```

`sample.json` 是原创项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明各参数。报告为 output/report.html。JSON 文件保留界面使用的证据。

## 自己动手构建

```bash
python3 scripts/project_test.py glossary-hovercard-publisher --init my-glossary-hovercard-publisher
python3 scripts/project_test.py glossary-hovercard-publisher --stage 1 --path my-glossary-hovercard-publisher --strict
python3 scripts/project_test.py glossary-hovercard-publisher --all --path my-glossary-hovercard-publisher --strict --report completion.json
```

在你实现第一阶段之前，首次运行会失败。初始 starter 提供全部公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一文件里增加行为。

1. [校验术语、别名和原创定义](stages/01-validate-glossary/docs/zh.md)
2. [在合格文本节点中匹配短语](stages/02-match-text/docs/zh.md)
3. [在上下文中渲染无障碍定义](stages/03-accessible-definitions/docs/zh.md)
4. [导出课程和可复用术语包](stages/04-publish-bundle/docs/zh.md)

## 契约与集成

- `validateGlossary(value: unknown): Term[]`
- `matchTerms(text: string, terms: Term[]): Match[]`
- `annotateLesson(html: string, terms: Term[]): {html: string; coverage: Coverage[]}`
- `publishGlossary(lesson: string, terms: Term[]): {html: string; glossary: Term[]; coverage: Coverage[]}`

阅读阶段文档，了解准确的输入和返回结构、中间值推演、失败行为和留出案例。从 `main.ts` 导入这些函数，可在另一 TypeScript 程序中复用工具。HTML 在本地运行；按文档说明，下载的审核文件可以传回 CLI，它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py glossary-hovercard-publisher --all --solution --strict
```

输入 HTML 是刻意限定的小子集中的配对完整片段，不是任意网页 HTML。短语绝不跨越元素或实体边界。原生按钮提供键盘交互；术语质量仍需编辑判断。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成记录是完整评分器生成的自报证据，不是外部认证。
