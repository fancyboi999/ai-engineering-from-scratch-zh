# 区分工作时间与等待时间

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 本阶段的变化

包含子节点的时长是结束减开始。独占时长要减去直接子节点区间的并集，而不是它们的和，因为并行子节点会重叠。根区间的并集给出跨运行的墙钟耗时。token 按 span 自身记录，只汇总一次。最慢结果指向独占时长最大的 span，避免选中主要在等待子节点的根。

本阶段的边界是 `unionDuration, analyze`。保持前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 推演一个具体案例

childA 运行于 10..60，childB 运行于 40..90。它们的时长之和为 100，重叠为 20，并集为 80。因此 100 ms 的父节点自身占用 20 ms，而不是零。

```figure
pj-agent-trace-debugger-3
```

修改实验输入，在查看指标前先算出结果。图表会根据这些输入计算；下方的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `unionDuration, analyze`。先尝试实现契约，再阅读参考实现导出的类型。保留 starter 的公开名称，让测试能调用你的实现。核心函数返回结构化值，不要直接打印；CLI 会打印最终结果。

使用[公开 API 契约](../../../API.md)和带类型的 starter 签名。核心函数返回值，文件输入、参数解析和展示交给随附驱动程序。

按开始时间排序区间；遇到重叠就延长当前结束时间，只有下一区间开始于它之后才提交当前区间。计算 span 独占时长时只使用直接子节点。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py agent-trace-debugger --stage 3 --path learning-artifacts/agent-trace-debugger --strict
```

全新工作区在你实现契约之前应当失败。完成所有阶段后，用随附样本运行你的实际产物：

```bash
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 探查失败边界

在实验中把 B 的开始时间从 40 改成 70。先预测并集为 70、父节点自身耗时为 30，再看条形图。




## 参考资料

[OpenTelemetry 跟踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)
