# 简明语言改写台

用可见的句子和词汇指标、保护术语以及可选的真实改写 provider，帮助技术作者修改晦涩文字。比较原始与提案段落，显示数字变化和定义缺失，仅导出作者接受的修订及 Markdown 变更记录。

你将构建已接受的 Markdown、段落级 HTML 对照与 revision-decisions.json。

## 在自己的输入上运行工具

需要 Node 22.18 或更新版本。无需安装软件包、API key、网络账号或 provider。

```bash
cd projects/plain-language-rewrite-desk/solution
node cli.ts sample.json output
```

`sample.json` 是原始项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明参数。报告位于 output/report.html。JSON 文件保留界面使用的证据。

## 自己动手构建

```bash
python3 scripts/project_test.py plain-language-rewrite-desk --init my-plain-language-rewrite-desk
python3 scripts/project_test.py plain-language-rewrite-desk --stage 1 --path my-plain-language-rewrite-desk --strict
python3 scripts/project_test.py plain-language-rewrite-desk --all --path my-plain-language-rewrite-desk --strict --report completion.json
```

首次运行会失败，直到你实现第一阶段。初始起始代码提供所有公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一个文件中增加行为。

1. [分段并记录保护术语与事实](stages/01-record-facts/docs/zh.md)
2. [生成更简单的候选段落](stages/02-propose-rewrites/docs/zh.md)
3. [比较遗漏、数字与可读性指标](stages/03-compare-facts/docs/zh.md)
4. [导出已接受修订与变更记录](stages/04-accepted-export/docs/zh.md)

## 契约与集成

- `segmentProse(text:string,protectedTerms?:string[]):Paragraph[]`
- `proposeParagraphs(paragraphs:Paragraph[],recorded?:Record<string,string>):{id,candidate,method}[]`
- `measures(text:string):{words,sentences,averageWords,longWords}; compareParagraphs(paragraphs,proposals,definitions?):Comparison[]`
- `exportRevisions(comparisons,value?):{markdown,changeRecord,decisions,unresolved}; renderDesk(comparisons,state):string`

精确的输入与返回结构、算例中的中间值、失败行为和留出案例见阶段文档。从 `main.ts` 导入这些函数，即可在另一个 TypeScript 程序中复用工具。HTML 在本地运行；文档有说明时，可以把审查下载文件传回 CLI。它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py plain-language-rewrite-desk --all --solution --strict
```

基线使用确定性短语替换和记录下来的作者提案。未提供实时模型适配器。数字、保护术语和定义检查是词法层面的防护，不能证明每个事实或细微含义都保留了。作者负责审查含义。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成情况是完整评分器提供的自报证据，不是外部认证。
