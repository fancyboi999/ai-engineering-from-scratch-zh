# 导出可导航导览和图数据

**类型：** Build
**语言：** TypeScript
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

将可聚焦的节点按钮关联到作者的图，并导出可复用审核。

## 公开契约

```typescript
renderWalkthrough(svg:string, review:ReturnType<typeof reviewGraph>):string
```

独立页面包含校验后的 SVG、每个节点的说明编辑器、上一个/下一个控件、可编辑顺序、分支/环证据和 graph-review.json 下载。下载文件可由 reviewGraph 和 CLI 第三个参数接受。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

编辑 clarify 的说明，标记顺序已审核并下载 graph-review.json。用该文件重新运行 CLI，检查 graph.json 中的 reviewed:true 和修改后的文本。

```figure
pj-diagram-reading-companion-4
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py diagram-reading-companion --init my-diagram-reading-companion
python3 scripts/project_test.py diagram-reading-companion --stage 4 --path my-diagram-reading-companion --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

使用导入时已校验的安全元素 ID。文本通过 textContent 插入，JSON 必须转义 script 分隔符。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-diagram-reading-companion
node cli.ts sample.json output
```

可导航的 HTML 图表导览，以及经过审核的图清单。打开 `output/report.html`，检查配套机器可读文件。编辑页面后运行 `node cli.ts sample.json reviewed-output graph-review.json`。graph.json 记录审核状态、修改后的说明文本和准确顺序。

## 扩展

使用浏览器无障碍 API 增加朗读描述。

范围：图关系由作者明确编写；工具不从 SVG 几何推断意义，也不声称理解图像。支持的 SVG 是安全、受限的绘图子集。阅读顺序是可审核的候选项，不是教学有效性的证明。
