---
name: skill-conv-shape-calculator
description: 逐层走查 CNN 配置，报告每个块的输出形状、感受野和参数量
version: 1.0.0
phase: 4
lesson: 2
tags: [computer-vision, cnn, architecture, debugging]
---

# 卷积形状计算器

一个用于规划或调试 CNN 的确定性工具。给定输入形状和一组层配置，不运行模型就能追踪出形状、感受野和参数量。

## 何时使用

- 设计新的 CNN，想确认每次下采样都落在整齐的尺寸上。
- 读论文时，把论文里的结构表翻译成代码。
- 预训练骨干网络在分类头处因形状不匹配而崩溃，你需要知道是哪一层改变了空间尺寸。
- 训练之前比较两个骨干网络的参数效率。

## 输入

- `input_shape`：`(C, H, W)`。
- `layers`：有序的层字典列表。每个字典支持：
  - `{type: "conv", c_out, k, s, p, groups=1, bias=true}`
  - `{type: "pool", mode: "max"|"avg", k, s, p=0}`
  - `{type: "adaptive_pool", out_h, out_w}`
  - `{type: "flatten"}`
  - `{type: "linear", out_features, bias=true}`

## 步骤

1. **初始化追踪状态**：`(C, H, W)`，感受野 `1`，有效步长 `1`，累计参数 `0`。

2. **对每一层**，按以下顺序更新：
   - 计算 `C_out`（conv/linear），或沿用 `C_in`（pool）。
   - 计算空间输出：conv 和 pool 用 `(H + 2P - K) / S + 1`，adaptive pool 用 `out_h/out_w`，flatten 用 `(1, 1)`（接 linear 之前的输出形状为 `(C * H * W, 1, 1)`），linear 则为标量 `1x1`。
   - 更新感受野和有效步长：
     - Conv/pool：`RF_new = RF_old + (K - 1) * effective_stride`，`effective_stride *= S`。
     - Adaptive pool：视为有效步长 `S = H_in / out_h`（向下取整）的池化。`RF_new = RF_old + (H_in - 1) * effective_stride_old`；`effective_stride *= S`。注意 adaptive pool 的感受野等于上一层的完整空间范围。
     - Flatten / linear：感受野和有效步长已无意义；冻结为 flatten 之前的值，后续行中省略。
   - 计算参数量：
     - Conv：`C_out * (C_in / groups) * K * K + (C_out if bias else 0)`。
     - Linear：`out_features * in_features + (out_features if bias else 0)`。
     - Pool 和 flatten：0。

3. **发现问题**并标出：
   - 输出尺寸不是整数（步长/填充没对齐）。
   - 还没到最后一层，`H_out <= 0` 就出现了。
   - 感受野超过输入尺寸（从该层开始可能在浪费算力）。
   - 每层参数量突然跳升 10 倍，说明通道规划可能有误。

4. **报告**为一张表格：

```
idx  layer                C_in  C_out  K  S  P  H_out  W_out  RF    params     cum_params
1    conv 3x3 s=1 p=1     3     32     3  1  1  224    224    3     896        896
2    conv 3x3 s=2 p=1     32    64     3  2  1  112    112    7     18,496     19,392
3    pool max 2x2         64    64     2  2  0  56     56     11    0          19,392
...
```

5. **汇总行**：最终 `(C, H, W)`、最终感受野、总参数量、警告。

## 规则

- 空间尺寸一律返回整数。如果公式算出非整数，标为错误，不要悄悄向下取整。
- 当 `groups > 1` 时，核实 `C_in % groups == 0` 且 `C_out % groups == 0`；否则报错。
- 对 depthwise 卷积（`groups == C_in`），在 `layer` 列中标注出来，让读者明白为什么参数量这么低。
- 如果用户提供了 BatchNorm 或激活层，计算形状时忽略它们，但参数量要计入（每个 BatchNorm `2 * C`）。
- 缺失字段绝不猜默认值。每个 conv 和 pool 都必须给出 `k`、`s`、`p`。
