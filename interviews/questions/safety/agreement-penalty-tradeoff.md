---
id: agreement-penalty-tradeoff
title: 附和该罚多重
card: safety
kind: tradeoff
level: 2
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [ml-depth, design-review]
tags: [sycophancy, reward-shaping, pareto, calibration]
minutes: 8
lessons: [phases/18-ethics-safety-alignment/04-sycophancy-rlhf-amplification]
manuals: []
practice: []
cheatsheet: [alignment-training]
related: [safety/sycophancy-is-the-loss]
updated: 2026-11-03
---

训练时，可以从奖励里减去一个附和分数，以降低阿谀奉承。对齐负责人想把惩罚权重调到最高。权重高了要付出什么代价？你怎么选权重？又怎么证明你选对了？

## Short answer

这个修正先将分类器给出的附和分数乘以权重，再从奖励中减去。在课程的扫参实验里，权重在 0.3 到 0.5 左右时，阿谀奉承降到接近基座模型的水平；权重再高，模型会对正确的说法唱反调。权重要从配对测试集上“正确回答率对阿谀率”的前沿曲线里选，扫参时还要盯住校准度。

## Full answer

### 修正公式

```text
r'(x, y) = r(x, y) - alpha * agree(x, y)
```

附和项来自一个辅助分类器。它只判断补全是否认同 prompt 中陈述的前提，不管前提是否为真。权重 alpha 决定附和要付出多少代价。

### 为什么存在权衡

附和一个说对的用户，和附和一个说错的用户，表面上看起来一样。对附和的惩罚会同时打到这两种情况。所有针对阿谀奉承的缓解手段都要拿有益的认同来付账，因为两者共享表面特征。这是权衡，不是修复。

### 怎么选权重

对 alpha 扫参。每个取值都在配对样本上测正确回答率和阿谀率：同一个说法，分别表述成用户自己的观点和第三方的观点，并各做一个说法为真、一个说法为假的版本。画出前沿曲线，选产品能接受的那个点。课程的玩具环境同时开放了 KL 权重和 alpha 两个旋钮，正式训练前就能看到曲线的形状。

### 怎么证明有效

报告两种表述之间的附和率差值，并给出置信区间。区间要用足够多的配对样本来估计，样本量取决于你选的显著性水平。报告“说法为真”变体上的正确回答率，代价就体现在这里。还要报告校准度：阿谀奉承训练会把校准度搞垮，有效的修正应让它向中立基线回升。

## Follow-ups

- **Level 2:** 附和分类器测的是什么？ Expected: 补全是否认同 prompt 中陈述的前提，与前提真假无关。
- **Level 2:** 这种权衡为什么会存在？ Expected: 认同说对的用户和认同说错的用户在表面上一样，所以对附和的惩罚会同时打到两者。
- **Level 3:** 为这次扫参设计测试集。 Expected: 配对样本，同一说法分别表述为用户观点和第三方观点，覆盖为真和为假两种变体，样本量足以给差值算出置信区间。
- **Level 3:** 扫参时还要盯什么？ Expected: 校准度；造成阿谀奉承的那次训练把它搞垮了，修正应让它向中立基线回升。

## Wrong answers

- "把权重调到最高。" 模型会对正确的说法唱反调；有益的认同和阿谀奉承一起没了。
- "这个惩罚能消除阿谀奉承。" 权重合适时，它把阿谀率降到接近基座模型的水平；而基座模型本身也不是零。
- "认同总是坏事。" 认同说对的用户才是有帮助的；目标是用户说错时表示反对。

## Taught in

[阿谀奉承这一课](../../../phases/18-ethics-safety-alignment/04-sycophancy-rlhf-amplification/)提出了附和惩罚，并点明了它的权衡。
