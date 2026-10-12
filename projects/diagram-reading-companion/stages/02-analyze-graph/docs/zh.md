# 计算分支、环和候选阅读顺序

**类型：** Build
**语言：** TypeScript
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

让分支与环保持可见，而不是将图压平为误导性的列表。

## 公开契约

```typescript
analyzeGraph(graph: Graph): Analysis
```

返回 `{order,branches,cycles,unreachable}`。按节点顺序访问根（入度为零），按边顺序进行深度优先遍历；然后访问剩余节点。分支具有多个出边目标。环是 DFS 返祖边路径，末尾重复起点，并非枚举所有简单环。Unreachable 列出从任何零入度根都无法到达的节点。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

collect -> check 分叉到 share 和 clarify。候选顺序为 collect,check,share,clarify。加入 clarify -> check 后产生返祖边环 [check,clarify,check]，同时保留所有节点。

```figure
pj-diagram-reading-companion-2
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py diagram-reading-companion --init my-diagram-reading-companion
python3 scripts/project_test.py diagram-reading-companion --stage 2 --path my-diagram-reading-companion --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

纯环连通分量没有根，但仍属于候选顺序。沿边访问前先标记节点已访问。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-diagram-reading-companion
node cli.ts sample.json output
```

可导航的 HTML 图表导览，以及经过审核的图清单。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

提供广度优先顺序，作为需要明确审核的替代方案。

范围：图关系由作者明确编写；工具不从 SVG 几何推断意义，也不声称理解图像。支持的 SVG 是安全、受限的绘图子集。阅读顺序是可审核的候选项，不是教学有效性的证明。
