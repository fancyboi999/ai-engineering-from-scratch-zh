---
id: bigram-beats-unigram
title: 训练最小的语言模型，让它超过基线
card: coding
kind: take-home
level: 3
roles: [applied-ai-engineer, ai-data-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, take-home]
tags: [training-loop, baseline, held-out-loss, bigram]
minutes: 30
lessons: [phases/19-capstone-projects/36-training-loop-eval]
manuals: []
practice: [train-char-bigram]
cheatsheet: [gpt-from-scratch-training, text-processing-classic]
related: [coding/loss-shift-flatten, coding/lr-peak-sweep]
updated: 2026-11-03
---

为一张下一个字符的 logits 表写训练循环：每个上下文字符占一行，每个下一个字符占一列。在固定的步数预算和带种子的随机数生成器下，用梯度下降在一段文本上训练它，直到它在留出集上的 NLL 低于一个忽略上下文的模型。再说明留出集检查必须是什么样子，这个比较才有意义。

## Short answer

构造字符对时，当前字符作上下文，后一个字符作目标；对每行算 log-softmax，在步数预算内对训练字符对上目标负对数概率的均值做梯度下降。留出集检查要在训练从未见过的固定切分上打分，二元模型和一元基线用同一个损失定义，只有模型的留出集数值低于基线才算通过。可复现性来自用调用方传入的生成器抽取初始表，而不是全局随机状态。

## Full answer

### 模型和循环

```python
def train(text, rng, steps, lr):
    pairs = [(ord(a), ord(b)) for a, b in zip(text, text[1:])]
    W = rng.normal(0, 1, (V, V))
    for _ in range(steps):
        logits = W[[a for a, _ in pairs]]
        logp = log_softmax(logits)
        grad = softmax(logits)
        grad[np.arange(len(pairs)), [b for _, b in pairs]] -= 1
        gW = np.zeros_like(W)
        np.add.at(gW, [a for a, _ in pairs], grad / len(pairs))
        W = W - lr * gW
    return W


def next_log_probs(W, context):
    return log_softmax(W[context])
```

字符对的方向决定了整个模型：上下文在前，目标在后。反过来，训练出的模型预测的是前一个字符；把每个下一个字符当作它自己的上下文，就学不到「什么后面跟什么」。

### 梯度的符号

更新时减去梯度。加上梯度会让损失上升，第一次评估就能看出来，这也是练习检查的第一个变异体。

### 留出集检查

循环课的规则是：评估在固定的留出切片上运行，不算梯度，数值必须能跨运行比较。放到这个任务里有三点。切分在训练前固定，循环从不碰它。一元基线不看上下文，给每个字符分配它在训练文本中的频率；它要在同一批留出字符上、用同一个损失定义打分。二元模型的留出集数值严格更低才算通过。在训练文本上赢、在留出文本上输的模型只是记住了训练文本。

### 预算

步数预算是契约的一部分。循环跑的步数超过预算，即使达到了目标也算失败；在真实训练里，这就是按计划完成的任务和超支任务的区别。

## Follow-ups

- **Level 3:** 打分函数为什么返回对数概率，而不是原始 logits？ Expected: 损失需要每行一个归一化分布；原始 logits 在不同上下文之间没法比较。
- **Level 3:** 模型在训练文本上胜过基线，在留出文本上输了。发生了什么？ Expected: 它记住了训练字符对；留出切分就是为了发现这种情况。
- **Level 4:** 这个玩具循环怎样对应课里的完整训练循环？ Expected: 构造字符对就是移一位，按行查表就是前向，留出集检查就是固定评估，预算就是调度的步数。

## Wrong answers

- "为了省时间，直接在训练文本上评估。" 这样比较的是记忆程度，和基线的比较没有意义。
- "从全局随机状态抽取初始表。" 同一个种子跑两次结果会不同，可复现性测试会失败。
- "一直训练到损失不再下降。" 预算是契约的一部分，不设上限的循环会掩盖跑得慢或卡住的训练。

## Taught in

[训练循环课](../../../phases/19-capstone-projects/36-training-loop-eval/)规定了留出集评估和损失对齐的规则，[字符二元模型练习](../../../practice/train-char-bigram/)在步数预算内训练这个最小的模型。
