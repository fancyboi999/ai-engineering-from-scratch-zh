# 原生稀疏注意力（DeepSeek NSA）

> 在 64k token 下，注意力吃掉 70-80% 的 decode 延迟。每个开放模型实验室都有计划修它。DeepSeek 的 NSA（ACL 2025 最佳论文）是那个站住脚的：三条并行注意力分支——压缩的粗粒度 token、选择性保留的细粒度 token、用于局部上下文的滑动窗口——通过一个习得的门组合起来。它硬件对齐（核友好）、原生可训练（在预训练里工作，不是推理时硬接上去），并且在 64k decode 上比 FlashAttention 跑得快，同时匹配或超过完整注意力的质量。本节课端到端构建这三条分支，并展示为什么这个稀疏性是端到端可微的。

**类型：** Build
**语言：** Python（stdlib）
**前置要求：** 阶段 7 · 12（KV cache、flash-attention），阶段 7 · 15（注意力变体），阶段 10 · 16（差分注意力）
**预计时间：** ~60 分钟

## 学习目标

- 陈述 NSA 的三条注意力分支以及每条捕捉什么。
- 解释为什么 NSA 是 "原生可训练" 的，而此前的稀疏注意力方法只能用于推理。
- 把 NSA 相对完整注意力在 64k context 下的注意力计算节省，算成压缩块大小和选择 top-k 的函数。
- 用 stdlib Python 在一个短合成序列上实现三分支组合，并验证门控权重行为正常。

## 问题背景

序列长度 N 下的完整注意力每层花 `O(N^2)` 时间和 `O(N)` KV cache。在 64k token 下，计算和内存带宽数字是灾难性的。NSA 论文的理论估计实测：注意力在 64k 占总 decode 延迟的 70-80%。下游一切——TTFT、token/秒、每百万 token 成本——都被注意力成本主导。

稀疏注意力是显而易见的答案。此前的尝试落入两个桶。固定模式稀疏（滑动窗口、跨步、块局部）扔掉信息，在长程召回任务上失败。推理时稀疏（KV cache 剪枝、H2O、StreamingLLM）应用在一个在稠密注意力上预训练的模型上，只恢复了潜在加速的一小部分，因为模型从未被要求把信息经稀疏模式路由。

原生稀疏注意力（Yuan et al.，DeepSeek + PKU + UW，ACL 2025 最佳论文，arXiv:2502.11089）两者都做到：一个模型在预训练时学到的稀疏模式，实现为一个核对齐的算法、在推理时真正交付计算节省。两年后，NSA 或它的直系后代将是每个前沿长 context 模型的默认注意力。

## 核心概念

### 三条并行分支

对每个 query，NSA 跑三次注意力，针对 KV cache 的三个不同视图：

1. **压缩分支。** Token 被分到大小为 `l`（通常 32 或 64）的块里。每个块经一个小的习得 MLP 压缩成单个摘要 token。query 在这些压缩 token 上做注意力，得到整条序列的粗粒度视图。

2. **选择分支。** 用压缩分支的注意力分数，识别出和当前 query 最相关的 top-k 个块。从那些块读取细粒度（未压缩）token，query 在它们全部之上做注意力。把压缩分支的注意力想成选择的路由信号。

3. **滑动窗口分支。** query 注意到最近的 `W` 个 token（通常 512）以获取局部上下文。这条分支捕捉另外两条可能错过的、结构密集的短程模式（句法、局部指代）。

三条分支的输出经一个习得的逐位置门组合：

```
out = g_cmp * out_cmp + g_sel * out_sel + g_win * out_win
```

`g_cmp, g_sel, g_win` 是来自一个 query 上小 MLP 的门控权重。它们不必加起来等于 1——它们能独立地加权各分支。

### 为什么这是 "原生可训练" 的

选择步骤（top-k 块）是离散的。离散操作打断梯度流。此前的稀疏注意力工作要么跳过经选择的反向传播（限制了训练），要么用连续松弛，但那在推理时给不出真正的稀疏性。

NSA 绕开了这个：压缩分支的注意力 *本身就是* 整条序列上的一个可微粗粒度注意力。top-k 操作只是复用压缩分支的最高注意力分数来挑哪些细粒度块要加载。梯度流经压缩分支的分数（它们既影响压缩输出 *也* 影响选择逻辑），而被选中块对最终输出的贡献也是可微的。不可微的 `top_k` 操作在前向计算图上是个空操作——它只控制哪些块从内存加载。

这就是为什么 NSA 能端到端用在预训练里。模型学会联合地把信息经三条分支路由，产出一个在推理时真正交付承诺加速的稀疏模式。

### 硬件对齐的核

NSA 的核为现代 GPU 内存层级而设计。核按 GQA 组加载 query（外循环），每组取对应的稀疏 KV 块（内循环），在 SRAM 上跑注意力。因为每个 query 组看到相同的被选块（选择是按 query 组的，不是按 query 头的），KV 加载在组内被摊薄。算术强度保持高。

论文报告 Triton 核在 64k decode 上比 FlashAttention 快 9 倍，加速比随序列长度增长。前向和反向核都提供了。

### 计算预算

设 `N` 为序列长度，`l` 为压缩块大小，`k` 为 top-k 选择数，`w` 为滑动窗口，`b` 为被选块大小（通常等于 `l`）。

- 压缩分支：每 query `O(N/l)` 个键，所以总共 `O(N * N / l)`。
- 选择分支：每 query `O(k * b)` 个键，所以 `O(N * k * b)`。
- 滑动分支：每 query `O(w)` 个键，所以 `O(N * w)`。

总计：`O(N * (N/l + k*b + w))`。

用 `N = 64k, l = 64, k = 16, b = 64, w = 512`：每 query 成本是 `1000 + 1024 + 512 = 2536 个键`。完整注意力是 `64000 个键`。计算减少 25 倍。

用 `N = 128k, l = 64, k = 16, b = 64, w = 512`：每 query 成本是 `2000 + 1024 + 512 = 3536 个键`。完整注意力是 `128000 个键`。减少 36 倍。收益随序列长度增长，这就是全部意义所在。

### 它怎么比

| 方法 | 可微 | 真实推理加速 | 长程召回 |
|--------|---------------|----------------------|-------------------|
| 仅滑动窗口 | 是 | 是 | 失败 |
| 跨步 / 块稀疏 | 是 | 是 | 部分 |
| KV 剪枝（H2O、StreamingLLM） | 不适用（推理时） | 是 | 部分 |
| MoBA（Moonshot） | 部分 | 是 | 好 |
| NSA | 是（原生） | 是（64k 下 9 倍） | 匹配完整注意力 |

MoBA（Moonshot，arXiv:2502.13189）同期发表，采取类似的 "三个比一个好" 的方法，把 MoE 原则应用到注意力块上。NSA 和 MoBA 是 2026 年长 context 预训练要知道的两个架构。

```figure
sliding-window-attention
```

## 动手构建

`code/main.py` 在一个短合成序列上实现三条分支，并展示：

- 压缩 MLP（为教学清晰用一个简单的 mean-pool 基线；真实 NSA 用一个习得 MLP）。
- 由压缩分支分数驱动的 top-k 块选择。
- 最后 `w` 个 token 上的滑动窗口注意力。
- 门控组合。
- 一个和完整注意力对比的计算计数打印。

### 第 1 步：把 token 压缩成块

```python
def compress(K, l):
    n = len(K)
    n_blocks = (n + l - 1) // l
    out = []
    for b in range(n_blocks):
        start, end = b * l, min((b + 1) * l, n)
        block = K[start:end]
        summary = [sum(row[d] for row in block) / len(block) for d in range(len(K[0]))]
        out.append(summary)
    return out
```

### 第 2 步：压缩分支注意力

跑 query 对压缩键的 softmax 注意力。压缩分支的分数兼作 top-k 选择的信号。

### 第 3 步：top-k 块选择

挑出得分最高的 `k` 个压缩块的索引。从那些块加载原始未压缩 token，并在它们上面跑注意力。

### 第 4 步：滑动窗口注意力

取最后 `w` 个 token，对它们跑标准注意力。

### 第 5 步：门控 + 组合

query 上的一个小 MLP 产出三个门控权重。最终输出是三条分支输出的加权和。

### 第 6 步：计算计数

打印每 query 每条分支注意到的键数和总数。和 `N`（完整注意力）对比。在一个 `l = 32, k = 4, w = 128` 的 1024-token 合成上，NSA 每 query 看到 `32 + 128 + 128 = 288` 个键，对比完整注意力的 1024——少 3.5 倍。

## 实际使用

NSA 已在 DeepSeek 自己的长 context 预训练流水线里上线。截至 2026 年 4 月在公开推理栈里的集成状态：

- **DeepSeek 内部**：原生，公开的权重用 NSA 或它的后继 DSA（Deepseek Sparse Attention）。
- **vLLM**：为 DeepSeek-V3.x 权重开发中的实验性 NSA 支持。
- **SGLang**：NSA 基准已发布；生产路径跟随 vLLM。
- **llama.cpp / CPU**：不支持；核分解的开销在 CPU 吞吐下不值。

什么时候上 NSA：

- 针对 64k 以上 context、有严肃算力预算的预训练或继续训练运行。
- DeepSeek 自己长 context checkpoint 的推理。权重是 NSA 原生的。

什么时候不上：

- 服务一个现有的稠密注意力预训练模型。你不继续训练就没法改造成 NSA。
- Context 16k 以下。三分支开销盖过节省。
- Batch-1 交互式聊天。延迟敏感的 decode 有收益，但只在长 context 下。

## 拿去用

本节课产出 `outputs/skill-nsa-integrator.md`。给定一份长 context 预训练运行规格，它产出一份 NSA 集成计划：压缩块大小、top-k、滑动窗口、门控 MLP 宽度、核选择，以及能证明这次架构改动合理的具体长 context eval。

## 练习

1. 在一个 1024-token 合成上跑 `code/main.py`。把 `(l, k, w)` 在三套预设里扫描并打印计算计数。找出在大海捞针测试上对完整注意力保持 95% 召回的同时，达到每 query 最低键数的预设。

2. 把 mean-pool 压缩器换成一个小的习得 MLP（2 层，hidden 32）。在一个信号是块均值的合成任务上训练它。在留出数据上测量它对 mean-pool 基线的困惑度差距。

3. 实现门控 MLP。它接收 query 作为输入，输出三个标量。展示门行为合理：在随机 query 上近乎均匀加权，当 query 命中一个靠后的块时在选择分支上重权。

4. 为一个 128k context 下启用 NSA 的 70B 模型计算 KV cache 内存预算。KV 头 8 个、head 维度 128、BF16。和完整注意力以及 MLA（阶段 10 · 14 展示了 MLA 的数字）对比。找出 NSA 的细粒度分支 KV cache 等于完整注意力的序列长度。

5. 读 NSA 论文（arXiv:2502.11089）第 4 节，用三句话解释为什么压缩分支的注意力分数被复用于 top-k 选择，而不是计算一个单独的路由分数。把答案和梯度流联系起来。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 压缩分支 | "粗视图" | 对块平均键的注意力，以每 query O(N/l) 个键提供全局上下文 |
| 选择分支 | "top-k 块" | 对压缩分支分数最高的 `k` 个块的细粒度注意力 |
| 滑动窗口 | "局部上下文" | 对最后 `W` 个 token 的注意力，用于短程模式 |
| 原生可训练性 | "带着稀疏性预训练" | 稀疏模式在预训练时学到，不是推理时硬接上去 |
| 压缩块大小 l | "粗视图的分组大小" | 多少个 token 被合并成一个摘要；典型 32-64 |
| Top-k | "要保留的块" | 其未压缩 token 会被读取的压缩块数；典型 16 |
| 滑动窗口 W | "局部注意力半径" | 通常 512；更短伤局部连贯，更长浪费计算 |
| 分支门 | "怎么混三个" | 逐位置 MLP 输出，加权三条分支的贡献 |
| 硬件对齐 | "核友好的稀疏性" | 选定的稀疏模式让实际 GPU 核达到理论加速 |
| DSA | "NSA 的后继" | Deepseek Sparse Attention，DeepSeek 谱系里继 NSA 之后的架构 |

## 延伸阅读

- [Yuan et al. — Native Sparse Attention: Hardware-Aligned and Natively Trainable Sparse Attention (arXiv:2502.11089, ACL 2025 Best Paper)](https://arxiv.org/abs/2502.11089) — 论文
- [DeepSeek-V3 Technical Report (arXiv:2412.19437)](https://arxiv.org/abs/2412.19437) — NSA 针对的架构家族
- [Moonshot AI — MoBA: Mixture of Block Attention for Long-Context LLMs (arXiv:2502.13189)](https://arxiv.org/abs/2502.13189) — 同期工作，MoE 风格的块上注意力
- [Beltagy et al. — Longformer: The Long-Document Transformer (arXiv:2004.05150)](https://arxiv.org/abs/2004.05150) — 滑动窗口的起源
- [Xiao et al. — StreamingLLM: Efficient Streaming Language Models with Attention Sinks (arXiv:2309.17453)](https://arxiv.org/abs/2309.17453) — NSA 改进的推理时稀疏性基线
- [Dao et al. — FlashAttention-2 (arXiv:2307.08691)](https://arxiv.org/abs/2307.08691) — NSA 核在 64k 击败的完整注意力基线
