# 将证据关联到工作负载修订版本

> 沿所有者 UID 追踪，不根据名称猜测。

**类型：** Build
**语言：** Go, TypeScript
**阶段：** 3 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

将对象 UID 映射到工作负载快照，沿 ownerReferences 遍历，直到找到修订版本注解。通过已访问集合终止环路。只有恰好一个不同的修订版本时才能关联；缺失或冲突仍为未知。调查项是基于 reason 的建议，绝非因果结论。

## 示例推演

pod-old 有一条到 rs-7 的边，修订版本为 7。pod-new 关联到 rs-8，修订版本为 8。缺少所有者快照时修订版本留空；不要用同名工作负载替代。

```figure
pj-kubernetes-event-storyboard-3
```

## 实现契约

`Connect(rows []Row,workloads []Workload) []Row` 返回带可选修订版本和调查文本的行副本。不修改输入。修订版本注解键为 deployment.kubernetes.io/revision。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py kubernetes-event-storyboard --init /tmp/kubernetes-event-storyboard-work
python3 scripts/project_test.py kubernetes-event-storyboard --stage 3 --path /tmp/kubernetes-event-storyboard-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

添加具有冲突修订版本注解的 Deployment 对象，观察保守的未知结果。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
