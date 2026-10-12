# UI 字符串本地化工作台

帮助小型产品团队本地化 JSON 消息目录，同时保留稳定键、变量占位符和上下文备注。在 UI 预览中比较已记录或真实 provider 的提案，要求审查有歧义的字符串，并导出已批准 locale 目录和未解决字符串队列。

你将构建已审查的 locale JSON、交互式消息预览与 unresolved-strings.json。

## 在自己的输入上运行工具

需要 Node 22.18 或更新版本。无需安装软件包、API key、网络账号或 provider。

```bash
cd projects/ui-string-localization-workbench/solution
node cli.ts sample.json output
```

`sample.json` 是原始项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明参数。报告位于 output/report.html。JSON 文件保留界面使用的证据。

## 自己动手构建

```bash
python3 scripts/project_test.py ui-string-localization-workbench --init my-ui-string-localization-workbench
python3 scripts/project_test.py ui-string-localization-workbench --stage 1 --path my-ui-string-localization-workbench --strict
python3 scripts/project_test.py ui-string-localization-workbench --all --path my-ui-string-localization-workbench --strict --report completion.json
```

首次运行会失败，直到你实现第一阶段。初始起始代码提供所有公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一个文件中增加行为。

1. [读取消息键、占位符与上下文](stages/01-catalog-contract/docs/zh.md)
2. [生成有边界的翻译提案](stages/02-recorded-proposals/docs/zh.md)
3. [用提供的插值预览字符串](stages/03-message-preview/docs/zh.md)
4. [导出已批准 locale 与未解决问题](stages/04-approved-catalog/docs/zh.md)

## 契约与集成

- `placeholders(text:string):string[]; readCatalog(value:unknown):Message[]`
- `proposeTranslations(messages:Message[],recorded:unknown,locale:string):Proposal[]`
- `previewMessage(template:string,values:Record<string,string|number>):string`
- `reviewTranslations(messages,proposals,value?):{catalog,unresolved,review}; renderWorkbench(messages,proposals,state,locale,values?):string`

精确的输入与返回结构、算例中的中间值、失败行为和留出案例见阶段文档。从 `main.ts` 导入这些函数，即可在另一个 TypeScript 程序中复用工具。HTML 在本地运行；文档有说明时，可以把审查下载文件传回 CLI。它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py ui-string-localization-workbench --all --solution --strict
```

译文是输入中提供的原创提案记录，不是实时 provider 集成，也不保证质量。这个教学子集支持简单命名占位符，不支持 ICU 消息。locale 标签影响预览的语言元数据；审查者负责判断译文含义。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成情况是完整评分器提供的自报证据，不是外部认证。
