# 图表阅读助手

帮助教育者把编写好的 SVG 图表和显式节点边清单变成可用键盘导航的说明。检查被引用节点是否存在，展示分支与环，让作者审核阅读顺序，并导出无障碍 HTML 导览和图 JSON。

你将构建可导航的 HTML 图表导览，以及经过审核的图清单。

## 用你自己的输入运行工具

需要 Node 22.18 或更新版本。无需安装包、API key、网络账号或 provider。

```bash
cd projects/diagram-reading-companion/solution
node cli.ts sample.json output
```

`sample.json` 是原创项目数据。复制它、编辑值，再把新文件名传给同一命令。`node cli.ts --help` 说明各参数。报告为 output/report.html。JSON 文件保留界面使用的证据。

## 自己动手构建

```bash
python3 scripts/project_test.py diagram-reading-companion --init my-diagram-reading-companion
python3 scripts/project_test.py diagram-reading-companion --stage 1 --path my-diagram-reading-companion --strict
python3 scripts/project_test.py diagram-reading-companion --all --path my-diagram-reading-companion --strict --report completion.json
```

在你实现第一阶段之前，首次运行会失败。初始 starter 提供全部公开类型、函数签名、CLI 包装器和输入 fixture。后续阶段在同一文件里增加行为。

1. [加载 SVG 并校验声明的节点和边](stages/01-load-diagram/docs/zh.md)
2. [计算分支、环和候选阅读顺序](stages/02-analyze-graph/docs/zh.md)
3. [审核说明和阅读顺序](stages/03-review-explanations/docs/zh.md)
4. [导出可导航导览和图数据](stages/04-export-walkthrough/docs/zh.md)

## 契约与集成

- `loadDiagram(svg: string, value: unknown): {svg:string;graph:Graph}`
- `analyzeGraph(graph: Graph): Analysis`
- `reviewGraph(graph: Graph, value?: unknown): {schemaVersion:1;graph:Graph;order:string[];reviewed:boolean}`
- `renderWalkthrough(svg:string, review:ReturnType<typeof reviewGraph>):string`

阅读阶段文档，了解准确的输入和返回结构、中间值推演、失败行为和留出案例。从 `main.ts` 导入这些函数，可在另一 TypeScript 程序中复用工具。HTML 在本地运行；按文档说明，下载的审核文件可以传回 CLI，它从不向第三方服务提交数据。

## 验证与范围

```bash
python3 scripts/project_test.py diagram-reading-companion --all --solution --strict
```

图关系由作者明确编写；工具不从 SVG 几何推断意义，也不声称理解图像。支持的 SVG 是安全、受限的绘图子集。阅读顺序是可审核的候选项，不是教学有效性的证明。

核心实现、fixture 和课程正文均为原创。本地参考检查不授予学习者证书。学习者完成记录是完整评分器生成的自报证据，不是外部认证。
