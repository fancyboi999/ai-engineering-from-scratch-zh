# 构建稳定有界时间线

> 事件 b 在 5，事件 a 在 1 -> 先 a 后 b

**类型：** Build
**语言：** Go
**阶段：** 第 2 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 区分摄取顺序和时间线顺序

日志可乱序到达。时间线排序观测事件，但不声称时间顺序证明因果。复制输入，让其他消费者仍能检查到达顺序。两事件同秒时，用事件 ID 打破平局。

## 推演一个案例

假设 b 在 35 秒到达，a 在 0 秒，c 在 35 秒。排序得到 a、b、c。范围上限为 30 时操作失败，不丢弃 b 和 c。被丢事件可能正是反驳草稿解释的观测。

```figure
pj-postmortem-writer-2
```

## 你的任务

```go
func Timeline(events []Event,horizon int)([]Event,error)
```

在工作区实现这些公开签名。区分无效输入、预算超限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已提交的参考方案中另写一个函数不会推进你的阶段。

## 运行测试

```bash
python3 scripts/project_test.py postmortem-writer --stage 2 --path /tmp/postmortem-writer-work
```

本阶段检查 Ordered、Tied、NoMutation、Bound、Empty。用失败案例定位被破坏的不变量。只通过正常示例不能证明边界行为正确。

## 实现提示

先验证时间范围上限和全部事件时间。复制切片，再以 second 为主键、ID 为次键排序。测试同时检查输出顺序和输入未变。

先从一条有效记录开始，再添加拒绝案例，最后才优化。失败时不改变源数据，让调用者能诊断原因。用能表达边界的最小函数；额外的框架会掩盖你正在学习的机制。

## 检查理解

同三条记录的范围上限恰为 35 会怎样？在不同到达位置添加同时间戳，证明最终资料包相同。

运行测试前先写下预测。如果结果出乎意料，沿着验证、状态构造和输出追踪输入。通过测试的参考实现只是对照工具；只有你自己的工作区通过累积评分器才能证明完成。

## 使用你自己的数据

`--events FILE --review FILE --out DIRECTORY` 生成 index.html、packet.json、packet.txt。用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行提供的文件。无参数时 CLI 输出小型原创 fixture。证据检查建立来源追踪；因果判断与审查者身份仍是人的责任。

## 来源

[Google SRE 复盘实践](https://sre.google/workbook/postmortem-culture/)。
