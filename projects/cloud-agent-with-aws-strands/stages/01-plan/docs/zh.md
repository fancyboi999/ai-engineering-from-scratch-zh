# 校验限定范围的云端检查计划

第 1 阶段，共 4 阶段。开始前阅读[项目前置要求](../../../README.md)；本阶段基于前面的契约继续构建。

## 有何变化

模型提出意图，确定性校验器授予权限。只接受调用方范围中明确命名的读取操作和资源 id。拒绝未知键和超大计划，防止额外的模型生成指令悄悄成为可执行参数。

## 推演一个具体案例

checkout 故障计划包含 metrics.read checkout 和 logs.read checkout。两者都符合 scope={checkout}。将 logs.read 换成 logs.delete，必须在首次 provider 调用之前拒绝整个提案。

```figure
pj-cloud-agent-with-aws-strands-1
```

更改实验输入，先自行计算，再查看指标。图表根据这些输入计算；下面的实现测试仍是完成情况的证据来源。

## 实现契约

实现 `plan.py`：`validate_plan`。这是“使用 AWS Strands 的云端 agent”的第 1 阶段产物。它消费显式输入，返回可检查、供下一阶段使用的结果。

使用[公开 API 契约](../../../API.md)和起始实现中的类型签名。核心函数返回值，由附带驱动程序负责文件输入、参数解析和展示。

要求键恰好为 operation 和 resource。不能因为模型带上了额外的 shell 或 region 属性，就让它们成为执行参数。

## 验证与检查

在仓库根目录用 `python3 scripts/project_test.py cloud-agent-with-aws-strands --init learning-artifacts/cloud-agent-with-aws-strands` 初始化一次。然后运行累积评分：

```bash
python3 scripts/project_test.py cloud-agent-with-aws-strands --stage 1 --path learning-artifacts/cloud-agent-with-aws-strands --strict
```

在你实现契约之前，全新工作区应当失败。所有阶段完成后，用附带样本运行你的实际产物：

```bash
cd learning-artifacts/cloud-agent-with-aws-strands
python3 cli.py samples/input.json --output incident.json
```

## 探究失败边界

添加范围外的第二个资源 inventory-api。校验失败后，记录 provider 调用的探针应仍为空。




## 参考资料

[参考资料 1](https://strandsagents.com/docs/user-guide/concepts/model-providers/custom_model_provider/)
