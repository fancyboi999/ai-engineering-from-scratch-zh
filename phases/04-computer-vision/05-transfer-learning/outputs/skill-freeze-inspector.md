---
name: skill-freeze-inspector
description: 报告哪些参数可训练、哪些 BatchNorm 层处于 eval 模式，以及优化器是否真的接管了可训练参数
version: 1.0.0
phase: 4
lesson: 5
tags: [computer-vision, transfer-learning, debugging, pytorch]
---

# 冻结检查器

迁移学习的 bug 藏在三个地方：该冻结的参数没冻结，该训练的参数没打开，以及优化器在冻结状态改变之前就已经构建好了。这个 skill 一次就把三类问题全部找出来。

## 何时使用

- 刚对一部分参数设置完 `requires_grad`。
- 微调开始前，第一步训练之前。
- 调用 `freeze_bn_stats` 或任何会切换 BN 模式的辅助函数之后。
- 验证准确率一直停在随机水平，怀疑其实什么都没在训练。

## 输入

- `model`：一个 PyTorch `nn.Module`。
- `optimizer`：即将用于训练的优化器。
- 可选 `expected_frozen_prefixes`：应当被冻结的参数名前缀列表（例如 `["conv1", "bn1", "layer1"]`）。

## 步骤

1. **遍历参数。** 对每个 `(name, param)`：
   - 记录 `requires_grad`
   - 记录 `shape` 和 `numel`

2. **遍历模块。** 对每个模块：
   - 如果是 BatchNorm，记录它是否处于 eval 模式，以及它的仿射参数是否可训练。

3. **检查优化器。** 对每个参数组：
   - 把其中的 `params` 展平成一个 `id(p)` 集合。
   - 与所有 `requires_grad == True` 的参数的 `id(p)` 集合做比较。

4. **检测四种失败模式：**
   - `leaked_train`：参数设置了 `requires_grad=True`，却不在优化器里（梯度算出来了，但从未被应用）。
   - `ghost_train`：参数在优化器里，却设置了 `requires_grad=False`（优化器状态白白浪费；如果之后重新打开 requires_grad，还可能引发 bug）。
   - `bn_mismatch`：(a) BN 层处于 train 模式（会累积运行统计量），而它的仿射参数（`weight`、`bias`）被冻结；或者 (b) BN 层处于 eval 模式（统计量冻结），而它的仿射参数可训练。这两种状态都不一致，几乎一定是 bug。
   - `expected_vs_actual`：`expected_frozen_prefixes` 中列出的某个前缀下仍有可训练参数。

## 报告

```
[freeze-inspector]
  model trainable params: <N>
  model frozen params:    <N>
  batchnorm layers in eval mode: <count>
  batchnorm layers in train mode: <count>

[optimizer coverage]
  trainable params fed to optimizer: <M> of <N>
  leaked_train: <list of names> (trainable but not in optimizer)
  ghost_train:  <list of names> (in optimizer but frozen)

[bn audit]
  mismatched layers: <list of names>

[expectations]
  expected_frozen_prefixes: <...>
  violating params:         <list>

[verdict]
  ok | <one-line summary of the most severe issue>
```

## 规则

- 只报告参数名，绝不打印权重本身。
- 每个列表都按参数名字母顺序排序。
- 如果优化器覆盖率为 100% 且没有任何不一致，返回 `ok` 并停止。
- 对 `leaked_train`，一律建议在冻结状态改变之后重新构建优化器。
- 对 `ghost_train`，建议移除该参数组；如果本意是训练它，则设置 `requires_grad=True`。
