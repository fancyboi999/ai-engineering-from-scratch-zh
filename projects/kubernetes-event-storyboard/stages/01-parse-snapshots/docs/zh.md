# 解析事件和工作负载快照

> 将发生时间与采集导出的时间分开。

**类型：** Build
**语言：** Go, TypeScript
**阶段：** 1 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

解析包含 observedAt、以及导出 Kubernetes JSON 列表的 events.items 和 workloads.items 的数据包。保留 core/v1 Event 的一个子集。使用 firstTimestamp 和 lastTimestamp，缺失时回退到 eventTime 或 metadata.creationTimestamp；series 提供最新计数和 lastObservedTime。

## 示例推演

教学警告发生于 12:00 至 12:03，数据包则在 12:05 被观察到。它指向 pod-old，而非仅仅可复用的名称 gallery-7-a。工作负载对象只保留身份、所有者 UID 和部署修订版本注解。

```figure
pj-kubernetes-event-storyboard-1
```

## 实现契约

`Parse([]byte)(Bundle,error)`。拒绝超过一 MiB 的文件、尾随 JSON、缺少 items 数组、无效时间戳、小于一的计数、重复工作负载 UID 及缺失事件或对象 UID。缺少计数时默认为一。有意忽略未知 Kubernetes 字段。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py kubernetes-event-storyboard --init /tmp/kubernetes-event-storyboard-work
python3 scripts/project_test.py kubernetes-event-storyboard --stage 1 --path /tmp/kubernetes-event-storyboard-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

用 kubectl get events -A -o json 和相关工作负载导出新的集群快照。不要从事件时间戳推断观察时间。

[Kubernetes 核心 Event API](https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/)。
