# 结算实际用量并释放未用预算

第 3 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

预留是上限，不是账单。请求完成时，移除其预留并增加实际支出。取消时释放预留，支出为零。

报告的实际费用超过预留属于记账违规。保留旧账本并抛出错误，让调用方对账，而不是悄悄生成负余额。

## 推演一个具体案例

70 单位的预留若收到实际 20 单位的回执，会释放 50 并将 20 计入支出。缺失回执时保留 70 单位预留；报告 71 时触发对账，而不是悄悄增加预算。

```figure
pj-agent-budget-planner-3
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

按所述契约实现 `settle`。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

保存已关闭的请求 id，防止重复回执导致重复支出。异常后读取旧状态，证明它没有改变。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py agent-budget-planner --stage 3 --path learning-artifacts/agent-budget-planner --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 探究失败边界

集成回调完成工作后抛出异常。解释为什么释放预留会隐藏一笔未知负债。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/decimal.html)
