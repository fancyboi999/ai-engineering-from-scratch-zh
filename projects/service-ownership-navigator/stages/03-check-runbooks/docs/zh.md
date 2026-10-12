# 检查本地 runbook 引用

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

检查交接是否指向已提供的 runbook，以及可解析的本地引用。

## 公开契约

```typescript
checkRunbook(catalog:Catalog,service:Service):{path,exists,headings,links,issues}
```

检查 runbook 是否存在及 Markdown 标题行。解析行内 Markdown 链接，从 runbook 目录解析相对路径，并在给定文件中验证。忽略 HTTP(S) 链接和同页片段，因为不会获取它们。检测越过仓库根目录的路径穿越、缺失的链接文件和没有标题的文档。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

runbooks/images.md 链接 queue.md，解析到 runbooks/queue.md，且文件存在。rollback.md 解析到 runbooks/rollback.md，并报告缺失；报告不会编造恢复步骤。

```figure
pj-service-ownership-navigator-3
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py service-ownership-navigator --init my-service-ownership-navigator
python3 scripts/project_test.py service-ownership-navigator --stage 3 --path my-service-ownership-navigator --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

这检查存在性与结构，不验证操作准确性或远程 URL 健康情况。保留缺失链接的证据。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-service-ownership-navigator
node cli.ts sample.json output
```

静态服务目录与有来源依据的归属查询 JSON。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

增加带截止时间和明确目标允许列表、需主动启用的 HTTP 检查器。

范围：本项目使用文档规定的本地归属规则格式，并未实现完整的 GitHub CODEOWNERS 格式。它完全基于提供的本地数据运行，检查 runbook 引用，不执行指令或发送通知。
