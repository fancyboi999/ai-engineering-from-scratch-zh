# 比较有界退避与抖动

> 用可复现的客户端专属序列分散计划重试。

**类型：** Build
**语言：** Go, TypeScript
**阶段：** 2 / 4
**前置要求：** 基础函数、集合、JSON，以及适用的前序阶段。
**预计时间：** 约 2 小时

## 构建内容

第 n 次重试前的退避从 BaseMS 开始，翻倍直到 MaxMS。抖动根据客户端、尝试次数和种子，在 [0,cap] 内选择确定性整数。这种算术序列用于教学复现，不是密码学随机数生成器。

## 示例推演

Base 为 10、上限为 25 时，无抖动产生 10,20,25,25。启用抖动后，每个客户端可以安排不同延迟。零延迟是合法的全抖动结果，可能放大同一时间桶的负载。

```figure
pj-retry-storm-lab-2
```

## 实现契约

`Delay(p Policy,client,attempt int) int`，第一次重试等待的 attempt 编号为 1。用 uint64 混合 ((client+1)*1103515245 + attempt*12345 + seed)：与 x>>16 异或，乘以 2246822519，与 x>>13 异或，再对 (cap+1) 取模。`Validate` 拒绝无效边界。

在产生部分产物前拒绝格式错误的输入。测试包含与演示 fixture 分离的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py retry-storm-lab --init /tmp/retry-storm-lab-work
python3 scripts/project_test.py retry-storm-lab --stage 2 --path /tmp/retry-storm-lab-work --strict
```

初始化复制累积脚手架，不会替换你的工作。实现第一阶段 starter 中的 TODO 函数；后续阶段的 starter 说明描述新增行为。测试导入学习者工作区。阶段通过后，使用自己的输入运行 README 中的命令。

## 检查与扩展

以相同种子运行两次，比较精确时间线，再改变种子。得出性能结论前，先报告不同种子的分布。

[Go 标准库](https://pkg.go.dev/std) 和 [Node 标准库](https://nodejs.org/api/)。所有 fixture 和实现均为原创。
