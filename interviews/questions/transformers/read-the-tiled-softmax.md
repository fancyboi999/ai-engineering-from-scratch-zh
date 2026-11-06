---
id: read-the-tiled-softmax
title: 读懂滑动 softmax，找出脆弱的那一行
card: transformers
kind: code-reading
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [coding, ml-depth]
tags: [flash-attention, online-softmax, running-max, numerical-stability, code-reading]
minutes: 12
lessons: [phases/07-transformers-deep-dive/12-kv-cache-flash-attention]
manuals: []
practice: [flash-attention-online-softmax]
cheatsheet: [attention-variants]
related: [transformers/flash-attention-is-exact]
updated: 2026-11-03
---

读一下课程里的这个函数。它把键和值按每块四个分块，计算一个查询的注意力输出。

```python
def tiled_softmax_dot(q, K, V, tile=4):
    m = float("-inf")
    s = 0.0
    out = [0.0] * len(V[0])
    for start in range(0, len(K), tile):
        k_block = K[start:start + tile]
        v_block = V[start:start + tile]
        scores = [sum(qi * ki for qi, ki in zip(q, k)) for k in k_block]
        new_m = max(m, *scores)
        exp_old = math.exp(m - new_m) if m != float("-inf") else 0.0
        exp_new = [math.exp(sc - new_m) for sc in scores]
        s = s * exp_old + sum(exp_new)
        for j in range(len(out)):
            out[j] = out[j] * exp_old + sum(e * v[j] for e, v in zip(exp_new, v_block))
        m = new_m
    return [o / s for o in out]
```

解释 `exp_old` 的作用，论证结果等于一次性计算的 `softmax(qK^T) V`，并指出哪种输入会让这段代码产生 NaN。

## Short answer

循环维护到目前为止所见各块的滑动最大值 `m` 和滑动和 `s`。某个块抬高了最大值时，`exp_old` 是旧最大值减新最大值的指数，它重新缩放总和与部分输出，让之前的每一项都以新的最大值为基准；没有抬高最大值的块，`exp_old` 为 1。最后，每个权重都是它的分数减全局最大值后的指数，再除以全局和，这正是数值稳定的 softmax。脆弱的输入是第一个块的分数全为负无穷，完全被 mask 的块就是这样：`new_m` 仍是负无穷，`exp_new` 计算的是负无穷减负无穷，结果是 NaN。

## Full answer

### 不变量

每处理完一个块，`out` 保存的是目前所见所有键上 `exp(score - m) * v` 的和，`s` 保存的是 `exp(score - m)` 的和，两者都以当前的 `m` 为基准。让重新缩放成立的恒等式是

```text
exp(score - m_new) = exp(score - m_old) * exp(m_old - m_new)
```

所以把旧的累加器乘以 `exp(m_old - m_new)`，就能把它们挪到新的基准点，而不用再碰任何一个单独的分数。第一个块没有旧基准，所以 `m` 仍是负无穷时 `exp_old` 为零：空的累加器不贡献任何东西。

### 最后的除法为什么精确

除以 `s` 只在最后做一次，此时每个指数里用的都是全局最大值。这就是对整行做数值稳定 softmax 的定义，只是计算过程中从未持有整行。工作集是一块键和值，外加一个输出向量。真实的 kernel 按查询块来做这件事，键和值的块流经片上内存，每个输出块只写一次。

### NaN

因果 kernel 会跳过完全位于对角线上方的块；如果 kernel 靠把分数设成负无穷来施加 mask，就必须防住块里所有分数都是负无穷的情况。这时 `max(-inf, -inf, ...)` 是负无穷，而 `exp(-inf - (-inf))` 是 NaN，随后污染 `s` 和 `out`。防护方法：跳过最大值为负无穷的块，或者在计算 `exp_new` 之前检查 `new_m`。

### 评审要测什么

1. 在随机输入上，与一次性 softmax 在浮点容差内相等。
2. 第二个块的分数全都低于第一个块的最大值，覆盖 `exp_old` 等于 1 的缩放路径。
3. 某个块的分数全都更高，使 `exp_old` 小于 1，之前的项随之缩小。
4. 第一个块完全被 mask，不能产生 NaN。

## Follow-ups

- **Level 3:** 更小的块有什么代价，换来什么？ Expected: 缩放步骤更多、循环开销更大，换来更小的片上工作集；真实的 kernel 按片上内存的容量选块大小。
- **Level 3:** 为什么第一个块的 `exp_old` 设为零而不是一？ Expected: 没有之前的项需要继承；累加器是空的，而且对有限的 `new_m`，`exp(-inf - new_m)` 本来也是零。
- **Level 4:** 在生产 kernel 中，因果 mask 怎样改变这个循环？ Expected: 完全位于对角线上方的块直接跳过而不是施加 mask，部分被遮住的块在取最大值之前逐项设为负无穷。
- **Level 4:** 反向传播从哪里拿到它需要的 softmax 值？ Expected: 根据存下的每行最大值和每行总和重新计算，而不是存下 N 乘 N 矩阵。

## Wrong answers

- "`exp_old` 是一个类似学习率的衰减因子。" 它是精确的基准点变换；输出和一次性公式完全相同。
- "可以把分数存下来，最后再归一化。" 那样就存下了整行，而 kernel 存在的意义正是避免这份显存开销。
- "每个块应该用它自己的和来归一化。" 按块归一化会破坏全局 softmax；只有最后那一次除法是对的。

## Taught in

[KV cache 与 Flash Attention 一课](../../../phases/07-transformers-deep-dive/12-kv-cache-flash-attention/)在分块 softmax 的构建步骤里给出了这个函数。
