# 渲染可检查的时间线

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 本阶段的变化

生成独立 HTML 时间线，每个 span 一行，条形按比例缩放，用颜色标出错误。插入标记前转义 span 名称。包含自身耗时、总耗时、墙钟耗时、token 和错误数。空跟踪也应生成可读产物。输出是本地静态报告，不加载第三方脚本。

本阶段的边界是 `render`。保持前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 推演一个具体案例

随附基线与修改后的跟踪都有 100 ms 墙钟耗时。修改后的 model span 多花了 200 个 token 并失败。只看总延迟会掩盖这个回归。

```figure
pj-agent-trace-debugger-4
```

修改实验输入，在查看指标前先算出结果。图表会根据这些输入计算；下方的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `render`。先尝试实现契约，再阅读参考实现导出的类型。保留 starter 的公开名称，让测试能调用你的实现。核心函数返回结构化值，不要直接打印；CLI 会打印最终结果。

使用[公开 API 契约](../../../API.md)和带类型的 starter 签名。核心函数返回值，文件输入、参数解析和展示交给随附驱动程序。

CLI 分别分析每个输入，再对相应聚合指标求差。嵌入 HTML 前转义 span 名称，保留 JSON 回执用于自动比较。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py agent-trace-debugger --stage 4 --path learning-artifacts/agent-trace-debugger --strict
```

全新工作区在你实现契约之前应当失败。完成所有阶段后，用随附样本运行你的实际产物：

```bash
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 探查失败边界

添加一个名为 <script>alert(1)</script> 的 span。它必须作为文本显示，token/错误增量仍为数值。

输入是文档规定的 JSONL Span 契约，不是原生 OTLP 导出。token 必须是各 span 独占的用量。跨机器时钟必须在导入前归一化。


## 参考资料

[OpenTelemetry 跟踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)
