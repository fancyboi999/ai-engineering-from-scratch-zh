# 词汇自动补全写作板

用 token 计数、前缀和短词语历史构建小型本地自动补全模型，帮助作者复用自己的术语。显示每条建议背后的证据，导出交互式写作板及可移植词汇模型，供其他编辑器使用。

你将构建本地自动补全写作页面与 vocabulary-model.json。

## 在自己的输入上运行工具

需要 Node 22.18 或更新版本。无需安装软件包、API key、网络账号或 provider。

```bash
cd projects/vocabulary-autocomplete-pad/solution
node cli.ts sample.json output
```

`sample.json` 是原始项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明参数。报告位于 output/report.html。JSON 文件保留界面使用的证据。

## 自己动手构建

```bash
python3 scripts/project_test.py vocabulary-autocomplete-pad --init my-vocabulary-autocomplete-pad
python3 scripts/project_test.py vocabulary-autocomplete-pad --stage 1 --path my-vocabulary-autocomplete-pad --strict
python3 scripts/project_test.py vocabulary-autocomplete-pad --all --path my-vocabulary-autocomplete-pad --strict --report completion.json
```

首次运行会失败，直到你实现第一阶段。初始起始代码提供所有公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一个文件中增加行为。

1. [对语料分词并统计词语历史](stages/01-count-histories/docs/zh.md)
2. [为前缀与后续词候选排序](stages/02-rank-candidates/docs/zh.md)
3. [在写作板中接受建议](stages/03-accept-suggestions/docs/zh.md)
4. [导出学得的模型与编辑器函数](stages/04-portable-model/docs/zh.md)

## 契约与集成

- `tokenize(text: string): string[]; train(corpus: unknown): Model`
- `suggest(model: Model, prefix: string, history?: string[], limit?: number): Suggestion[]`
- `completeText(model: Model, text: string, limit?: number): {prefix:string;history:string[];suggestions:Suggestion[]}; acceptSuggestion(text:string,prefix:string,word:string):string`
- `importModel(value: unknown): Model; renderPad(model: Model, initial?: string): string`

精确的输入与返回结构、算例中的中间值、失败行为和留出案例见阶段文档。从 `main.ts` 导入这些函数，即可在另一个 TypeScript 程序中复用工具。HTML 在本地运行；文档有说明时，可以把审查下载文件传回 CLI。它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py vocabulary-autocomplete-pad --all --solution --strict
```

这是透明的、基于计数的本地语言模型，不是托管 LLM。它使用最多两个 token 的上下文，建议单个后续 token。浏览器编辑器在输入末尾操作。不暗示存在 provider 适配器。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成情况是完整评分器提供的自报证据，不是外部认证。
