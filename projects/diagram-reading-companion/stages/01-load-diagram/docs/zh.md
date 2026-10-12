# 加载 SVG 并校验声明的节点和边

**类型：** Build
**语言：** TypeScript
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时
**前置要求：** 基础 TypeScript、JSON 对象、数组，以及运行 Node 22.18 或更新版本。先完成前面的阶段。

## 构建内容

验证每段编写好的说明都指向真实 SVG 元素。

## 公开契约

```typescript
loadDiagram(svg: string, value: unknown): {svg:string;graph:Graph}
```

图节点为 `{id,label,explanation}`；边为 `{from,to,label}`。ID 唯一且必须存在于 SVG。SVG 最多 500000 字符，使用经过测试的结构子集：svg,g,rect,circle,ellipse,line,polyline,polygon,path,text,tspan,title,desc。只允许带引号的绘图/身份属性；拒绝脚本、链接、foreignObject、事件、style 和 url() 绘制源。保留原始安全 SVG。

初始工作区包含公开类型、函数桩、CLI 和原创输入 fixture。修改 `main.ts`；CLI 已提供。阶段累积推进，不替换先前实现。测试导入 `PROJECT_WORKSPACE` 选定的学习者工作区。

## 示例推演

SVG `<rect id="check"/>` 可被图节点 check 引用。名为 inspect 却无对应 SVG id 的节点，必须在构建任何导览前失败。

```figure
pj-diagram-reading-companion-1
```

修改图表控件，预测中间值，再将计算结果与你的实现比较。图表解释机制；评分器运行真实函数。

## 实现与验证

```bash
python3 scripts/project_test.py diagram-reading-companion --init my-diagram-reading-companion
python3 scripts/project_test.py diagram-reading-companion --stage 1 --path my-diagram-reading-companion --strict
```

只初始化一次。全新的第一阶段会故意报出具名的未实现错误。保留签名，用有用的错误拒绝格式不合法的输入。不要修改输入。每个阶段都有独立留出输入；只通过演示还不够。

## 失败案例与提示

要求一个正确配对的 svg 根。拒绝未知边端点和重复有向节点对。这是有界的作者编写 SVG 格式，不是通用 SVG 导入器。

## 使用你的结果

完成第四阶段后，通过同一入口传入你自己的 JSON 文件：

```bash
cd my-diagram-reading-companion
node cli.ts sample.json output
```

可导航的 HTML 图表导览，以及经过审核的图清单。打开 `output/report.html`，检查配套机器可读文件。

## 扩展

增加作者侧校验器，高亮缺失元数据。

范围：图关系由作者明确编写；工具不从 SVG 几何推断意义，也不声称理解图像。支持的 SVG 是安全、受限的绘图子集。阅读顺序是可审核的候选项，不是教学有效性的证明。
