# 推测解码与 EAGLE

> 一个前沿 LLM 生成一个 token 需要一次遍历数十亿参数的完整前向传播。那次前向传播严重过度配置了：大多数时候一个小得多的模型能正确猜出接下来 3-5 个 token，大模型只需要 *验证* 这个猜测。猜对时你用一个 token 的代价拿到 5 个。推测解码（Leviathan et al. 2023）把这个做精确了，EAGLE-3（2025）把接受率推到每次验证约 4.5 个 token——在匹配输出分布的同时实现 4-5 倍加速。

**类型：** Build
**语言：** Python（配合 numpy）
**前置要求：** 阶段 10 第 12 课（推理优化），阶段 10 第 04 课（预训练 Mini-GPT）
**预计时间：** ~75 分钟

## 问题背景

一个 70B 级模型在 H100 上的 decode 吞吐通常是 40-80 token/秒。每个 token 需要一次从 HBM 读取全部模型权重的完整前向传播。你没法在不改变输出的情况下把模型变小。你没法把 batch size 增大到超出内存。你卡住了——除非你能让模型每次前向传播输出不止一个 token。

自回归生成看起来本质上是串行的：`x_{t+1} = sample(p(· | x_{1:t}))`。但有一个并发机会。如果你有一个廉价的预测器说 "接下来 4 个 token 大概是 [a, b, c, d]"，你就能在大模型的 **一次前向传播** 里验证全部 5 个位置，并接受最长的匹配前缀。

Leviathan、Kalai、Matias（2023，"Fast Inference from Transformers via Speculative Decoding"）经一条保留 target 模型采样分布的巧妙接受/拒绝规则把这个做精确了。同样的输出分布，快 2-4 倍。

## 核心概念

### 双模型设置

- **Target 模型** `M_p`：你实际想要采样的那个大、慢、高质量模型。分布：`p(x)`。
- **Draft 模型** `M_q`：一个小、快、较低质量的模型。分布：`q(x)`。小 5-30 倍。

每一步：

1. Draft 模型自回归地提议 `K` 个 token：`x_1, x_2, ..., x_K ~ q`。
2. Target 模型对全部 `K+1` 个位置并行跑 *一次* 前向传播，为每个提议 token 产出 `p(x_k)`。
3. 经下面修改过的拒绝采样规则从左到右接受/拒绝每个 token。接受最长的匹配前缀。
4. 如果任何 token 被拒绝，从修正后的分布采样替换并停止。否则从 `p(· | x_1...x_K)` 采样一个 bonus token。

如果 draft 完美匹配 target，你每次 target 前向得到 K+1 个 token。如果 draft 在位置 1 就错了，你只得到 1 个 token。

### 精确性规则

推测解码 **在分布上可证明等价于从 p 采样**。拒绝规则：

```
For each drafted token x_t:
    r ~ Uniform(0, 1)
    if r < p(x_t) / q(x_t):
        accept x_t
    else:
        sample replacement from residual: (p - q)+ / ||(p - q)+||_1
        stop
```

其中 `(p - q)+` 表示逐点差的正部。当 draft 和 target 一致（`p ≈ q`）时接受率近乎 1。当它们不一致时，残差分布被构造得让整体样本仍精确为 `p`。

**贪心情况。** 对温度=0 的采样，只需检查 `argmax(p) == x_t`。是就接受；否就输出 `argmax(p)` 并停止。

### 预期加速

如果 draft 模型的 token 级接受率是 `α`，每次 target 前向传播产出的预期 token 数是：

```
E[tokens] = (1 - α^{K+1}) / (1 - α)        # K = draft length, α in [0, 1]
```

在 `α = 0.8, K = 4` 时：`(1 - 0.8^5)/(1 - 0.8) = 3.36` 个 token/前向。一次 target 前向大约花 `cost_q * K + cost_p`（K 次 draft 步骤加一次 target 验证）。如果 `cost_p >> cost_q * K`，吞吐上的加速比是 `3.36× / 1 = 3.36×`。

唯一真正的参数是 `α`，它完全取决于 draft-target 对齐。一个好的 draft 就是一切。

### 训练 Draft：蒸馏

一个随机的小模型做不好 draft。标准配方是从 target 蒸馏：

1. 挑一个小架构（70B target 用 ~1B，7B target 用 ~500M）。
2. 在一个大文本语料上跑 target 模型；存它的下一个 token 分布。
3. 用对 target 分布的 KL 散度训练 draft（不是对真值 token）。

结果：`α` 在代码上通常 0.6-0.8，在自然语言聊天上 0.7-0.85。生产里加速 2-3 倍。

### EAGLE：树起草 + 特征复用

Li、Wei、Zhang、Zhang（2024，"EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty"）观察到标准推测解码里的两个低效：

1. Draft 做 K 个串行步骤，每个都全栈。但 draft 本可以复用 target 最近一次验证的特征（隐藏状态）——target 已经算出了 draft 在从零重新推导的丰富表示。
2. Draft 输出一条线性链。如果 draft 能输出一棵候选 *树*（每个节点多个猜测），target 的单次前向传播就能经一个树注意力 mask 并行验证多条候选路径，并挑最长的被接受分支。

EAGLE-1 的改动：
- Draft 输入 = target 在位置 t 的最终隐藏状态，不是原始 token。
- Draft 架构 = 1 个 transformer 解码器层（不是单独的小模型）。
- 输出 = 每深度 K = 4-8 个候选的树，深度 4-6。

EAGLE-2（2024）加了动态树拓扑：树在 draft 不确定处长得更宽、在它自信处保持窄。在不增加验证成本的情况下提高 `α_effective`。

EAGLE-3（Li et al. 2025，"EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test"）移除了固定的顶层特征依赖，并用一个新的 "测试时模拟" 损失训练 draft——draft 在匹配 target 测试时分布的输出上训练，而不是 teacher-forced 训练分布。接受率从 0.75（EAGLE-2）升到 0.82（EAGLE-3），每次验证平均 token 从 3.0 升到 4.5。

### 树注意力验证

当 draft 输出一棵树，target 模型用一个 **树注意力 mask** 在单次前向传播里验证它——一个编码树拓扑而非纯线的因果 mask。每个 token 只注意它在树中的祖先。验证传播仍是一次前向、一次 matmul；拓扑 mask 只花几个额外的 KV 条目。

```
        root
       /    \
      a      b
     / \    / \
    c  d   e   f
```

如果 `a, b` 是竞争的第一 token 候选、`c, d, e, f` 是第二 token 候选，全部六个位置在一次前向传播里被验证。输出是任何被接受路径上最长的前缀。

### 何时赢，何时不赢

**赢：**
- 文本可预测的聊天/补全（代码、常见英语、结构化输出）。`α` 高。
- decode 时（内存受限阶段）有未用 GPU 算力的场景。树起草用掉可用的 FLOPs。

**输 / 无收益：**
- 高度随机的输出（高温度的创意写作）。`α` 朝 `1/|vocab|` 跌。
- 极高并发的批量服务——批处理已经填满 FLOPs，没多少空间给树验证。
- 非常小的 target 模型，draft 没比它小多少。

生产团队通常报告聊天上 2-3 倍墙钟加速、代码生成上 3-5 倍、创意写作上近乎零。

```figure
speculative-decoding
```

## 动手构建

`code/main.py`：

- 一个参考实现 `speculative_decode(target, draft, prompt, K, temperature)`，实现精确拒绝规则并验证它保留 target 的分布（相对普通 target 采样的经验 KL < 0.01）。
- 一个 EAGLE 风格的树起草器，用 top-p 分支构建一棵深度 K 的树。
- 一个树注意力 mask 构建器，为验证器产出正确的因果模式。
- 一个接受率测试架，在一个微型 LM 上跑两者（从一个 GPT-2-medium target 蒸馏一个 GPT-2-small）。

```python
def speculative_step(p_target, q_draft, K, temperature=1.0):
    """一轮推测解码。返回被接受 token 的列表。"""
    # 1. 起草 K 个 token
    draft_tokens = []
    q_probs = []
    state = draft_state_init()
    for _ in range(K):
        probs = softmax(q_draft(state) / temperature)
        t = np.random.choice(len(probs), p=probs)
        draft_tokens.append(t)
        q_probs.append(probs[t])
        state = draft_step(state, t)

    # 2. target 在每个起草位置 + 1 个额外位置计算 p
    p_probs_all = target_forward_batched(p_target, draft_tokens, temperature)

    # 3. 从左到右接受/拒绝
    accepted = []
    for k, tok in enumerate(draft_tokens):
        r = np.random.uniform()
        if r < p_probs_all[k][tok] / q_probs[k]:
            accepted.append(tok)
        else:
            residual = np.maximum(p_probs_all[k] - q_probs[k], 0)
            residual /= residual.sum()
            accepted.append(np.random.choice(len(residual), p=residual))
            return accepted
    # 4. 全部 K 个被接受 → 从 target 采样 bonus token
    accepted.append(np.random.choice(len(p_probs_all[-1]), p=p_probs_all[-1]))
    return accepted
```

## 实际使用

- **vLLM** 和 **SGLang** 内置一流的推测解码。标志：`--speculative_model`、`--num_speculative_tokens`。EAGLE-2/3 经 `--spec_decoding_algorithm eagle` 标志支持。
- **NVIDIA TensorRT-LLM** 原生支持 Medusa 和 EAGLE 树。
- **参考 draft 模型**：`Qwen/Qwen3-0.6B-spec`（为 Qwen3-32B 起草）、`meta-llama/Llama-3.2-1B-Instruct-spec`（为 70B 起草）。
- **Medusa 头**（Cai et al. 2024，"Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads"）：不用 draft 模型，而是给 target 自身加 K 个并行预测头。部署更简单，接受率比 EAGLE 略低。

## 拿去用

本节课产出 `outputs/skill-speculative-tuning.md`——一个 skill，它给一个 target 模型的工作负载做剖析并选择：draft 模型、K（draft 长度）、树宽度、温度，以及何时回退到普通解码。

## 练习

1. 实现精确拒绝规则并经验性验证它。经 `speculative_decode` 和经普通 target 采样各跑 1 万个样本；计算两个输出分布之间的 TV 距离。应该 < 0.01。

2. 计算加速公式。给定固定的 `α` 和 `K`，画出每次 target 前向的预期 token 数。为 α ∈ {0.5, 0.7, 0.9} 找出最优 K。

3. 训练一个微型 draft。拿一个 124M 的 GPT-2 target，在 1 亿 token 上用 KL 损失蒸馏一个 30M 的 GPT-2 draft。在留出文本上测量 `α`。预期：0.6-0.7。

4. 实现 EAGLE 风格的树起草。不用链，让 draft 在每个深度输出 top-3 分支。构建树注意力 mask。验证 target 接受最长的正确分支。

5. 测量失败模式。在温度=1.5（高随机性）下跑推测解码。展示 α 崩溃，且算法因 draft 开销比普通解码更慢。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Target 模型 | "那个大模型" | 你想采样的慢、高质量模型（p 分布） |
| Draft 模型 | "那个推测者" | 小、快的预测器（q 分布）；小 5-30 倍 |
| K / draft 长度 | "前瞻" | 每次验证传播推测的 token 数 |
| α / 接受率 | "命中率" | draft 的提议被接受的每 token 概率 |
| 精确拒绝规则 | "接受测试" | 保留 target 分布的 r < p/q 比较 |
| 残差分布 | "修正的 p-q" | (p - q)+ / ||(p - q)+||_1，拒绝时要采样的分布 |
| 树起草 | "分支推测" | draft 输出一棵候选树，用树结构注意力 mask 一次验证 |
| 树注意力 mask | "拓扑 mask" | 编码树拓扑的因果 mask，让每个节点只注意它的祖先 |
| Medusa 头 | "并行头" | 给 target 自身加 K 个额外预测头；没有单独的 draft 模型 |
| EAGLE 特征复用 | "隐藏状态 draft" | draft 输入是 target 的最后隐藏状态而非原始 token，缩小 draft |
| 测试时模拟损失 | "EAGLE-3 训练" | 在匹配 target 测试时分布的输出上训练 draft，而非 teacher forcing |

## 延伸阅读

- [Leviathan, Kalai, Matias, 2023 — "Fast Inference from Transformers via Speculative Decoding"](https://arxiv.org/abs/2211.17192) — 精确拒绝规则和理论加速分析
- [Chen, Borgeaud, Irving et al., 2023 — "Accelerating Large Language Model Decoding with Speculative Sampling"](https://arxiv.org/abs/2302.01318) — DeepMind 的并行推测采样论文
- [Cai, Li, Geng, Wang, Wang, Zhu, Dao, 2024 — "Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads"](https://arxiv.org/abs/2401.10774) — draft 模型的并行头替代方案
- [Li, Wei, Zhang, Zhang, 2024 — "EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty"](https://arxiv.org/abs/2401.15077) — 特征复用和树起草
- [Li et al., 2024 — "EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees"](https://arxiv.org/abs/2406.16858) — 动态树拓扑
- [Li et al., 2025 — "EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test"](https://arxiv.org/abs/2503.01840) — 训练时与测试时匹配
- [Fu, Haotian, Peng et al., 2024 — "Break the Sequential Dependency of LLM Inference Using Lookahead Decoding"](https://arxiv.org/abs/2402.02057) — Jacobi/lookahead 解码，一个无推测者的替代方案
