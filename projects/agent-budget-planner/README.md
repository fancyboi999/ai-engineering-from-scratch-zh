# Agent 预算规划器

识别费用回执的预算控制器，让不确定的支出始终可见。

Python 3.10+；函数、字典、异常、整数运算和回调函数。核心使用标准库。评分器检查你选择的工作区，绝不会用参考实现补齐缺失的行为。

## 构建并运行你的版本

在仓库根目录执行一次初始化。全新的起始实现会故意失败。

```bash
python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner
python3 scripts/project_test.py agent-budget-planner --stage 1 --path learning-artifacts/agent-budget-planner --strict
```

实现每个阶段，然后运行累积评分器和附带的输入驱动程序：

```bash
python3 scripts/project_test.py agent-budget-planner --all --path learning-artifacts/agent-budget-planner --strict
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

驱动程序和离线样本是附带的脚手架，其导入指向你的实现。公开输入类型和函数签名见起始实现和 [API 契约](API.md)。

## 单独检查参考实现

在仓库根目录执行：

```bash
python3 scripts/project_test.py agent-budget-planner --all --solution --strict
cd projects/agent-budget-planner/solution
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 观察变化

录制中向 100 单位的额度请求了 190 单位。执行附带的哈希任务时接纳两个任务、拒绝一个，结算 95 单位；缺失回执的任务仍保留其预留额度。

编辑样本的副本并重新运行命令。将输入与输出放在一起，让他人能够复现结果；附带样本是专门编写的教学数据。

## 集成与限制

导入 execute_jobs，并提供 invoke(job) -> (value, actual_cost)。只有费率和回执确实已换算为该单位时，才使用 unit=nano_dollars。

费用是调用方提供的整数回执。单调时钟的截止时间控制派发，但无法中断同步回调。账本仅在单进程内存中保存。

## 阶段

1. [用整数微额度单位估算请求费用](stages/01-estimate-cost/docs/zh.md)
2. [派发前预留额度](stages/02-reserve-capacity/docs/zh.md)
3. [结算实际用量并释放未用预算](stages/03-settle-and-release/docs/zh.md)
4. [在费用和时间限制内调度](stages/04-schedule-under-deadlines/docs/zh.md)


## 主要参考资料

[机制与 API 参考](https://docs.python.org/3/library/decimal.html)
