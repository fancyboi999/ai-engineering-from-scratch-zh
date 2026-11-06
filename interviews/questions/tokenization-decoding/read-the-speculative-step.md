---
id: read-the-speculative-step
title: 读懂一步推测解码，逐行说明理由
card: tokenization-decoding
kind: code-reading
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [coding, ml-depth]
tags: [speculative-decoding, rejection-sampling, residual-distribution, bonus-token, code-reading]
minutes: 12
lessons: [phases/07-transformers-deep-dive/16-speculative-decoding, phases/10-llms-from-scratch/25-speculative-decoding]
manuals: []
practice: [speculative-decoding-acceptance]
cheatsheet: [speculative-decoding]
related: []
updated: 2026-11-03
---

阅读课程里这段简化的推测解码单步代码。`q_model` 是验证器，`p_model` 是草稿；给定前缀，两者都返回下一个 token 的概率向量。

```python
def spec_step(prefix, q_model, p_model, N, rng):
    drafts, p_probs = [], []
    ctx = list(prefix)
    for _ in range(N):
        p_dist = p_model(ctx)
        d = sample(p_dist, rng)
        drafts.append(d)
        p_probs.append(p_dist[d])
        ctx.append(d)

    q_dists = [q_model(prefix + drafts[:i]) for i in range(N + 1)]

    for i, d in enumerate(drafts):
        u = rng.random()
        if u < min(1.0, q_dists[i][d] / p_probs[i]):
            prefix = prefix + [d]
        else:
            res = residual_dist(q_dists[i], p_model(prefix))
            prefix = prefix + [sample(res, rng)]
            return prefix
    return prefix + [sample(q_dists[N], rng)]
```

为什么 `q_dists` 有 N 加 1 项？第一个草稿 token 没通过检验时会怎样？残差为什么用 `p_model(prefix)`，而不用 `p_probs[i]`？

## Short answer

验证器在每个草稿位置给出一个分布，再多给一个，共 N 加 1 个，因为草稿全部被接受时，多出的这个分布能免费产出一个额外 token，不增加验证器开销。在位置 i 第一次被拒时，代码从残差分布中采样，残差是验证器分布减去草稿分布后的正数部分，再重新归一化；追加这个 token 后直接返回，之后的草稿全部丢弃。残差需要草稿在这个位置的完整分布，也就是一个向量，而 `p_probs[i]` 只存了被起草 token 的那一个标量概率。

## Full answer

### 这条规则为什么是精确的

以概率 `min(1, q(d) / p(d))` 接受草稿 token，否则从截断到零并重新归一化的 `(q - p)` 中采样，得到的样本分布与 q 完全相同。不管 p 有多差，这个定理都成立：差的草稿只会被拒得更多，输出分布不会动。这是这种方法能进生产的唯一理由。它是一项延迟优化，不拿质量做交换。

### 为什么有 N 加 1 个验证器分布

验证器在前缀加前 i 个草稿上被查询，i 从 0 到 N。前 N 个分布用来评判草稿。最后一个是验证器在全部 N 个草稿之后自己的下一个 token 分布；如果全部被接受，它就是白送的，这一步用一次验证器前向产出 N 加 1 个 token。在这段简化代码里，N 加 1 次调用代表的是对前缀加草稿做的一次批量前向。

### 拒绝分支

第一次拒绝后立即返回。它之后的位置是在一个已知错误的上下文上起草的，所以那些位置的验证器分布不属于正在生成的序列。每一步至少产出一个 token，即残差采样的那个，至多产出 N 加 1 个。

### 残差需要向量

`residual_dist(q, p)` 把两个分布逐元素相减，负数截成零，再重新归一化。`p_probs[i]` 只是一个数，即草稿给被起草 token 的概率，够做接受检验，不够算残差。调用 `p_model(prefix)` 重新计算草稿在被修正位置上的完整分布；真实实现里，会把起草循环中的草稿分布留下来，而不是重算。

### 贪心情形

温度为零时，规则退化为一次比较：草稿 token 等于验证器的 argmax 就接受，否则输出 argmax 并停止。

### 怎么测

把这一步跑 10,000 次，把产出 token 的直方图与直接从 q 采样的结果比较；卡方检验在采样误差范围内能通过。然后把 p 往远离 q 的方向扰动，接受率会下降，直方图保持不变。

## Follow-ups

- **Level 3:** `p_probs[i]` 为零，代码却在除以它。这会发生吗？ Expected: 不会，这个 token 是从 p 里采样的，所以概率为正；生产版本仍然会保护这次除法，p 为零时直接接受。
- **Level 3:** `residual_dist` 什么时候会除以零，这时应该返回什么？ Expected: q 在任何位置都不大于 p 时，这意味着两者相等；直接返回 q。
- **Level 4:** 一次批量的验证器前向，对验证器保存的 key 和 value 有什么影响？ Expected: 会追加 N 个条目；在位置 j 被拒时，必须把逻辑长度回滚到已接受前缀加修正 token。
- **Level 4:** 一步最少和最多产出几个 token？ Expected: 最少一个，即立刻被拒时的残差样本；最多 N 加 1 个，即所有草稿被接受且采样了额外 token 时。

## Wrong answers

- "验证器给的概率高于某个阈值，就接受草稿。" 阈值会改变输出分布；能保持精确的，是比值检验加残差。
- "被拒时，从验证器在这个位置的分布里重新采样。" 这会过度加权草稿已经偏好的 token；残差恰好去掉的就是这部分概率质量。
- "保险起见，把额外 token 扔掉。" 它是从验证器自己的分布里采的样，不花任何成本；扔掉它，每一步都浪费一个 token。

## Taught in

[推测解码课程](../../../phases/07-transformers-deep-dive/16-speculative-decoding/)给出了这一步和分布检验，[阶段 10 推测解码课程](../../../phases/10-llms-from-scratch/25-speculative-decoding/)讲了贪心情形和拒绝规则。
