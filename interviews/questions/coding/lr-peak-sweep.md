---
id: lr-peak-sweep
title: 扫描峰值学习率并标出发散
card: coding
kind: take-home
level: 3
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, take-home]
tags: [learning-rate, sweep, divergence, schedule]
minutes: 25
lessons: [phases/19-capstone-projects/44-cosine-lr-warmup]
manuals: []
practice: [lab-learning-rate-sweep]
cheatsheet: [optimizers-schedules]
related: [coding/adamw-decoupled-decay]
updated: 2026-11-03
---

在一次长训练之前，你要为预热加余弦的调度选定峰值学习率。写一个扫描：在每个候选学习率上训练一个带种子的小模型，判断哪些运行发散了，选出最好的稳定学习率，并报告发散的最小学习率。用代码说明「发散」是什么意思。

## Short answer

每个候选学习率跑一次同样带种子的训练循环，记录最终损失和损失历史。最终损失不是有限值，或者损失在运行过程中上升了，这次运行就算发散，不只是变成 NaN 才算。最好的学习率是稳定运行中最终损失最低的那个，平局时取较小的；发散的最小学习率作为上限报告，因为它限定了峰值最高能到哪里。

## Full answer

### 为什么先定峰值

调度课的建议是先扫峰值，再管别的，因为峰值是最敏感的旋钮，它的最优值随模型规模变化很弱。在小模型上扫出的结果，对大模型训练是很强的先验。预热比例和下限没那么重要，放在后面调。

### 扫描

```python
def is_diverged(losses):
    final = losses[-1]
    return not np.isfinite(final) or final > losses[0]


def run_sweep(rates, train_fn, seed):
    results = {}
    for lr in rates:
        losses = train_fn(lr, seed)
        results[lr] = (losses[-1], is_diverged(losses))
    return results


def best_lr(results):
    stable = [(loss, lr) for lr, (loss, div) in results.items() if not div]
    return min(stable)[1] if stable else None


def smallest_diverging_lr(results):
    div = [lr for lr, (_, d) in results.items() if d]
    return min(div) if div else None
```

每次运行用同一个种子，这样运行之间唯一的差别就是学习率。结果以学习率为键，发散过滤要在任何 argmin 之前做，因为 NaN 的最终损失既不比别人大也不比别人小，不过滤就可能被选中。所有运行都发散时，`best_lr` 返回 `None`，网格必须往低处移。

### 发散是什么意思

损失最后是有限值，但比开始时高，也算发散。一次运行可能整个扫描期间都在上升，最后仍然返回一个数。只检查非有限值，会把这次运行标成稳定，扫描就会推荐一个在预热结束后让长训练爆掉的学习率。

### 怎样读结果

调度在预热结束时到达峰值，然后向下限衰减。紧贴最小发散学习率的峰值很激进；比它低一些、留出余量的峰值能扛住最初几步噪声很大的梯度范数。在选定的运行上，把梯度范数和学习率一起记录：调得好的预热，范数会随学习率上升然后稳定；峰值太高时，预热结束后范数仍然居高不下。

## Follow-ups

- **Level 3:** 两个学习率的最终损失相同。你选哪个？ Expected: 较小的那个；它离发散上限的余量更大。
- **Level 3:** 练习为什么把第一个发散学习率和二除以损失的最大曲率作比较？ Expected: 对二次损失，梯度下降只有在这个界限以下才稳定，所以测出的上限应该落在它附近；不一致说明扫描有 bug。
- **Level 4:** 预热设成了绝对步数。为什么短运行上的扫描会误导长运行？ Expected: 同样的步数在长运行里占的比例小得多，长运行几乎立刻就到了峰值；预热应该设成总步数的一个比例。

## Wrong answers

- "在所有运行里选损失最低的学习率。" 必须先过滤掉 NaN 和上升的运行，否则 argmin 可能返回一个发散的学习率。
- "只有损失变成 NaN 或无穷大才算发散。" 运行过程中上升的有限损失也是发散，长运行同样会出现。
- "先扫预热长度，因为它保护训练开头。" 峰值才是最敏感的旋钮；预热比例在它之后调。

## Taught in

[余弦调度课](../../../phases/19-capstone-projects/44-cosine-lr-warmup/)要求先扫峰值，并在学习率旁记录梯度范数，[学习率扫描实验](../../../practice/lab-learning-rate-sweep/)实现了带发散规则的扫描。
