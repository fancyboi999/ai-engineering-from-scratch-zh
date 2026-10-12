# 校验父子关系

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 本阶段的变化

子 span 必须引用已有父节点，且时间区间位于父区间内。检查每条祖先链是否有环，并拒绝重复 ID。允许多个根节点，因为一次跟踪可能包含重叠的独立运行。先校验再聚合，避免损坏的图生成貌似可信的图表。

本阶段的边界是 `validateTree`。保持前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 推演一个具体案例

根节点运行于 0..100，childA 运行于 10..80。childB 如果在 110 结束，就违反包含关系，尽管各自区间时长都非负。A->B->A 即使所有时间相同，也违反祖先关系。

```figure
pj-agent-trace-debugger-2
```

修改实验输入，在查看指标前先算出结果。图表会根据这些输入计算；下方的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `validateTree`。先尝试实现契约，再阅读参考实现导出的类型。保留 starter 的公开名称，让测试能调用你的实现。核心函数返回结构化值，不要直接打印；CLI 会打印最终结果。

使用[公开 API 契约](../../../API.md)和带类型的 starter 签名。核心函数返回值，文件输入、参数解析和展示交给随附驱动程序。

遍历祖先前先建立 ID 映射。为每个 span 新建 visited 集合，既能检测环，也不会把两个合法子节点共享的祖先误判成环。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py agent-trace-debugger --stage 2 --path learning-artifacts/agent-trace-debugger --strict
```

全新工作区在你实现契约之前应当失败。完成所有阶段后，用随附样本运行你的实际产物：

```bash
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 探查失败边界

创建两个相互重叠的独立根节点。它们合法；第 3 阶段必须合并时间区间，而不是把墙钟耗时相加。




## 参考资料

[OpenTelemetry 跟踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)
