# 读取 JSONL 跟踪

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 本阶段的变化

每个非空行解析为一个 JSON 对象。要求稳定的 ID、名称、有限的开始和结束时间、非负 token 数，以及明确的 ok 或 error 状态。遇到格式错误的行就停止处理并报告行号。悄悄丢弃坏 span 会扭曲耗时和成本结论。时间是相对毫秒，不是墙钟时间戳。

本阶段的边界是 `parseTrace`。保持前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 推演一个具体案例

文件依次包含空行、有效根节点和错误文本时，必须报告第 3 行的错误。先过滤空行再编号，会错误地指向第 2 行。

```figure
pj-agent-trace-debugger-1
```

修改实验输入，在查看指标前先算出结果。图表会根据这些输入计算；下方的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `parseTrace`。先尝试实现契约，再阅读参考实现导出的类型。保留 starter 的公开名称，让测试能调用你的实现。核心函数返回结构化值，不要直接打印；CLI 会打印最终结果。

使用[公开 API 契约](../../../API.md)和带类型的 starter 签名。核心函数返回值，文件输入、参数解析和展示交给随附驱动程序。

先枚举物理行，在循环内部忽略空行；解析 JSON 后校验 start/end/tokens 是否有限。保留零时长 span，它们是有效观测。

## 验证与检查

从仓库根目录用 `python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py agent-trace-debugger --stage 1 --path learning-artifacts/agent-trace-debugger --strict
```

全新工作区在你实现契约之前应当失败。完成所有阶段后，用随附样本运行你的实际产物：

```bash
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 探查失败边界

用本地脚本记录一个嵌套 span。时间保持为相对毫秒，每份 token 用量只归到一个 span。




## 参考资料

[OpenTelemetry 跟踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)
