---
name: skill-image-tensor-inspector
description: 检查任意图像形状的张量或数组，报告 dtype、布局、取值范围，并判断它是原始值、归一化还是标准化后的数据
version: 1.0.0
phase: 4
lesson: 1
tags: [computer-vision, debugging, preprocessing, tensors]
---

# 图像张量检查器

一个诊断用的 skill。在视觉流水线的任何环节，只要你手上有一个图像形状的数组，需要确切知道它处于什么状态，就可以用它。

## 何时使用

- 预训练模型输出一堆乱七八糟的预测，你怀疑是预处理的问题。
- 在 OpenCV 和 torchvision 之间迁移流水线，搞不清通道顺序。
- 把多个框架的层堆在一起，batch 轴总是出现在错误的位置。
- 调试训练循环时，损失一直卡在 `log(num_classes)`。

## 输入

- `x`：任意 2 维、3 维或 4 维的类数组对象（NumPy、PyTorch、JAX）。
- 可选的 `expected`：一个用于比对的不变量字典，例如 `{"layout": "CHW", "range": "standardized"}`。

## 步骤

1. **识别后端**：判断 `x` 是 NumPy、Torch 还是 JAX。转换成 NumPy 用于检查，但不改动原对象。

2. **按维数分类**：
   - 2 维 -> 单通道图像 (H, W)。
   - 3 维 -> 如果最后一个轴是 1、3 或 4，且严格小于另外两个轴，判为 `HWC`；否则判为 `CHW`。
   - 4 维 -> 如果轴 1 属于 {1, 3, 4}，**并且**轴 2 或轴 3 大于 16，优先判为 `NCHW`；否则优先判为 `NHWC`。只看轴 1 会把 `(3, 4, 224, 3)` 这类小图 NHWC batch 判错。
   - 有歧义的情况（例如 `(1, 3, 3, 3)`）一律标记为 `ambiguous`，不要猜；要求调用方提供 `expected`。

3. **按 dtype 和取值范围分类**：
   - `uint8` 且在 [0, 255] 内 -> `raw`。
   - `float*` 且 min >= 0、max <= 1.01 -> `normalized`。
   - `float*` 且 min < 0、|mean| < 0.5、0.5 <= std <= 1.5 -> `standardized`。
   - 其他情况 -> `unusual`，打印直方图。

4. **逐通道统计**：报告每个通道的均值和标准差。如果数组看起来已标准化，与 ImageNet 的均值/标准差比对，并给出匹配置信度。

5. **报告**，严格使用以下格式：

```
[inspector]
  backend:   numpy | torch | jax
  rank:      2 | 3 | 4
  layout:    HW | HWC | CHW | NHWC | NCHW
  dtype:     <dtype>
  shape:     <shape>
  range:     raw | normalized | standardized | unusual
  min/max:   <min> / <max>
  per-channel mean: [ ... ]
  per-channel std:  [ ... ]
  likely source:    camera | PIL | OpenCV | torchvision | random init
  likely target:    display | training | inference
```

6. **根据 `likely target` 推荐下一步操作**：
   - `display`：转置为 HWC，截断取值，转换为 uint8。
   - `training`：用数据集统计量做标准化，转置为 CHW，加上 batch 轴。
   - `inference`：严格对齐模型卡中的不变量。

## 规则

- 绝不修改输入。只打印诊断信息。
- 如果提供了 `expected`，用 `[expected X got Y]` 标出每一处不匹配。
- 布局或通道顺序有歧义时，指出静默失败的风险。
- 一次只推荐一个操作，不要列一串选项。
