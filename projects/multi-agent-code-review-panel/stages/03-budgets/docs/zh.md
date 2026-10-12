# 预留费用并执行截止时间

第 3 阶段，共 4 阶段。开始前阅读[项目的前置要求](../../../README.md)；本阶段建立在此前契约之上。

## 变化

启动每位审查者之前先预留其费用。跳过剩余预算无法容纳的工作并记录决定。让每位审查者与截止时间竞速，超时后中止其信号。失败保留在轨迹中，已完成的审查仍可聚合。适配器必须遵守 AbortSignal 才能停止外部工作；运行器不能强迫远程服务取消。

本阶段的边界是 `runPanel`。保留前面阶段的行为：最终评分器会针对同一个工作区运行所有阶段。

## 分析一个具体案例

三位审查者各花费一个单位，预算 2 只允许前两位加入。他们并发启动；1000 ms 的截止时间把慢审查者标为 timeout，并中止其信号。

```figure
pj-multi-agent-code-review-panel-3
```

修改实验输入，先算出结果，再看指标。图表根据输入计算；下面的实现测试仍是完成证据的来源。

## 实现契约

在工作区的 `main.ts` 中实现 `runPanel`。先尝试实现契约，再阅读参考方案导出的类型。保留起始代码的公开名称，便于测试调用你的实现。核心函数返回结构化值，不在内部打印；CLI 负责打印最终结果。

使用[公开 API 契约](../../../API.md)和起始代码的类型化签名。核心函数返回值，提供的驱动器负责文件输入、参数解析和呈现。

每个 Promise 启动前先预留费用。聚合已完成审查时，也在轨迹中保留超时和失败事件；否则，看似便宜的不完整小组会掩盖跳过的工作。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py multi-agent-code-review-panel --init learning-artifacts/multi-agent-code-review-panel` 初始化一次。随后累积评分：

```bash
python3 scripts/project_test.py multi-agent-code-review-panel --stage 3 --path learning-artifacts/multi-agent-code-review-panel --strict
```

全新工作区应在契约实现之前失败。所有阶段完成后，用提供的样本运行你的实际产物：

```bash
cd learning-artifacts/multi-agent-code-review-panel
node cli.ts --input samples/review.json --output panel.json --html panel.html
```

## 探查失败边界

实现一个忽略 AbortSignal 的审查者。展示运行器可以停止等待，却不能保证外部工作已经停止。




## 参考资料

[Node 中的 AbortController](https://nodejs.org/api/globals.html#class-abortcontroller)
[Node 测试运行器](https://nodejs.org/api/test.html)
