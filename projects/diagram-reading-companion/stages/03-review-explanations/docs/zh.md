# 审核说明和阅读顺序

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

应用作者审核，同时不丢失原始图关系。

## 公开契约

```typescript
reviewGraph(graph: Graph, value?: unknown): {schemaVersion:1;graph:Graph;order:string[];reviewed:boolean}
```

可选审核 `{schemaVersion:1,order,reviewed,explanations?:Record<string,string>}` 必须恰好包含每个节点一次。已知说明可替换为非空文本；边保持不变。没有审核时使用候选顺序和 reviewed:false。返回深拷贝。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

审核者可选择 collect,check,clarify,share，先解释缺失标签分支。顺序必须是完整排列；重复 check 不能替代 share。

```figure
pj-diagram-reading-companion-3
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py diagram-reading-companion --init my-diagram-reading-companion
python3 scripts/project_test.py diagram-reading-companion --stage 3 --path my-diagram-reading-companion --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

不要把未审核顺序标为已审核。拒绝过时 ID 和空说明。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-diagram-reading-companion
node cli.ts sample.json output
```

可导航的 HTML 图表导览，以及经过审核的图清单。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

为协作审核增加说明变更记录。

范围：图关系由作者明确编写；工具不从 SVG 几何推断意义，也不声称理解图像。支持的 SVG 是安全、受限的绘图子集。阅读顺序是可审核的候选项，不是教学有效性的证明。
