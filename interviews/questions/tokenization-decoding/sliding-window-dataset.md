---
id: sliding-window-dataset
title: 数一数 token 流能切出多少个窗口
card: tokenization-decoding
kind: code-reading
level: 2
roles: [ai-data-engineer, applied-ai-engineer, inference-engineer]
rounds: [coding, ml-depth]
tags: [dataset, sliding-window, stride, shift-by-one, reproducibility]
minutes: 8
lessons: [phases/19-capstone-projects/31-tokenized-dataset-sliding-window]
manuals: []
practice: []
cheatsheet: [gpt-from-scratch-training]
related: [tokenization-decoding/read-the-decoder-round-trip]
updated: 2026-11-03
---

阅读课程里的这段数据集代码。`ids` 是整个语料，作为一个 token ID 张量。

```python
@staticmethod
def count_windows(num_ids, context_length, stride):
    usable = num_ids - (context_length + 1)
    if usable < 0:
        return 0
    return 1 + usable // stride

def __getitem__(self, index):
    start = index * self.stride
    end = start + self.context_length + 1
    window = self.ids[start:end]
    return window[:-1].clone(), window[1:].clone()
```

为什么每个窗口要比上下文长度多一个 ID？步长减半时，窗口数怎么变？loader 怎样让两次运行看到相同的顺序？

## Short answer

目标是输入左移一位，所以 T 个输入 ID 的样本需要 T 加 1 个 ID；窗口数是 1 加上 (N 减 T 减 1) 除以步长后向下取整，流太短时为零。步长从 T 减到 T 除以 2，样本大约翻倍，每个窗口有一半与相邻窗口重叠；步长为 1 时，样本数大约乘以 T。loader 用基础种子加 epoch 序号给生成器设种子，所以每次重启打乱顺序都一样，每个 epoch 又各有一次新的打乱。

## Full answer

### 形状约定

因果语言模型接收 `(B, T)` 的输入 ID 和 `(B, T)` 的目标 ID，位置 t 的目标就是位置 t 加 1 的输入。从同一块内存切出一段 T 加 1 个 ID，就能得到这两个张量，错位的错误也就不可能发生：`window[:-1]` 和 `window[1:]`。

### 计数

```text
examples = max(0, 1 + (N - (T + 1)) // S)
```

凑不满 T 加 1 个 ID 的最后一个窗口会被丢掉。补齐它也可以，但会让损失掩码更复杂，所以课程选择丢掉。

### 步长与冗余

| 步长 | 重叠 | 样本数 |
|---|---|---|
| T | 无 | 约 N 除以 T |
| T 除以 2 | 每个窗口的一半 | 约两倍 |
| 1 | 几乎全部 | 约 T 倍 |

重叠越多，窗口边界的位置越分散，模型每个 epoch 看到的不同的"预测下一个 token"任务就越多，代价是每个 epoch 的算力更多。大多数预训练把步长设成上下文长度，因为语料本来就大到一个 epoch 都过不完。

### 内存

数据集只存一份 ID 流，每个窗口的起点在取用时现算，所以内存开销不会随步长造出的样本数增长。

### 确定性

```python
generator = torch.Generator()
generator.manual_seed(base_seed + epoch)
```

同一个基础种子让每次运行的每个 epoch 顺序都相同，epoch 序号又让每个 epoch 有新的打乱。不这样做的话，两次只差一个超参数的运行，数据顺序也不同，损失曲线会因为和这次改动无关的原因分叉。

## Follow-ups

- **Level 2:** 为什么不补齐最后一个窗口，而是丢掉它？ Expected: 补齐需要损失掩码，让填充位置不计入；丢掉能让损失保持简单。
- **Level 3:** 为什么每个 epoch 设一次种子，而不是每次运行只设一次？ Expected: 设一次种子、跨 epoch 推进的生成器也可复现，但第 k 个 epoch 的顺序就要靠重放前面所有 epoch 才能得到；用基础种子加 epoch 序号可以直接构建第 k 个 epoch 的顺序，恢复训练正需要这一点。
- **Level 3:** 步长为 1 付出什么，换来什么？ Expected: 每个 epoch 约 T 倍的算力和大量冗余，换来最大的边界多样性。
- **Level 4:** 你在切窗口之后才把 ID 流分成训练集和验证集。会出什么问题？ Expected: 重叠的窗口跨在分界线两边，验证文本出现在训练里；应该先切分 ID 流，再对每部分切窗口。

## Wrong answers

- "样本数是 N 除以 T。" 这忽略了每个窗口多出的那个 ID 和步长；公式里两者都有。
- "固定种子会让每个 epoch 看到同样的顺序。" 种子里加了 epoch 序号，所以每个 epoch 都有新的打乱，而每次运行都可复现。
- "目标和输入是同一个窗口。" 目标是左移一位的窗口；同一批 ID 从一个切片里给出两个张量。

## Taught in

[滑动窗口数据集综合项目](../../../phases/19-capstone-projects/31-tokenized-dataset-sliding-window/)给出了计数公式、错位一位的切片和带种子的 loader。
