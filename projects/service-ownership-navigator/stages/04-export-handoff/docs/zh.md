# 导出可搜索目录与带引用的交接包

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

导出本地交接，让每个归属答案都关联证据。

## 公开契约

```typescript
handoffPacket(catalog:Catalog,path:string):{schemaVersion:1,ownership,runbook,dependencies}; renderDirectory(catalog,packet):string
```

交接包包含已解析的归属、本地 runbook 报告，以及直接服务依赖的目录所有者列表。HTML 包含可搜索目录、runbook 内容、来源表和精确的 handoff.json 下载。source 行号 0 表示目录条目，而不是文本行。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

交接 JSON 给出精确查询路径、有效所有者、全部匹配规则的行号、缺失的 rollback 引用和 queue 依赖的所有者。HTML 搜索可以按 root 或目录所有者找到服务。

```figure
pj-service-ownership-navigator-4
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py service-ownership-navigator --init my-service-ownership-navigator
python3 scripts/project_test.py service-ownership-navigator --stage 4 --path my-service-ownership-navigator --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

不要通知所有者，也不要暗示已经演练 runbook。把编写的 Markdown 作为纯文本转义，不要当作 HTML 注入。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-service-ownership-navigator
node cli.ts sample.json output
```

静态服务目录与有来源依据的归属查询 JSON。打开 `output/report.html`，查看配套的机器可读文件。导入 loadCatalog 和 handoffPacket 进行程序化查询。JSON.parse(handoff.json) 提供 ownership.owners、ownership.evidence 和 runbook.issues，供下一步交接使用。

## 扩展

将 JSON 查询接口集成到本地命令启动器。

范围：本项目使用文档规定的本地归属规则格式，并未实现完整的 GitHub CODEOWNERS 格式。它完全基于提供的本地数据运行，检查 runbook 引用，不执行指令或发送通知。
