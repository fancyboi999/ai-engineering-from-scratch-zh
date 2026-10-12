# 探索敏感性与支配关系

> 找到偏好变化何时会逆转排名。

**类型：** Build
**语言：** TypeScript
**阶段：** 第 3 阶段，共 4 阶段
**前置要求：** 基础函数、集合、JSON，以及适用时的前面阶段。
**预计时间：** 约 2 小时

## 构建内容

将一个权重从零扫描到一。剩余权重按其他基线权重的比例分配。如果另一个方案在每项归一化标准上都不差，且至少一项严格更好，则该合格方案被支配。支配关系不依赖当前偏好权重。

## 示例推演

accessibility 权重为 .5 时，pods 以 .68 胜过 .67。权重为 .6 时，open gallery 获胜。archive 在整个扫描中都不合格，因为改变偏好无法补齐缺失证据。

```figure
pj-decision-tradeoff-explorer-3
```

## 实现契约

`dominated(data):string[]`；`sensitivity(data,id,steps=10)` 返回 steps+1 条 `{weight,weights,winner,scores}` 记录。要求 steps 为 1..100 的整数，且另一项标准的基线权重为正。

生成部分产物前先拒绝格式错误的输入。测试包括独立于演示 fixture 的留出记录。

## 运行你的实现

```bash
python3 scripts/project_test.py decision-tradeoff-explorer --init /tmp/decision-tradeoff-explorer-work
python3 scripts/project_test.py decision-tradeoff-explorer --stage 3 --path /tmp/decision-tradeoff-explorer-work --strict
```

初始化复制累积脚手架，不替换你的工作。在第一阶段 starter 中实现 TODO 函数；后续阶段 starter 笔记描述新增行为。测试导入学习者工作区。阶段通过后，按 README 中的命令运行自己的输入。

## 检查与扩展

用更细的扫描检查准确边界。采样得到的交叉区间，不是仅有一次交叉的解析证明。

[Go 标准库](https://pkg.go.dev/std)和 [Node 标准库](https://nodejs.org/api/)。全部 fixture 和实现均为原创。
