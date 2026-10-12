# 解析事故事件账本

> e1 制表符 12 制表符 alert 制表符 latency high -> t=12 的 Event

**类型：** Build
**语言：** Go
**阶段：** 第 1 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 摄取带稳定定位符的证据

从小型制表符分隔账本开始：事件 ID、经过秒数、类型、消息。后续全部论断依赖这些身份。提供的 JSONL 导入器将显式记录转为契约，记住包括空行在内的原始物理行。

## 推演一个案例

12 秒的告警即使是首个提供事件也有效。第二事件同 ID 是冲突。JSONL 缺失 second 被拒绝，不会悄悄变成零。事件前有空首行时，导入器保留行号 2。

```figure
pj-postmortem-writer-1
```

## 你的任务

```go
func Parse(text string)([]Event,error)
```

在工作区实现这些公开签名。区分无效输入、预算超限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已提交的参考方案中另写一个函数不会推进你的阶段。

## 运行测试

```bash
python3 scripts/project_test.py postmortem-writer --stage 1 --path /tmp/postmortem-writer-work
```

本阶段检查 Valid、Negative、Duplicate、Missing、Empty。用失败案例定位被破坏的不变量。只通过正常示例不能证明边界行为正确。

## 实现提示

追加前解析整数。要求四字段齐全、时间非负。维护 ID 集合，重复时拒绝整批。JSONL 配置拒绝未知字段和嵌入记录分隔符，避免转换添加伪造账本行。

先从一条有效记录开始，再添加拒绝案例，最后才优化。失败时不改变源数据，让调用者能诊断原因。用能表达边界的最小函数；额外的框架会掩盖你正在学习的机制。

## 检查理解

三条有效记录后尝试格式错误记录。调用者应收到什么？解释保留物理行号为何比仅编号解析存活记录更有用。

运行测试前先写下预测。如果结果出乎意料，沿着验证、状态构造和输出追踪输入。通过测试的参考实现只是对照工具；只有你自己的工作区通过累积评分器才能证明完成。

## 使用你自己的数据

`--events FILE --review FILE --out DIRECTORY` 生成 index.html、packet.json、packet.txt。用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行提供的文件。无参数时 CLI 输出小型原创 fixture。证据检查建立来源追踪；因果判断与审查者身份仍是人的责任。

## 来源

[Google SRE 复盘实践](https://sre.google/workbook/postmortem-culture/)。
