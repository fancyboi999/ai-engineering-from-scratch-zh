---
id: read-split-and-combine-heads
title: 一个 reshape 是对的，另一个打乱了各个头
card: transformers
kind: code-reading
level: 2
roles: [applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [coding, ml-depth]
tags: [multi-head-attention, reshape, transpose, shapes, code-reading]
minutes: 8
lessons: [phases/07-transformers-deep-dive/03-multi-head-attention, phases/19-capstone-projects/33-multihead-self-attention]
manuals: []
practice: [multi-head-split-merge]
cheatsheet: [transformers-attention]
related: [transformers/heads-are-nearly-free]
updated: 2026-11-03
---

评审时收到两个版本的切头代码。`X` 的形状是 `(n, d)`，有 `n` 个 token、`d` 个特征。

```python
def split_a(X, n_heads):
    n, d = X.shape
    d_head = d // n_heads
    return X.reshape(n, n_heads, d_head).transpose(1, 0, 2)

def split_b(X, n_heads):
    n, d = X.shape
    d_head = d // n_heads
    return X.reshape(n_heads, n, d_head)
```

两者都返回形状为 `(n_heads, n, d_head)` 的张量，运行都不报错。哪个是对的？另一个对数据做了什么？什么测试能发现它？

## Short answer

第一个版本是对的：`split_a` 把每个 token 的 `d` 个特征分成 `n_heads` 段，每段宽 `d_head`，再把头这一轴移到最前面。`split_b` 用错误的顺序读取同一块内存：它把扁平的缓冲区切成 `n_heads` 等份，把每一份叫作一个头，于是一个头里装的是连续的若干个 token，一份可能在某个 token 中间断开，各列也不再和产生它们的投影对齐。测试方法是往返测试：把切好的头再合并，必须精确还原 `X`，而且第 `h` 个头必须等于列切片 `X[:, h * d_head:(h + 1) * d_head]`。

## Full answer

### 形状的含义

投影之后，每个 token 的 `d` 个特征是 `n_heads` 组、每组 `d_head` 个特征拼接起来的。一个头是横跨所有 token 的一段列切片。reshape 成 `(n, n_heads, d_head)` 保持每个 token 的行完整，只是把它的列重新分组；然后 transpose 把头这一轴放到最前面，每个头的注意力就成了沿头这一轴的批量运算。

### 错误的版本为什么还能跑

两个张量都有 `n * d` 个元素，所以 NumPy 和 PyTorch 乐于重新解释这块内存。对连续数组做 reshape 不会搬动数据；它只改变扁平缓冲区的索引方式。所以 `split_b` 把缓冲区切成了 `n_heads` 等份。`n` 能被 `n_heads` 整除时，第 0 个头装的是前 `n / n_heads` 个 token 的全部特征；不能整除时，某一份会在一个 token 中间断开。这个头里的分数比较的是错误的向量，而模型照样能训练出点什么，所以这个 bug 可能存活好几周。

### 合并必须是精确的逆操作

```python
def combine_heads(H):
    h, n, d_head = H.shape
    return H.transpose(1, 0, 2).reshape(n, h * d_head)
```

先 transpose 回去，再 reshape。直接从 `(h, n, d_head)` reshape 到 `(n, h * d_head)`，就是反过来犯同样的错误，输出投影看到的是打乱的特征。

### 生产中的形状约定

加上批次维度后，中间张量是 `(B, H, T, d_head)`。头维度紧挨着批次维度，这样加速器把每个头的注意力当成 `B * H` 个独立的问题；`d_head` 留在最后，这样 `Q @ K.transpose(-2, -1)` 会沿它做收缩。约束条件是 `D % H == 0`。

### 能发现它的测试

1. `combine_heads(split_heads(X)) == X`。
2. 对每个头都有 `split_heads(X)[h] == X[:, h * d_head:(h + 1) * d_head]`。
3. 在这段切片上跑单头注意力，结果等于批量路径中对应头的输出。

## Follow-ups

- **Level 2:** 为什么这里的 reshape 从不报错？ Expected: 它只是重新解释一个元素个数相同的缓冲区；不会检查数据的含义。
- **Level 2:** 为什么 `d_head` 必须留在最后一轴？ Expected: 计算分数的矩阵乘法用 Q 的最后一轴和转置后 K 的倒数第二轴做收缩。
- **Level 3:** 分组查询注意力怎么复用这段代码？ Expected: 把 K 和 V 切成 `n_kv_heads` 个头，每个头沿头这一轴重复 `n_heads // n_kv_heads` 次，与 Q 对齐。
- **Level 3:** 用错误切法训练的模型损失也还不错。为什么这不能说明没有 bug？ Expected: 投影学会了适应打乱的布局，但各个头不再对应输入的子空间，任何预训练权重或导出的检查点都会出错。

## Wrong answers

- "形状一致时，reshape 和 transpose 可以互换。" reshape 重新解释内存，transpose 移动轴；顺序决定了哪些元素被放在一起。
- "能跑而且损失在降，就是对的。" 布局错了损失也会降；只有往返测试和切片测试能证明布局正确。
- "每个头都有自己的权重矩阵，所以切法无所谓。" 各个头是同一个投影的切片；切法定义了头本身。

## Taught in

[多头注意力一课](../../../phases/07-transformers-deep-dive/03-multi-head-attention/)给出了切分和合并这一对函数，[注意力综合项目](../../../phases/19-capstone-projects/33-multihead-self-attention/)定下了批量计算的形状约定。
