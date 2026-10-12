# 解析路径与冲突的归属证据

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** TypeScript 基础、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

按确定性的规则优先级解析具体文件，公开分歧。

## 公开契约

```typescript
matchesRule(pattern:string,path:string):boolean; resolveOwnership(catalog:Catalog,path:string):Ownership
```

带前导斜杠或包含斜杠的模式锚定在仓库根目录。裸模式匹配最后一个路径段。* 在段内匹配，** 跨段匹配，**/ 可匹配零个目录，? 匹配一个非斜杠字符；尾随斜杠匹配目录子树。最后一条匹配规则生效。回退到最具体的目录 root。返回 owners、matchedRules、service、conflicts 和来源证据。

初始工作区包含公开类型、函数桩、CLI 和原始输入 fixture。修改 `main.ts`；CLI 已提供。各阶段累积实现，不替换前面的代码。测试导入由 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 案例分析

对于 services/images/cache/store.ts，三个样本规则都匹配。最后的 cache 规则以 @fictional/cache 胜出。之前的 platform/media 归属以及服务目录的分歧仍保留为显式冲突。

```figure
pj-service-ownership-navigator-2
```

修改图表控件，预测中间值，再将计算与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py service-ownership-navigator --init my-service-ownership-navigator
python3 scripts/project_test.py service-ownership-navigator --stage 2 --path my-service-ownership-navigator --strict
```

只初始化一次。全新的第一阶段会有意抛出带名称的未实现错误。保留签名，对格式不正确的输入给出有用错误。不要修改输入。每个阶段都有独立的留出输入；仅演示通过还不够。

## 失败案例与提示

较早的不同规则和目录分歧是待审查冲突，不是默默合并所有者列表的理由。未知路径返回未解决的归属。

## 使用结果

第四阶段完成后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-service-ownership-navigator
node cli.ts sample.json output
```

静态服务目录与有来源依据的归属查询 JSON。打开 `output/report.html`，查看配套的机器可读文件。

## 扩展

只有测试官方 CODEOWNERS 边界案例后，才扩展这个子集。

范围：本项目使用文档规定的本地归属规则格式，并未实现完整的 GitHub CODEOWNERS 格式。它完全基于提供的本地数据运行，检查 runbook 引用，不执行指令或发送通知。
