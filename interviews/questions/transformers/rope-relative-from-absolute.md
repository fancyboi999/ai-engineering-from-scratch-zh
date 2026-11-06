---
id: rope-relative-from-absolute
title: 绝对的角度，相对的距离
card: transformers
kind: concept
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [ml-depth, coding]
tags: [rope, positional-encoding, relative-position, rotation]
minutes: 8
lessons: [phases/07-transformers-deep-dive/04-positional-encoding]
manuals: []
practice: [rope]
cheatsheet: [positional-encoding]
related: [transformers/permutation-blind-attention]
updated: 2026-11-03
---

旋转编码把每个查询和每个键都旋转一个角度，这个角度与 token 的绝对位置成正比。可大家都说它编码的是相对位置。请解开这个表面上的矛盾，并说出你会写哪一个单元测试来证明这个性质。

## Short answer

旋转作用在一对对坐标上，角度是 `pos * theta_i`。位置 m 的查询遇到位置 n 的键时，每一对坐标上的点积都会带上 `cos((m - n) * theta_i)`，所以只剩下间距，两个绝对位置互相抵消。测试方法：把两个随机向量放在位置 (a, b) 旋转一次，再放在 (a + k, b + k) 旋转一次，断言两次的点积在浮点误差内一致。

## Full answer

### 旋转

对宽度为 `d_head` 的头里的每一对维度 (2i, 2i + 1)：

```python
def apply_rope(x, pos, base=10000):
    d = len(x)
    out = list(x)
    for i in range(d // 2):
        theta = pos / (base ** (2 * i / d))
        c, s = math.cos(theta), math.sin(theta)
        a, b = x[2 * i], x[2 * i + 1]
        out[2 * i]     = a * c - b * s
        out[2 * i + 1] = a * s + b * c
    return out
```

每一对坐标是平面上的一个点，旋转把它转过 `pos * theta_i`。i 小的转得快，i 大的转得慢，因为 `theta_i = base ** (-2i / d_head)`。

### 点积为什么只看到间距

把一个向量旋转 alpha 角，再和另一个旋转了 beta 角的向量做点积，等于把两个原始向量相对旋转 `alpha - beta` 后的点积。对位置 m 的 Q 和位置 n 的 K 用同一个函数，每一对坐标贡献的因子都只取决于 `(m - n) * theta_i`。尽管旋转是按绝对位置来定的，分数却只取决于距离。注意力白得了相对位置，不需要表，也不需要参数。

### 作用在哪里

旋转作用在投影之后、计算分数的矩阵乘法之前的 Q 和 K 上。它从不碰 V，因为值携带的是内容，不该随位置旋转；它也从不碰输入 embedding。

### 它为什么胜出

它不改架构就能插进注意力里。它的 `base` 是一个干净的旋钮：缩放它，模型就能到达更长的上下文，有一个模型家族就是这样用 NTK-aware 插值和 YaRN 这类缩放方案，从 8K 扩到了 128K 上下文。

### 单元测试

```text
a, b = random vectors of width d_head
s1 = dot(apply_rope(a, pos_a), apply_rope(b, pos_b))
s2 = dot(apply_rope(a, pos_a + k), apply_rope(b, pos_b + k))
assert abs(s1 - s2) < tolerance
```

这个性质就是这个方法的全部意义。如果测试失败，说明旋转只用在了一侧，或者两侧用了不同的坐标配对或角度。测试通过并不能证明配对和角度与参考实现一致：一致地配错也能通过，所以还要拿一个旋转后的向量和手算的值比一比。

## Follow-ups

- **Level 2:** 为什么旋转 Q 和 K，而不旋转 V？ Expected: 位置应该影响 token 之间的匹配，而不该影响 token 被选中后返回的内容。
- **Level 3:** 遇到训练中没见过的位置会怎样？ Expected: 转得快的坐标对达到模型从没学过怎么读的角度；缩放基数或对位置插值，能把它们拉回训练过的范围。
- **Level 3:** 线性偏置注意力不用旋转，怎么得到相对位置？ Expected: 它给分数加上一个与 `|i - j|` 成正比的惩罚，每个头一个斜率。
- **Level 4:** 为什么增大基数对更长的上下文有帮助？ Expected: 更大的基数会降低除第一对以外的所有频率，第一对始终是每个位置转一弧度，所以上下文变长时，高频的坐标对不会被挤进没见过的角度；NTK-aware 规则按扩展倍数的 `d / (d - 2)` 次方缩放基数。

## Wrong answers

- "RoPE 把位置向量加到 embedding 上。" 它在注意力内部旋转查询和键；embedding 没被碰过。
- "RoPE 需要一张最大长度乘宽度的表。" 角度来自公式；没有表，也没有参数。
- "只旋转键，省一半工作量。" 那样分数会依赖键的绝对位置，相对性质就没了。

## Taught in

[位置编码一课](../../../phases/07-transformers-deep-dive/04-positional-encoding/)推导了旋转，并把相对距离检查作为一个构建步骤。
