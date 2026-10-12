# 服务归属导航器

把编写的服务目录、仓库归属规则与 runbook 链接合并为本地目录。在请求路径上解析归属，显示冲突和缺失的 runbook，用文件级证据回答交接问题。导出静态站点和 JSON 查询接口，不发送通知。

你将构建静态服务目录与有来源依据的归属查询 JSON。

## 在自己的输入上运行工具

需要 Node 22.18 或更新版本。无需安装软件包、API key、网络账号或 provider。

```bash
cd projects/service-ownership-navigator/solution
node cli.ts sample.json output
```

`sample.json` 是原始项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明参数。报告位于 output/report.html。JSON 文件保留界面使用的证据。

## 自己动手构建

```bash
python3 scripts/project_test.py service-ownership-navigator --init my-service-ownership-navigator
python3 scripts/project_test.py service-ownership-navigator --stage 1 --path my-service-ownership-navigator --strict
python3 scripts/project_test.py service-ownership-navigator --all --path my-service-ownership-navigator --strict --report completion.json
```

首次运行会失败，直到你实现第一阶段。初始起始代码提供所有公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一个文件中增加行为。

1. [加载服务元数据与归属规则](stages/01-load-evidence/docs/zh.md)
2. [解析路径与冲突的归属证据](stages/02-resolve-paths/docs/zh.md)
3. [检查本地 runbook 引用](stages/03-check-runbooks/docs/zh.md)
4. [导出可搜索目录与带引用的交接包](stages/04-export-handoff/docs/zh.md)

## 契约与集成

- `parseOwnershipRules(text:string,source?:string):Rule[]; loadCatalog(value:unknown):Catalog`
- `matchesRule(pattern:string,path:string):boolean; resolveOwnership(catalog:Catalog,path:string):Ownership`
- `checkRunbook(catalog:Catalog,service:Service):{path,exists,headings,links,issues}`
- `handoffPacket(catalog:Catalog,path:string):{schemaVersion:1,ownership,runbook,dependencies}; renderDirectory(catalog,packet):string`

精确的输入与返回结构、算例中的中间值、失败行为和留出案例见阶段文档。从 `main.ts` 导入这些函数，即可在另一个 TypeScript 程序中复用工具。HTML 在本地运行；文档有说明时，可以把审查下载文件传回 CLI。它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py service-ownership-navigator --all --solution --strict
```

本项目使用文档规定的本地归属规则格式，并未实现完整的 GitHub CODEOWNERS 格式。它完全基于提供的本地数据运行，检查 runbook 引用，不执行指令或发送通知。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成情况是完整评分器提供的自报证据，不是外部认证。
