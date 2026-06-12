# 差分注意力（V2）

> Softmax 注意力把少量概率撒到每个不匹配的 token 上。在 10 万个 token 上，那点噪声累积起来淹没信号。Differential Transformer（Ye et al., ICLR 2025）通过把注意力算成两个 softmax 之差、减掉共享的噪声底来修复它。DIFF V2（微软，2026 年 1 月）是生产栈的重写：decode 延迟匹配基线 Transformer，无自定义核，FlashAttention 兼容。本节课端到端走 V1 到 V2，并附一个你能在 stdlib Python 里跑的差分操作玩具实现。

**类型：** Build
**语言：** Python（stdlib）
**前置要求：** 阶段 7 · 02（自注意力），阶段 7 · 15（注意力变体），阶段 10 · 14（架构走读）
**预计时间：** ~60 分钟

## 学习目标

- 精确陈述为什么 softmax 注意力有噪声底，以及为什么它随 context 长度增长。
- 推导差分注意力公式，并解释为什么这个相减在保留信号的同时抵消了共享噪声成分。
- 走一遍 V1 到 V2 的 diff：什么变快了、什么变简单了、什么变稳了，以及每个改动为什么对生产预训练是必要的。
- 用纯 Python 从零实现差分注意力，并在一个合成的信号加噪声 query 上经验性地验证噪声抵消性质。

## 问题背景

标准 softmax 注意力有一个数学性质，到了规模上变成一个运营头疼事。对一个 query `q`，注意力权重是 `softmax(qK^T / sqrt(d))`。Softmax 永远产不出精确的零——每个不匹配的 token 都得到一些正的质量。那点残余质量是噪声，且随 context 长度放大。在 128k token 下，即使每个不匹配 token 只得到 0.001% 的概率，它们 127,999 个加起来贡献约 12% 的总量。模型不得不学会绕过一个随 context 增长的噪声底。

经验上这表现为注意力头干扰：长 context RAG 里幻觉出来的引用、10 万 token 检索任务上的 lost-in-the-middle 失败，以及超过 32k 的大海捞针基准上微妙的精度退化。Differential Transformer 论文（arXiv:2410.05258，ICLR 2025）测量了这个差距：DIFF Transformer 比同规模基线达到更低困惑度、更高长 context 准确率、更少幻觉。

DIFF V1 有三个问题，把它挡在前沿预训练流水线外。它的 value cache 每个 decode 步骤要加载两次，它需要破坏 FlashAttention 兼容性的自定义 CUDA 核，它的 per-head RMSNorm 在 70B 以上规模破坏长程训练稳定性。DIFF V2（微软 unilm 博客，2026 年 1 月 20 日）修了这三个。本节课走两个版本、构建差分算子，并在一个玩具 query 上对噪声抵消做基准测试。

## 核心概念

### softmax 的噪声底

对一个 query `q` 和键 `K = [k_1, ..., k_N]`，注意力权重是：

```
w_i = exp(q . k_i / sqrt(d)) / sum_j exp(q . k_j / sqrt(d))
```

没有 `w_i` 会是零。如果 `k_i` 和 `q` 完全无关，分数 `q . k_i` 不是 0——它围绕零波动，方差为 `||q||^2 / d`。softmax 归一化后，每个无关 token 仍然给加权和贡献 `O(1/N)`。无关 token 的总贡献是 `O((N-1)/N) = O(1)`——不是个小量。

模型想要的是类似硬 top-k 的东西：匹配 token 上高权重，其他地方近乎零权重。Softmax 太平滑了，没法直接做到。

### 差分思路

把每个头的 Q 和 K 投影切成两份：Q = (Q_1, Q_2) 和 K = (K_1, K_2)。计算两张注意力图：

```
A_1 = softmax(Q_1 K_1^T / sqrt(d))
A_2 = softmax(Q_2 K_2^T / sqrt(d))
```

输出：

```
DiffAttn = (A_1 - lambda * A_2) V
```

这个相减抵消了两张图共享的任何噪声分布。如果两张图在 127k 个无关 token 上都有大致均匀的权重（随机初始化时它们会这样），那些就抵消了。信号——在那少数真正相关的 token 上的峰值权重——只有在两张图里以相同幅度出现时才抵消，而模型一旦训练起来它就不会。

`lambda` 是每个头的一个可学习标量，参数化为 `lambda = exp(lambda_q1 dot lambda_k1) - exp(lambda_q2 dot lambda_k2) + lambda_init`。它可以为负。`lambda_init` 默认一个小正数，比如 0.8。

### 为什么这匹配带头的降噪

想象两个嘈杂的麦克风录同一个声音。两个都拾到了说话者加相关的背景噪声。把一个减另一个，共享的噪声就掉了。声音存活下来，因为两个信号在相位或幅度上差得够多，足以阻止完全抵消。每个头的 `lambda` 学到的正是这个平衡。

### V1 vs V2：diff

V1 把参数量保持和基线 Transformer 相等。为了每个头得到两个 query，它把头维度减半。那牺牲了头的表达力，而且——更痛的是——把每个头的 value cache 减半了。Decode 每步要加载 value cache 两次（每个 softmax 分支一次）。结果：尽管参数量匹配，decode 比基线慢。

V2 把 query 头数翻倍，保持 KV 头数不变（从 up-projection 借参数）。头维度和基线一样。相减之后，多出的维度被投影回去以匹配基线 Transformer 的 O_W 投影。三件事同时发生：

1. Decode 速度匹配基线（KV cache 加载一次）。
2. FlashAttention 原样运行（无自定义核）。
3. Decode 时算术强度提高（每从 HBM 加载一字节有更多计算）。

V2 还移除了 V1 用来稳定相减的 per-head RMSNorm。在 70B 级别的预训练规模上，那个 RMSNorm 破坏了后期训练稳定性。V2 用一个更简单的初始化方案替换它，不用额外模块就保持训练稳定。

### 什么时候上它

| 工作负载 | 收益 |
|----------|---------|
| 长 context RAG（64k+） | 更干净的注意力图，更少幻觉引用 |
| 大海捞针基准 | 超过 32k 后大幅精度提升 |
| 多文档 QA | 更少跨文档干扰 |
| 8k 的代码补全 | 边际，不值得改架构 |
| 短聊天（< 4k） | 和基线基本无差别 |

价值随 context 长度增长。在 4k token 下噪声底小到标准注意力没问题。在 128k 下它在伤害你。

### 它和其他 2026 旋钮如何叠加

| 特性 | 和 DIFF V2 兼容？ |
|---------|------------------------|
| GQA | 兼容（V2 增加 Q 头，不增加 KV 头） |
| MLA（DeepSeek） | 原则上兼容，无公开论文把它们结合 |
| MoE | 兼容（注意力独立于 MLP 块） |
| RoPE | 兼容（不变） |
| YaRN / 长 context 缩放 | 兼容（正是 DIFF 帮助最大的地方） |
| FlashAttention | V2 兼容（V1 不兼容） |
| 推测解码 | 兼容（注意力改动对 spec-decode 循环不可见） |

```figure
differential-attention
```

## 动手构建

`code/main.py` 用纯 Python 实现差分注意力。一个有已知信号加噪声结构的玩具 query 让你直接测量噪声抵消比。

### 第 1 步：标准 softmax 注意力

Stdlib 矩阵操作：列表的列表、手写 matmul、带数值稳定性减最大值的 softmax。

```python
def softmax(row):
    m = max(row)
    exps = [math.exp(x - m) for x in row]
    s = sum(exps)
    return [e / s for e in exps]
```

### 第 2 步：把 Q、K 切成两半

V1 风格：把头维度减半。V2 风格：保持头维度，把头数翻倍。玩具实现为教学清晰用 V1——数学一模一样，只是记账不同。

### 第 3 步：两个 softmax 分支 + 相减

```python
A1 = [softmax([dot(q1, k) / scale for k in K1]) for q1 in Q1]
A2 = [softmax([dot(q2, k) / scale for k in K2]) for q2 in Q2]
diff_weights = [[a1 - lam * a2 for a1, a2 in zip(r1, r2)] for r1, r2 in zip(A1, A2)]
out = [[sum(w * v[j] for w, v in zip(row, V)) for j in range(d_v)] for row in diff_weights]
```

注意：输出权重可以为负。这没问题——value cache 仍然处理带符号的贡献。后续的 V 投影吸收符号。

### 第 4 步：噪声抵消测量

构建一个长度 1024 的合成序列。把信号 token 放在一个已知位置，其余用噪声填。计算 (a) 信号位置上的标准 softmax 注意力权重和 (b) 差分注意力权重。测量每个里的信噪比。DIFF 注意力可靠地产出更高的信噪比，倍数为 3 到 10 倍，取决于两个分支被训练得差异有多大。

### 第 5 步：V1 vs V2 参数核算

给定一个配置（hidden=4096，heads=32，d_head=128），打印：

- 基线 Transformer：Q、K、V 各大小 `hidden * hidden`，MLP 在 4 * hidden。
- DIFF V1：Q、K 各大小 `hidden * hidden`，V 大小 `hidden * hidden`（不变），内部头维度减半。加每个头的 `lambda` 参数（O(heads * d_head)）。
- DIFF V2：Q 大小 `2 * hidden * hidden`，K 大小 `hidden * hidden`，V 大小 `hidden * hidden`。多出的维度在 O_W 之前投影回去。加同样的 `lambda` 参数。

玩具测量 V2 的额外参数成本（每个注意力块大约 `hidden * hidden` 额外）并打印它。

## 实际使用

截至 2026 年 4 月，DIFF V2 还没在每个生产推理服务器里上线，但 vLLM 和 SGLang 的集成正在进行。同时这个模式出现在：

- 微软内部长 context 生产模型。
- 几个针对 256k 以上 context 的开放模型训练运行里的研究复现。
- 在交替层上把 DIFF 注意力和滑动窗口注意力结合的混合架构。

2026 年你什么时候会上它：

- 从零训练一个针对 64k 以上有效 context 的新模型。从一开始就加差分注意力；之后重训很贵。
- 微调一个 lost-in-the-middle 失败主导你 eval 的长 context 模型。在 Q 投影上的一个 LoRA 能近似 DIFF 结构。

什么时候不上：

- 你在服务一个长 context 性能稳定的预训练稠密模型。重训成本在现有权重上很少回本。
- 你的 context 总在 16k 以下。噪声底可忽略。

## 拿去用

本节课产出 `outputs/skill-diff-attention-integrator.md`。给定一个模型架构、目标 context 长度、幻觉画像和训练预算，它产出一份把差分注意力加进新预训练运行或 LoRA 微调的集成计划。

## 练习

1. 跑 `code/main.py`。验证在合成 query 上差分注意力报告的信噪比高于标准 softmax 注意力。改变噪声幅度，展示标准注意力变得不可用的交叉点。

2. 为一个 7B 级模型（hidden=4096，heads=32，d_head=128，32 层）计算从基线到 DIFF V1 和从基线到 DIFF V2 的参数量差。展示哪些组件涨了参数、哪些没变。

3. 读 DIFF V1 论文（arXiv:2410.05258）第 3 节和 DIFF V2 Hugging Face 博客第 2 节。用两句话解释为什么 V1 的 per-head RMSNorm 是必要的，以及为什么 V2 能移除它而不导致训练发散。

4. 实现一个消融：用 `lambda = 0`（纯第一个 softmax）和 `lambda = 1`（完全相减）计算差分注意力。在合成 query 上，测量信噪比在这个扫描里如何变化。找出最大化信噪比的 `lambda`。

5. 把玩具扩展到 GQA + DIFF V2。选 8 个 KV 头和 32 个 Q 头。展示 KV cache 大小匹配一个相同 (8, 32) 配置的基线 GQA 模型。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 差分注意力 | "两个 softmax 相减" | 把 Q、K 切成两半，计算两张 softmax 图，从第一张减去第二张（按 lambda 缩放），再乘以 V |
| 噪声底 | "softmax 的非零尾巴" | softmax 给每个无关 token 的 O(1/N) 权重，在长 context 上加起来到 O(1) |
| lambda | "相减的缩放" | 每个头的可学习标量，参数化为 `exp(lq1.lk1) - exp(lq2.lk2) + lambda_init`；可以为负 |
| DIFF V1 | "ICLR 2025 版本" | 最初的 Differential Transformer；把头维度减半以保持参数量，需要自定义核，decode 更慢 |
| DIFF V2 | "2026 年 1 月的修复" | 翻倍 Q 头、保持 KV 头；匹配基线 decode 速度并和 FlashAttention 协同 |
| Per-head RMSNorm | "V1 的稳定器" | V1 在相减后应用的额外 norm；V2 移除它以防止后期训练不稳定 |
| 信噪比 | "多少注意力被浪费" | 真信号位置上的权重和无关位置平均权重之比 |
| Lost in the middle | "长 context 失败模式" | 经验现象，长 context 中间的文档检索准确率下降——DIFF 注意力减少这个 |
| 算术强度 | "每加载一字节几个 FLOPs" | V2 通过每次 KV 加载翻倍 query 在 decode 时提高的比率；对内存受限的 decode 重要 |

## 延伸阅读

- [Ye et al. — Differential Transformer (arXiv:2410.05258, ICLR 2025)](https://arxiv.org/abs/2410.05258) — 带噪声抵消理论和长 context 消融的原始论文
- [Microsoft unilm — Differential Transformer V2 (Hugging Face blog, January 2026)](https://huggingface.co/blog/microsoft/diff-attn-v2) — 生产栈重写，匹配基线 decode，FlashAttention 兼容
- [Understanding Differential Transformer Unchains Pretrained Self-Attentions (arXiv:2505.16333)](https://arxiv.org/abs/2505.16333) — 关于为什么相减能恢复预训练注意力结构的理论分析
- [Shared DIFF Transformer (arXiv:2501.17900)](https://arxiv.org/html/2501.17900) — 参数共享变体
- [Vaswani et al. — Attention Is All You Need (arXiv:1706.03762)](https://arxiv.org/abs/1706.03762) — DIFF 从中相减的基线 Transformer
- [Liu et al. — Lost in the Middle (arXiv:2307.03172)](https://arxiv.org/abs/2307.03172) — DIFF 注意力针对的长 context 基准
