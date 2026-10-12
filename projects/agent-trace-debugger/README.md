# Agent 跟踪调试器

用前后对比的回归报告解释重叠、自身耗时和失败 span 的 token 开销。

需要 Node 22.18+ 和用于评分器的 Python 3；需掌握 TypeScript 对象、数组、Map、排序和区间运算。核心使用标准库。评分器检查你选定的工作区，绝不会用参考实现补齐缺失行为。

## 构建并运行你的版本

从仓库根目录初始化一次。全新的 starter 会故意失败。

```bash
python3 scripts/project_test.py agent-trace-debugger --init learning-artifacts/agent-trace-debugger
python3 scripts/project_test.py agent-trace-debugger --stage 1 --path learning-artifacts/agent-trace-debugger --strict
```

实现每个阶段后，运行累积评分器和随附的输入驱动程序：

```bash
python3 scripts/project_test.py agent-trace-debugger --all --path learning-artifacts/agent-trace-debugger --strict
cd learning-artifacts/agent-trace-debugger
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

驱动程序和离线样本是现成的脚手架。驱动程序导入的是你的实现。公开输入类型和函数签名见 starter 和 [API 契约](API.md)。

## 单独查看参考实现

从仓库根目录运行：

```bash
python3 scripts/project_test.py agent-trace-debugger --all --solution --strict
cd projects/agent-trace-debugger/solution
node cli.ts --input samples/trace.jsonl --baseline samples/before.jsonl --output trace.html --json trace.json
```

## 观察变化

随附运行的墙钟耗时仍为 100 ms，但失败 span 的 token 增加了 200，错误数增加了 1。时间线会展示发生变化的 span，而不是把墙钟耗时不变当作行为不变。

编辑样本的副本并重新运行命令。把输入与输出放在一起，让他人能够复现结果；随附样本是原创教学数据。

## 集成与限制

从你的埋点中逐行导出 Span JSON 对象，并在 CI 中把 trace.json 与 trace.html 一起保留。

输入是文档规定的 JSONL Span 契约，或下文介绍的受限 OTLP JSON 适配器格式。token 必须是各 span 独占的用量。跨机器时钟必须在导入前归一化。

## 阶段

1. [读取 JSONL 跟踪](stages/01-parse/docs/zh.md)
2. [校验父子关系](stages/02-tree/docs/zh.md)
3. [区分工作时间与等待时间](stages/03-timing/docs/zh.md)
4. [渲染可检查的时间线](stages/04-timeline/docs/zh.md)


## 主要参考资料

[OpenTelemetry 跟踪概念](https://opentelemetry.io/docs/concepts/signals/traces/)
[Node 测试运行器](https://nodejs.org/api/test.html)

## 导入 OTLP JSON

`otlp.ts` 接受 resourceSpans/scopeSpans/spans 的 JSON 结构。它先用 BigInt 归一化纳秒时间戳，再将差值转成毫秒；给 span ID 加上 trace ID 前缀，并读取 gen_ai.usage.input_tokens/output_tokens 属性。缺失父节点仍会被树校验器拒绝；这是 JSON 适配器，不是采集器或 protobuf 解码器。

```bash
node cli.ts --format otlp --input samples/otlp.json --output otlp-trace.html --json otlp-trace.json
```

原创导出数据包含一个 15 ms 的错误 span 和 60 个 token。token 属性必须只记录各 span 自身的用量，避免重复计数。
