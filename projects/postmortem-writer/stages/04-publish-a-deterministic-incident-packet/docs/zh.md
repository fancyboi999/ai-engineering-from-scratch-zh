# 发布确定性事故资料包

> 已验证论断 + 有序证据 -> 一个完整资料包

**类型：** Build
**语言：** Go
**阶段：** 第 4 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 发布资料包并暴露未完成审查

文本资料包、HTML 工作台、JSON 回执描述同一验证输入。HTML 含来源链接、物理行定位、报告影响、论断决定和有负责人的后续行动。待审论断和未分配工作保持可见，不从最终报告消失。

## 推演一个案例

运行 `go run . --events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet`。打开 index.html，沿 e2 找到精确日志行。批准论断时，从 packet.json 复制 SourceSHA256 到审查文件的 sourceSHA256，将 state 设为 approved，提供 reviewer 标签，再重建。

```figure
pj-postmortem-writer-4
```

## 你的任务

```go
func Report(events []Event,claims []Claim,maxClaims int)(string,error)
```

在工作区实现这些公开签名。区分无效输入、预算超限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已提交的参考方案中另写一个函数不会推进你的阶段。

## 运行测试

```bash
python3 scripts/project_test.py postmortem-writer --stage 4 --path /tmp/postmortem-writer-work
```

本阶段检查 Packet、Limit、InvalidAtomic、Escaped、Deterministic。用失败案例定位被破坏的不变量。只通过正常示例不能证明边界行为正确。

## 实现提示

生成输出前对每论断调用 Verify，再排序时间线。拒绝超过上限的论断数量。HTML 使用 Go 模板，含脚本标签的消息仍是文本。批准身份是提供的标签，不是认证签名。

先从一条有效记录开始，再添加拒绝案例，最后才优化。失败时不改变源数据，让调用者能诊断原因。用能表达边界的最小函数；额外的框架会掩盖你正在学习的机制。

## 检查理解

批准后改一个日志字节，确认构建以来源冲突失败。集成测试也拒绝伪造引文和缺时间戳。扩展时将日志导出器接入 JSONL；保留证据契约，不添加虚构因果解释。

运行测试前先写下预测。如果结果出乎意料，沿着验证、状态构造和输出追踪输入。通过测试的参考实现只是对照工具；只有你自己的工作区通过累积评分器才能证明完成。

## 使用你自己的数据

`--events FILE --review FILE --out DIRECTORY` 生成 index.html、packet.json、packet.txt。用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行提供的文件。无参数时 CLI 输出小型原创 fixture。证据检查建立来源追踪；因果判断与审查者身份仍是人的责任。

## 来源

[Google SRE 复盘实践](https://sre.google/workbook/postmortem-culture/)。
