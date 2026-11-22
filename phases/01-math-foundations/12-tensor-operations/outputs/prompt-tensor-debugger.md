---
name: prompt-tensor-debugger
description: 逐步排查深度学习代码中张量形状错误的调试 prompt
phase: 1
lesson: 12
---

我的深度学习代码里有一个张量形状错误，请帮我修好。

**报错信息：** [在此粘贴报错]

**我的张量形状：**
- [名称]：[形状]
- [名称]：[形状]

**我想做的运算：** [描述该运算]

---

调试时，严格按以下流程进行：

**第 1 步：确定运算类型。**
是哪个运算报的错？把它归入以下某一类：
- 矩阵乘法 / Linear 层（内侧维度必须匹配）
- 广播（从右对齐，每一维必须相等或为 1）
- 拼接（除拼接维度外，其余维度都要匹配）
- 卷积（要求特定的秩和通道位置）
- reshape（元素总数必须保持不变）

**第 2 步：写出形状约定。**
针对确定的运算，明确写出期望的形状：
```
matmul(A, B): A is (..., m, k), B is (..., k, n) -> (..., m, n)
broadcast(A, B): align right, each pair must be (equal) or (one is 1)
cat([A, B], dim=d): all dims match except dim d
Linear(in_f, out_f): input last dim must equal in_f
Conv2d(in_c, out_c, k): input must be (B, in_c, H, W)
```

**第 3 步：找到不匹配处。**
把实际形状与约定对比，找出违反规则的具体维度。

**第 4 步：选择最小修复。**
从下表中选：

| 症状 | 修复 |
|---|---|
| 缺少 batch 维度 | `.unsqueeze(0)` |
| 缺少通道维度 | `.unsqueeze(1)` |
| 多出一个大小为 1 的维度 | `.squeeze(dim)` |
| matmul 内侧维度不对 | `.transpose(-1, -2)` 或检查权重形状 |
| 需要把 NHWC 转成 NCHW | `.permute(0, 3, 1, 2)` |
| 需要把 NCHW 转成 NHWC | `.permute(0, 2, 3, 1)` |
| 为 Linear 层展平空间维度 | `.flatten(1)` 或 `.reshape(B, -1)` |
| 拆分注意力头：(B,T,D) 到 (B,H,T,D/H) | `.reshape(B, T, H, D//H).transpose(1, 2)` |
| 合并注意力头：(B,H,T,D/H) 到 (B,T,D) | `.transpose(1, 2).reshape(B, T, H*(D//H))` |
| 对非连续张量调用 .view() | `.contiguous().view(...)` 或改用 `.reshape(...)` |

**第 5 步：验证修复。**
展示每一步的结果形状。确认每次 reshape 前后元素总数不变。确认运算的形状约定现在已经满足。

**第 6 步：检查静默 bug。**
即使形状对上了，也要确认：
- 广播发生在预期的轴上（而不是碰巧对上）
- 归约是在正确的维度上求和
- batch 维度（第 0 维）在整个前向传播中都保留着
- 维度顺序要紧时，用的是 transpose + reshape（而不只是 reshape）

按以下格式回答：
```
OPERATION: [what operation failed]
EXPECTED: [shape contract]
ACTUAL: [what shapes were provided]
MISMATCH: [which dimension, why]
FIX: [exact code]
RESULT: [shapes after fix]
```
