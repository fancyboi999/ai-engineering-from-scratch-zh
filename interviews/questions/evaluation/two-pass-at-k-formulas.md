---
id: two-pass-at-k-formulas
title: 两个 harness，两个 pass@k 公式
card: evaluation
kind: code-reading
level: 3
roles: [ai-evaluation-reliability-engineer, agentic-ai-engineer, applied-ai-engineer]
rounds: [coding, ml-depth]
tags: [pass-at-k, estimator, code-exec, bias]
minutes: 10
lessons: [phases/19-capstone-projects/27-eval-harness-fixture-tasks, phases/19-capstone-projects/72-code-exec-metric]
manuals: []
practice: []
cheatsheet: [eval-driven-agents]
related: [evaluation/pass-at-k-reading]
updated: 2026-11-03
---

仓库里有两个 harness 计算 pass@k。第一个接收经验通过率 p，返回 `1 - (1 - p) ** k`。第二个接收样本数 n、通过数 c 和 k，返回 `1 - C(n - c, k) / C(n, k)`。读这两段代码。它们什么时候一致，什么时候不一致，报告里该用哪个？

## Short answer

第一个公式把每次抽取都看作成功概率为 p 的独立事件，是一个代入估计。第二个公式精确计算从你跑过的 n 个样本里抽 k 个、其中至少有一个通过的概率，它是代码生成基准使用的无偏估计量。只有 n 变得很大时两者才一致；对你实际跑过的样本，代入估计偏低、噪声更大，而且 k 超过 n 时它会外推。报告无偏的那个，并在旁边附上原始计数。

## Full answer

### 读第一个函数

```python
def pass_at_k(empirical_pass_rate, k):
    if k <= 0:
        return 0
    p = max(0, min(1, empirical_pass_rate))
    return 1 - (1 - p) ** k
```

它把 p 限制在单位区间内，并假设各次抽取独立。它接受任意 k，包括比 harness 实际跑的样本数还大的 k，所以它能从五个样本里打印出一个 pass@10。

### 读第二个函数

```python
def pass_at_k(n, c, k):
    if k > n:
        return float(c > 0)
    if n - c < k:
        return 1
    log_prob = 0
    for i in range(k):
        log_prob += math.log(n - c - i) - math.log(n - i)
    return 1 - math.exp(log_prob)
```

它拒绝外推：k 大于 n 时，它返回是否有任何样本通过；这是另一个量，应该另行标注。失败的样本少于 k 个时，任意 k 个样本的子集里都有一个通过的，所以它返回 1。其他情况下，它把无放回抽取的 k 次全都失败的概率乘起来，并在对数空间里计算，以避开很大的二项式系数。估计量那一层再对各任务的这个值取平均。

### 两者在哪里不同

取 k 等于 n。只要有一个样本通过，第二个就给出 1。第一个给出的值小于 1，因为它假想的是有放回抽取。一般来说，无放回抽取让 k 次全失败的可能性更小，所以在同样的 n 和 c 下，精确值大于或等于代入估计。代入估计还是有偏的，并且在 n 小时方差很大。

### 报告什么

每个任务跑 n 个样本，n 至少等于 k，比如综合项目里的例子：十个样本，算 pass@5。报告 pass@1（即 c 除以 n）、用无偏函数算出的 pass@k，以及原始计数。永远不要为没有采够样本的 k 打印 pass@k。

## Follow-ups

- **Level 3:** 第二个函数里，n 减 c 小于 k 时为什么返回 1？ Expected: 失败样本不足 k 个，就不可能挑出 k 个失败样本，所以每个 k 子集都包含一个通过的样本。
- **Level 3:** 为什么在对数空间里算这个乘积？ Expected: n 不大时二项式系数就会溢出；比值取对数后只是几项对数的和。
- **Level 4:** 一个团队每个任务跑了五个样本，报告了 pass@10。哪里错了？ Expected: k 超过了 n，所以什么都没测到；第二个函数退回到是否有样本通过，第一个则在外推。
- **Level 4:** 两个函数在 pass@1 上一致吗？ Expected: 一致；k 为 1 时两者都化简为 c 除以 n。

## Wrong answers

- "它们是同一个公式。" 只有 n 变大时两者才一致；对你实际跑过的样本，代入估计偏低、噪声更大。
- "pass@k 就是 agent 答对的概率。" 它是 k 个样本中至少有一个通过的概率；没有挑选器时，用户拿到的仍然只是一个样本。
- "每个任务多跑几个样本，pass@1 就会提高。" 多跑只会让估计更精确；这个值本身是单个样本的通过率。

## Taught in

[评测 harness 综合项目](../../../phases/19-capstone-projects/27-eval-harness-fixture-tasks/)用的是独立性公式，[代码执行指标综合项目](../../../phases/19-capstone-projects/72-code-exec-metric/)给出了无偏估计量及其边界情况。
