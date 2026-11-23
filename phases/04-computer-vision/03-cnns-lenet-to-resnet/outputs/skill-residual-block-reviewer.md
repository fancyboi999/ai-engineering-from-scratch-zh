---
name: skill-residual-block-reviewer
description: 审查 PyTorch 残差块的跳跃连接正确性、BN 位置、激活顺序和形状对齐
version: 1.0.0
phase: 4
lesson: 3
tags: [computer-vision, resnet, code-review, pytorch]
---

# 残差块审查器

一个专门审查 PyTorch 残差块的工具，适用于任何声称实现了残差块的 `nn.Module`。它能抓出四类错误，几乎所有写坏的 ResNet 重写都栽在这几处。

## 何时使用

- 有人写了自定义的 BasicBlock 或 Bottleneck，损失变成 NaN 或准确率卡住不动。
- 你在把一个块从一个框架移植到另一个框架，想验证两者等价。
- 你在审查一个改动 ResNet 内部结构的 PR（预激活、squeeze-excite、抗混叠）。
- 模型在 CIFAR 尺寸的输入上运行正常，换到 ImageNet 分辨率就崩溃，原因是 shortcut 写错了。

## 输入

- 一个 PyTorch 类定义，可以是源代码文本，也可以是可导入的路径。
- 可选的 `variant`：`basic` | `bottleneck` | `preact` | `seblock`。

## 四项检查

### 1. Shortcut 形状对齐

对于任何 `stride != 1` 或 `in_channels != out_channels` 的块，shortcut 路径**必须**是一个能匹配形状的模块，通常是 1x1 卷积加 BN。这种情况下直接用 `nn.Identity()`，前向传播时必然报形状不匹配的错。

诊断：
```
[shortcut]
  detected:  nn.Identity | 1x1 Conv + BN | 1x1 Conv + BN + ReLU | other
  required:  shape-matching Conv if (stride != 1 or in_c != out_c) else Identity
  verdict:   ok | wrong | unnecessarily heavy
```

### 2. BN 相对于加法的位置

加法 `out + shortcut(x)` 必须发生在最后一个 ReLU **之前**（后激活，原始 ResNet），或者完全没有最后的 ReLU（预激活 ResNet v2）。如果一个块在主分支上做了 ReLU，再加上未经处理的 shortcut，激活范围就会不对称，损害训练。

诊断：
```
[activation order]
  pattern:  post-act (conv-BN-ReLU-conv-BN-add-ReLU) | pre-act (BN-ReLU-conv-BN-ReLU-conv-add) | other
  verdict:  ok | suspect
```

### 3. 卷积层的偏置

紧跟 BatchNorm 的卷积应设 `bias=False`。BN 的 beta 已经承担了偏置的作用，卷积再加偏置只会浪费参数，还可能减慢收敛。

诊断：
```
[bias]
  convs with BN and bias=True: <count>
  recommended fix: set bias=False on those layers
```

### 4. 原地 ReLU 与 autograd

对将要与 shortcut 相加的张量使用 `nn.ReLU(inplace=True)`，会覆盖残差加法可能还要用到的值。标出所有在加法之前、后面没有接一个会产生新张量的层的 `inplace=True`。

诊断：
```
[in-place]
  risky inplace ops: <list>
  fix: inplace=False before the residual add
```

## 报告

```
[block-review]
  variant:       basic | bottleneck | preact | se | other
  shortcut:      ok | wrong | heavy
  activation:    ok | suspect
  bias-bn:       ok | <N> convs need bias=False
  in-place:      ok | <N> risky ops
  summary:       one sentence
```

## 规则

- 不要重写这个块。只做报告。
- 如果块是正确的，每项都写 `ok` 然后结束，不提建议。
- 如果有多处错误，按上面的顺序列出（shortcut 排第一，因为它是崩溃最常见的原因）。
- 用户已明确指定预激活或 squeeze-excite 变体时，绝不把这种有意为之的设计标为错误。
