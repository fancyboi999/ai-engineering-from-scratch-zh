# API 教程运行器

帮助文档作者验证一连串 HTTP 示例。解析显式请求块，只替换先前响应中已声明的变量，并针对本地 fixture 或明确选择的测试端点运行。生成关联源文档的报告，暴露过时示例，让助手提出需审核的修正建议。

你将构建可重放请求清单、JUnit 结果和带注解的教程 HTML。

## 用你自己的输入运行工具

需要 Node 22.18 或更新版本。无需安装包、API key、网络账号或 provider。

```bash
cd projects/api-tutorial-runner/solution
node cli.ts sample.json output
```

`sample.json` 是原创项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明各参数。导出可重放的 requests.json、results.json、junit.xml、report.html 和 corrections.json。样本故意展示一个过时字段导致的失败；报告命令写入证据后成功退出，回执则记录失败。

## 自己动手构建

```bash
python3 scripts/project_test.py api-tutorial-runner --init my-api-tutorial-runner
python3 scripts/project_test.py api-tutorial-runner --stage 1 --path my-api-tutorial-runner --strict
python3 scripts/project_test.py api-tutorial-runner --all --path my-api-tutorial-runner --strict --report completion.json
```

在你实现第一阶段之前，首次运行会失败。初始 starter 提供全部公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一文件里增加行为。

1. [从编写好的教程提取显式请求](stages/01-extract-requests/docs/zh.md)
2. [跨步骤解析带类型的变量](stages/02-typed-variables/docs/zh.md)
3. [针对测试服务运行有界请求](stages/03-bounded-http/docs/zh.md)
4. [导出关联源文档的失败与修正建议](stages/04-source-linked-report/docs/zh.md)

## 契约与集成

- `extractRequests(markdown:string):RequestStep[]`
- `resolveValue(value:unknown,variables:Record<string,string|number|boolean>):unknown; captureVariables(body,declarations,previous?):Record<string,string|number|boolean>`
- `runTutorial(steps:RequestStep[],baseURL:string,options?):Promise<Receipt[]>`
- `exportResults(steps,receipts):{junit,html,corrections}; acceptedCorrections(receipts,value):{id,line,proposal}[]`

阅读阶段文档，了解准确的输入和返回结构、中间值推演、失败行为和留出案例。从 `main.ts` 导入这些函数，可在另一 TypeScript 程序中复用工具。HTML 在本地运行；按文档说明，下载的审核文件可以传回 CLI，它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py api-tutorial-runner --all --solution --strict
```

默认 fixture 是一个真实的临时回环 HTTP 服务器，提供编写好的 JSON 路由。这是教程检查器，不是生产负载测试器。外部测试端点需要 --allow-network 标志。响应为 JSON；重定向、流式协议、凭据和完整 OpenAPI 校验不在本子集范围内。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成记录是完整评分器生成的自报证据，不是外部认证。
