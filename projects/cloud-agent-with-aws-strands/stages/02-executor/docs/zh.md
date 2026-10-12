# 在步骤和响应预算内执行读取

第 2 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

开始操作前扣除步骤预算，保留输出前扣除序列化输出预算。输出限制不能撤回调用成本，但能防止大结果淹没后续上下文。保留部分结果和明确的终止状态，使预算停止仍可诊断。

## 推演一个具体案例

max_steps=2 时，三动作计划最多保留两个结果。max_chars=1 时，仍可能先运行第一个 provider，再发现结果过大；此时不保留输出。

```figure
pj-cloud-agent-with-aws-strands-2
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

实现 `executor.py`：`execute`。这是“使用 AWS Strands 的云端 agent”的第 2 阶段产物。它消费显式输入，返回可检查、供下一阶段使用的结果。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

步骤预算限制派发，序列化输出预算限制保留的上下文。在结果中说明这两种不同保证，并在预算耗尽时保留已完成的行。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 2 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

## 探究失败边界

让首次读取返回 1000 字符的字符串。说明为什么限制 provider 响应字节数是适配器的另一项独立职责。




## 参考资料

[参考资料 1](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)
