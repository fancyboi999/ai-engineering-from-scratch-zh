# 要求每个论断提供证据

> 论断引用 e99，而账本只有 e1 -> 无效

**类型：** Build
**语言：** Go
**阶段：** 第 3 阶段，共 4 阶段
**预计时间：** 约 2 小时

## 区分引用和结论

有效引用指向不同的已知事件。这证明来源存在，不证明事件在逻辑上确立因果论断。组合审查工作台还检查精确引文，保持论断待审，批准记录要求显式审查者和匹配来源哈希。

## 推演一个案例

论断“部署后出现告警”引用 e1、e2。两 ID 均存在，来源检查通过。更强的“部署导致故障”可引用同两 ID，却仍需调查。来源只说“latency high”时，引文“database failed”被拒绝。

```figure
pj-postmortem-writer-3
```

## 你的任务

```go
func Verify(claim Claim,events []Event)error
```

在工作区实现这些公开签名。区分无效输入、预算超限和状态冲突。操作失败时保留原始证据或输入记录。测试直接加载你的工作区，因此在已提交的参考方案中另写一个函数不会推进你的阶段。

## 运行测试

```bash
python3 scripts/project_test.py postmortem-writer --stage 3 --path /tmp/postmortem-writer-work
```

本阶段检查 Supported、Dangling、NoEvidence、Duplicate、Blank。用失败案例定位被破坏的不变量。只通过正常示例不能证明边界行为正确。

## 实现提示

构建已知事件 ID 集合，再构建论断内部证据 ID 独立集合。拒绝空白论断、缺证据、重复引用和悬空引用。绝不以合理替代品补齐缺失来源。

先从一条有效记录开始，再添加拒绝案例，最后才优化。失败时不改变源数据，让调用者能诊断原因。用能表达边界的最小函数；额外的框架会掩盖你正在学习的机制。

## 检查理解

构造引用同事件的两个不同论断。解释代码能做哪些检查，哪些判断仍归审查者。底层日志改变时，批准决定为何必须过期？

运行测试前先写下预测。如果结果出乎意料，沿着验证、状态构造和输出追踪输入。通过测试的参考实现只是对照工具；只有你自己的工作区通过累积评分器才能证明完成。

## 使用你自己的数据

`--events FILE --review FILE --out DIRECTORY` 生成 index.html、packet.json、packet.txt。用 `--events ../examples/events.jsonl --review ../examples/review.json --out /tmp/incident-packet` 运行提供的文件。无参数时 CLI 输出小型原创 fixture。证据检查建立来源追踪；因果判断与审查者身份仍是人的责任。

## 来源

[Google SRE 复盘实践](https://sre.google/workbook/postmortem-culture/)。
