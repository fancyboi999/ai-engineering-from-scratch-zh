# 加载服务元数据与归属规则

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

合并服务元数据和仓库规则，同时保留来源位置。

## 公开契约

```typescript
parseOwnershipRules(text:string,source?:string):Rule[]; loadCatalog(value:unknown):Catalog
```

服务 `{id,name,root,owners,runbook,dependencies}` 的 id/root 唯一，依赖 ID 必须已知。owners 是 @user 或 @org/team 名称。输入中的 runbooks 将仓库相对路径映射到 Markdown。CODEOWNERS 子集允许注释、空白分隔的所有者列表，以及使用 *,**,?、可带前导/尾随斜杠的模式。拒绝否定模式、方括号模式、反斜杠和父目录穿越。规则保留从 1 开始的行号和 source。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

第 2 行 `/services/ @fictional/platform` 保留 source CODEOWNERS 和 line 2。目录另行声明 images 属于 @fictional/media；那是来自不同来源的证据。

```figure
pj-service-ownership-navigator-1
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py service-ownership-navigator --init my-service-ownership-navigator
python3 scripts/project_test.py service-ownership-navigator --stage 1 --path my-service-ownership-navigator --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

在提供的仓库命名空间内解析相对路径，绝不在宿主文件系统中解析。重复服务根目录会产生歧义。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-service-ownership-navigator
node cli.ts sample.json output
```

静态服务目录与有来源依据的归属查询 JSON。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

若目录条目证据需要精确 JSON 行号，增加保留行号的目录解析。

范围：本项目使用文档规定的本地归属规则格式，并未实现完整的 GitHub CODEOWNERS 格式。它完全基于提供的本地数据运行，检查 runbook 引用，不执行指令或发送通知。
