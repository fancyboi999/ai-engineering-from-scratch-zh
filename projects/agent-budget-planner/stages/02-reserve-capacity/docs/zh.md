# 派发前预留额度

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

只检查可用预算而不预留，会让多个排队请求花掉同一份额度。将预留额度与已结算支出分开保存。计入这两部分后，新请求仍须在限额内。

这个单进程状态机用于教授不变量，并不宣称具备分布式并发安全性。服务版本需要用原子事务或锁保护这个确切的转换。

## 推演一个具体案例

初始 limit 为 100、spent 为 20、holds={A:30}。可用额度为 50，因此预留 B:60 会失败且不改变 A。再次使用 id A 预留也会失败，即使金额仅为 1。

```figure
pj-agent-budget-planner-2
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

按所述契约实现 `reserve`。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

校验标识和金额后才构建新的 holds 字典。接纳与预留必须是一次状态转换；仅在此前检查 available() 仍会允许重复支出。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py agent-budget-planner --init learning-artifacts/agent-budget-planner` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py agent-budget-planner --stage 2 --path learning-artifacts/agent-budget-planner --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/agent-budget-planner
python3 cli.py samples/input.json --mode execute --output budget.json
```

## 探究失败边界

跟踪两个都观察到 50 单位空余额度的调用方。指出服务需要在 reserve 周围使用哪种锁或数据库事务。




## 参考资料

[主要技术参考](https://docs.python.org/3/library/decimal.html)
