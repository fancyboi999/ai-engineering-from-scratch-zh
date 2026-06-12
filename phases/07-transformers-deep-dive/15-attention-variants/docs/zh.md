# Attention 变体 —— 滑动窗口、稀疏、差分

> 完整注意力是个圈。每个 token 都看每个 token，显存为此买单。四种变体掰弯这个圈的形状，把一半的成本赚回来。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 7 · 02（Self-Attention）、阶段 7 · 03（Multi-Head）、阶段 7 · 12（KV Cache / Flash Attention）
**预计时间：** ~60 分钟

## 问题背景

完整注意力在序列长度上花 `O(N²)` 显存和 `O(N²)` 算力。对一个 128K 上下文的 Llama 3 70B，那是每层 160 亿个注意力条目，乘以 80 层。Flash Attention（第 12 课）藏掉了 `O(N²)` 的激活显存，但没改算术成本——每个 token 仍然关注其他每个 token。

三类变体改变注意力矩阵本身的拓扑：

1. **滑动窗口注意力（SWA）。** 每个 token 关注一个固定的邻居窗口，而非整个前缀。显存和算力降到 `O(N · W)`，其中 `W` 是窗口。Gemma 2/3、Mistral 7B 的前几层、Phi-3-Long。
2. **稀疏 / 块注意力。** 只有选中的对 `(i, j)` 被打分；其余被强制为零权重。Longformer、BigBird、OpenAI 稀疏 transformer。
3. **差分注意力。** 用各自的 Q/K 投影算两张注意力图，一张减另一张。干掉那个把权重渗进前几个 token 的"注意力汇（attention sink）"。微软的 DIFF Transformer（2024）。

它们共存。一个 2026 年的前沿模型常把它们混着用：大多数层是 SWA-1024，每第五层是全局完整注意力，还有少数差分头来清理检索。Gemma 3 的 5:1 SWA-对-全局比例是当前的教科书默认。

## 核心概念

### 滑动窗口注意力（SWA）

位置 `i` 的每个 query 只关注 `[i - W, i]`（因果 SWA）或 `[i - W/2, i + W/2]`（双向）里的位置。窗口外的 token 在分数矩阵里得 `-inf`。

```
完整因果：              滑动窗口 (W=4)：
位置 0-7                位置 0-7, W=4
    0 1 2 3 4 5 6 7        0 1 2 3 4 5 6 7
0 | x                0 |  x
1 | x x              1 |  x x
2 | x x x            2 |  x x x
3 | x x x x          3 |  x x x x
4 | x x x x x        4 |    x x x x
5 | x x x x x x      5 |      x x x x
6 | x x x x x x x    6 |        x x x x
7 | x x x x x x x x  7 |          x x x x
```

对 `N = 8192` 和 `W = 1024`，分数矩阵期望上有 1024 × 8192 个非零行——8 倍的削减。

**SWA 让 KV 缓存缩小。** 每层只需保留 K 和 V 的最后 `W` 个 token。对一个类 Gemma-3 配置（1024 窗口、128K 上下文），KV 缓存降 128 倍。

**质量代价。** 纯 SWA transformer 在长程检索上吃力。修法：把 SWA 层和完整注意力层交错。Gemma 3 用 5:1 的 SWA:全局。Mistral 7B 用了一个因果 SWA 栈，信息通过重叠窗口"向前流"——每层把有效感受野扩展 `W`，`L` 层之后模型能往回关注 `L × W` 个 token。

### 稀疏 / 块注意力

提前挑一个 `N × N` 的稀疏模式。三种规范形状：

- **局部 + 跨步（OpenAI 稀疏 transformer）。** 关注最后 `W` 个 token，加上之前每第 `stride` 个 token。以 `O(N · sqrt(N))` 算力同时捕捉局部和长程。
- **Longformer / BigBird。** 局部窗口 + 一小组全局 token（如 `[CLS]`），它们关注所有人也被所有人关注 + 随机稀疏连接。同等质量下经验上 2 倍上下文。
- **Native Sparse Attention（DeepSeek，2025）。** 学哪些 `(Q, K)` 块重要；在 kernel 层跳过零块。兼容 FlashAttention。

稀疏注意力是个 kernel 工程的故事。数学很简单（掩码分数矩阵）；胜利来自从不把零条目加载进 SRAM。FlashAttention-3 和 2026 年的 FlexAttention API 让自定义稀疏模式在 PyTorch 里成为一等公民。

### 差分注意力（DIFF Transformer，2024）

常规注意力有个"注意力汇"问题：softmax 强迫每一行加和为 1，所以不想特别关注什么的 token 就把权重倒在第一个 token（或前几个）上。这偷走了本该给真实内容的容量。

差分注意力通过算**两张**注意力图并相减来修这点：

```
A1 = softmax(Q1 K1^T / √d)
A2 = softmax(Q2 K2^T / √d)
DiffAttn = (A1 - λ · A2) V
```

其中 `λ` 是一个学到的标量（通常 0.5–0.8）。A1 捕捉真实内容权重；A2 捕捉那个汇。相减抵消了汇，把权重重新分配给相关 token。

报告的结果（微软 2024）：困惑度低 5–10%、同训练长度下有效上下文长 1.5–2 倍、大海捞针检索更锐利。

### 变体对比

| 变体 | 算力 | KV 缓存 | 相比完整的质量 | 生产使用 |
|---------|---------|----------|-----------------|----------------|
| 完整注意力 | O(N²) | 每层 O(N) | 基线 | 每个模型的默认层 |
| SWA（窗口 1024） | O(N·W) | 每层 O(W) | -0.1 ppl，配全局层不错 | Gemma 2/3、Phi-3-Long |
| 局部 + 跨步稀疏 | O(N·√N) | 混合 | 类似 SWA | OpenAI 稀疏 transformer、Longformer |
| BigBird（局部 + 全局 + 随机） | 约 O(N) | 混合 | 2 倍上下文下追平完整 | 早期长上下文 BERT |
| Native Sparse（DeepSeek-V3.2） | O(N · 激活比例) | O(N) | 在 0.05 ppl 之内 | DeepSeek-V3.2，2025 |
| 差分 | O(2·N²) | O(2N) | -5 到 -10% ppl | DIFF Transformer、2026 早期模型 |

```figure
gqa-kv-sharing
```

## 动手构建

见 `code/main.py`。我们实现一个因果掩码对比器，在一个玩具序列上把完整、SWA、局部+跨步、差分注意力并排展示。

### 第 1 步：完整因果掩码（基线）

```python
def causal_mask(n):
    return [[0.0 if j <= i else float("-inf") for j in range(n)] for i in range(n)]
```

第 07 课的基线。下三角；对角线以上零权重。

### 第 2 步：滑动窗口因果掩码

```python
def swa_mask(n, window):
    M = [[float("-inf")] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)
        for j in range(lo, i + 1):
            M[i][j] = 0.0
    return M
```

一个参数——`window`。`window >= n` 时，你恢复完整因果注意力。`window = 1` 时，每个 token 只关注自己。

### 第 3 步：局部 + 跨步稀疏掩码

```python
def strided_mask(n, window, stride):
    M = [[float("-inf")] * n for _ in range(n)]
    for i in range(n):
        lo = max(0, i - window + 1)
        for j in range(lo, i + 1):
            M[i][j] = 0.0
        for j in range(0, i + 1, stride):
            M[i][j] = 0.0
    return M
```

稠密局部窗口加上回溯到序列起点的每第 `stride` 个 token。感受野随层数增加按 log 步长增长。

### 第 4 步：差分注意力

```python
def diff_attention(Q1, K1, Q2, K2, V, lam):
    A1 = softmax_causal(Q1 @ K1.T / sqrt_d)
    A2 = softmax_causal(Q2 @ K2.T / sqrt_d)
    return (A1 - lam * A2) @ V
```

两次注意力通过，用一个学到的混合系数相减。代码里我们对比单注意力和差分注意力的注意力汇热力图，看着汇塌掉。

### 第 5 步：KV 缓存大小

打印 `N = 131072` 时每种变体的每层缓存大小。SWA 和稀疏变体降 10–100 倍。差分翻倍。清醒地付你的显存账单。

## 实际使用

2026 年生产模式：

```python
from transformers import AutoModelForCausalLM
# Gemma 3 以 5:1 混合 SWA（window=1024）和全局层。
model = AutoModelForCausalLM.from_pretrained("google/gemma-3-27b-it")
# print(model.config.sliding_window, model.config.layer_types)
```

PyTorch 2.5+ 里的 FlexAttention 接受一个掩码函数：

```python
from torch.nn.attention.flex_attention import flex_attention, create_block_mask

def swa_pattern(b, h, q_idx, kv_idx):
    return (q_idx - kv_idx < 1024) & (q_idx >= kv_idx)

mask = create_block_mask(swa_pattern, B=batch, H=heads, Q_LEN=n, KV_LEN=n)
out = flex_attention(q, k, v, block_mask=mask)
```

这会编译成一个自定义 Triton kernel。对常见模式，速度在 FlashAttention-3 的 10% 之内，而掩码函数是个 Python 可调用对象。

**什么时候选哪个：**

- **纯完整注意力** —— 约 16K 上下文以内的每一层，或检索质量至上时。
- **SWA + 全局混合** —— 长上下文（>32K）、训练和推理受显存约束。32K 以上的 2026 默认。
- **稀疏块注意力** —— 自定义 kernel、自定义模式。留给专门负载（检索、音频）。
- **差分注意力** —— 任何注意力汇污染会伤害的负载（长上下文 RAG、大海捞针）。

## 拿去用

见 `outputs/skill-attention-variant-picker.md`。这个 skill 会根据目标上下文长度、检索需求和训练/推理算力画像，为一个新模型挑选注意力拓扑。

## 练习

1. **简单。** 跑 `code/main.py`。验证 `window=4` 的 SWA 把每行最后 4 个 token 之外的一切置零。验证 `window=n` 逐 bit 复现完整因果注意力。
2. **中等。** 在第 07 课的收官项目之上实现 `window=1024` 的因果 SWA。在 tinyshakespeare 上训 1,000 步。验证损失相比完整注意力退化多少？峰值显存降多少？
3. **困难。** 在收官模型里实现 Gemma-3 风格的 5:1 层混合（5 个 SWA、1 个全局）。在同等参数下，把损失、显存和生成质量和纯 SWA、纯全局基线对比。
4. **困难。** 实现每头一个学到的 `λ` 的差分注意力。在一个合成检索任务（一根针、2,000 个干扰项）上训练。在同等参数下，测检索准确率相比单注意力基线的情况。

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际是什么意思 |
|------|-----------------|-----------------------|
| 滑动窗口注意力（SWA） | "局部注意力" | 每个 query 关注它最后 `W` 个 token；KV 缓存缩到 `O(W)`。 |
| 有效感受野 | "模型能往回看多远" | 在窗口为 `W` 的 `L` 层 SWA 栈里，最多 `L × W` 个 token。 |
| Longformer / BigBird | "局部 + 全局 + 随机" | 带几个始终关注的全局 token 的稀疏模式；早期长上下文方法。 |
| Native Sparse Attention | "DeepSeek 的 kernel 把戏" | 学块级稀疏；在 kernel 层跳过零块同时保住质量。 |
| 差分注意力 | "两张图，一张减" | DIFF Transformer：从第一张注意力图里减去 `λ` 倍的第二张来抵消注意力汇。 |
| 注意力汇（Attention sink） | "权重渗到 token 0" | softmax 归一化强迫行加和为 1；无信息的 query 把权重倒在位置 0。 |
| FlexAttention | "掩码即 Python" | PyTorch 2.5+ 的 API，把任意掩码函数编译成 FlashAttention 形状的 kernel。 |
| 层类型混合 | "5:1 SWA-对-全局" | 在栈里交错稀疏和完整注意力层，以更低显存保住质量。 |

## 延伸阅读

- [Beltagy, Peters, Cohan (2020). Longformer: The Long-Document Transformer](https://arxiv.org/abs/2004.05150) —— 规范的滑动窗口 + 全局 token 论文。
- [Zaheer et al. (2020). Big Bird: Transformers for Longer Sequences](https://arxiv.org/abs/2007.14062) —— 局部 + 全局 + 随机。
- [Child et al. (2019). Generating Long Sequences with Sparse Transformers](https://arxiv.org/abs/1904.10509) —— OpenAI 的局部+跨步模式。
- [Gemma Team (2024). Gemma 2: Improving Open Language Models at a Practical Size](https://arxiv.org/abs/2408.00118) —— 1:1 的 SWA:全局混合。
- [Gemma Team (2025). Gemma 3 technical report](https://arxiv.org/abs/2503.19786) —— 现在成了教科书默认的、window=1024 的 5:1 混合。
- [Ye et al. (2024). Differential Transformer](https://arxiv.org/abs/2410.05258) —— DIFF Transformer 论文。
- [Yuan et al. (2025). Native Sparse Attention](https://arxiv.org/abs/2502.11089) —— DeepSeek-V3.2 的学习式稀疏注意力。
- [PyTorch — FlexAttention blog and docs](https://pytorch.org/blog/flexattention/) —— "上手使用"里掩码即可调用对象模式的 API 参考。
