# 对重复事件分组并保留时间戳

> 先去重事件快照，再累加不同序列。

**类型：** Build
**语言：** Go, TypeScript
**阶段：** 2 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

同一事件 UID 的重复导出是同一序列的快照。保留最大计数，并合并时间范围。再按对象 UID、reason 和 type 对不同事件 UID 分组，累加计数。按发生时间和身份排序。代表对象引用取自字典序第一个事件 UID，而 eventUIDs 保留所有贡献者的身份。

## 示例推演

event-fail 的两个快照计数为 2 和 4，贡献是 4 而非 6。同一原因的另一个事件 UID 计数为 1，使分组计数达到 5。复用 pod 名但 UID 不同的对象形成另一行。

```figure
pj-kubernetes-event-storyboard-2
```

## 实现契约

`Group(Bundle)([]Row,error)`。行保留 object、reason、type、count、firstOccurrence、lastOccurrence、observedAt 和排序的 eventUIDs。拒绝将同一事件 UID 复用于其他对象、原因或类型。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py kubernetes-event-storyboard --init /tmp/kubernetes-event-storyboard-work
python3 scripts/project_test.py kubernetes-event-storyboard --stage 2 --path /tmp/kubernetes-event-storyboard-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

两条事件消息原因相同时会丢失什么证据？解释为什么这份紧凑报告不能替代原始事件导出。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
