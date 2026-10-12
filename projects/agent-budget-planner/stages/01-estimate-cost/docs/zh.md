# 用整数微额度单位估算请求费用

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

浮点费用会累积舍入误差。用整数表示费率和费用，并记录单位。请求估算按不同的每 token 费率计算 prompt token 和输出上限的费用。

这个 fixture 中的费率是任意教学单位，不是 provider 定价。输出上限用于预留最坏情况下的费用，使调度器能在调用模型前作出决定。实际用量稍后再结算。

## 推演一个具体案例

一个 prompt 有 120 个 token，允许输出 40 个 token。整数费率分别为 2 和 5 时，费用上限是 120*2+40*5=440 单位。output_limit=0 时，上限仍是 240。

```figure
pj-agent-budget-planner-1
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

按所述契约实现 `estimate`。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

在 Python 中单独校验布尔值与整数：True 不能变成一个 token。相乘前检查每个操作数，并在结果旁保留调用方的单位。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py agent-budget-planner --stage 1 --path learning-artifacts/agent-budget-planner --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 探究失败边界

将输出上限从 40 改为 400。估算变成 2240 单位。实际输出 40 个 token 时，账单为 440，相差 1800；实际输出为零时，账单为 240，差额达到最大值 2000。解释预留上限与结算回执为什么不同。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/decimal.html)
