# 在费用和时间限制内调度

第 4 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

有界 agent 需要的不只是金额计数器。每个串行任务开始前应用截止时间和费用限制，然后追加明确的完成或拒绝事件。测试确定性时长，而不是实际睡眠。

这是接纳决策模拟器，与执行明确分离。JSON 轨迹让你检查哪个约束拒绝了各任务；它不是模型延迟基准测试。

## 推演一个具体案例

两个任务各预留 70，限额为 100。执行模式中，第一个结算 20；第二个此时符合限额，也结算 20。在费用分别为 70 和 70 的保守回放中，只有第一个符合限额。不同轨迹来自不同证据。

```figure
pj-agent-budget-planner-4
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

按所述契约实现 `schedule`。在 `events[].status` 中输出每个结果：接纳任务为 `completed`，拒绝任务为 `rejected`，并附上截止时间或预算原因。执行驱动程序使用同一状态字段，对不确定回执增加 `needs_reconciliation`。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

将 schedule 保持为确定性的接纳回放。附带的 execute_jobs 驱动程序围绕实际回调调用你的 reserve 和 settle 函数；不要用预测时长代替回调实际经过的时钟时间。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py agent-budget-planner --stage 4 --path learning-artifacts/agent-budget-planner --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 探究失败边界

添加一个睡眠超过截止时间的调用。下次派发必须停止，但这个同步实现无法中断正在运行的回调。

费用是调用方提供的整数回执。单调时钟的截止时间控制派发，但无法中断同步回调。账本仅在单进程内存中保存。


## 参考资料

[主要技术参考](https://docs.python.org/3/library/decimal.html)
