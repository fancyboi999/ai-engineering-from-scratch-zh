# 投机解码 —— 草稿、验证、重复

> 自回归解码是串行的。每个 token 都等着上一个。投机解码打断这条链：一个廉价模型起草 N 个 token，昂贵模型用一次前向通过验证全部 N 个。当草稿对了，你就用一次大模型前向换来了 N 次生成。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 7 · 07（GPT 因果 LM）、阶段 7 · 12（KV Cache 与 Flash Attention）
**预计时间：** ~60 分钟

## 问题背景

一个 70B LLM 在 H100 上采样一个 token 约需 30 ms。一个 3B 草稿模型约需 3 ms。如果我们让 3B 往前起草 5 个 token，再跑 70B *一次*验证全部 5 个，对最多 5 个被接受的 token 来说总计是 `5×3 + 30 = 45 ms`——对比直线生成的 `5×30 = 150 ms`。这就是投机解码的全部卖点：用一点额外 GPU 显存（草稿模型）换 2–4 倍更低的解码延迟。

这个把戏必须保住分布。投机采样由 Leviathan et al.（2023）提出、Chen et al. 同期提出，保证输出序列与大模型自己产生的**分布完全相同**。没有质量取舍。只是更快。

四类草稿-验证器配对主导了 2026 年的推理：

1. **朴素投机（Leviathan 2023）。** 独立的草稿模型（如 Llama 3 1B）+ 验证器（如 Llama 3 70B）。
2. **Medusa（Cai 2024）。** 验证器上的多个解码头并行预测位置 `t+1..t+k`。没有独立草稿模型。
3. **EAGLE 系列（Li 2024、2025）。** 复用验证器隐藏状态的轻量草稿；接受率比朴素的更接近；典型 3–4 倍。
4. **前瞻解码（Fu 2024）。** Jacobi 迭代；完全不需要草稿模型。自投机。小众但无依赖。

2026 年每个生产推理栈都默认出厂投机解码。vLLM、TensorRT-LLM、SGLang 和 llama.cpp 都至少支持朴素 + EAGLE-2。

## 核心概念

### 核心算法

给一个验证器 `M_q` 和一个更便宜的草稿 `M_p`：

1. 设 `x_1..x_k` 是已经解码的前缀。
2. **起草**：用 `M_p` 自回归地提议 `d_{k+1}, d_{k+2}, ..., d_{k+N}`，带草稿概率 `p_1..p_N`。
3. **并行验证**：对 `x_1..x_k, d_{k+1}, ..., d_{k+N}` 跑 `M_q` 一次，得到位置 `k+1..k+N+1` 的验证器概率 `q_1..q_{N+1}`。
4. **从左到右接受/拒绝每个草稿 token**：对每个 `i`，以概率 `min(1, q_i(d_i) / p_i(d_i))` 接受。
5. 在位置 `j` 首次拒绝时：从归一化的"残差"分布 `(q_j - p_j)_+` 采样 `t_j`。`j` 之后的所有草稿都丢弃。
6. 全部 `N` 个都接受时：从 `q_{N+1}` 额外采样一个 token `t_{N+1}`（免费的奖励 token）。

残差分布这个把戏是那个数学洞见，它让输出的分布精确得就像 `M_q` 从头采样一样。

### 什么决定加速

设 `α` = 每个草稿 token 的期望接受率。设 `c` = 草稿对验证器的成本比。每步：

- 朴素生成每 token 一次大模型调用。
- 当 `α` 高时，投机每 `(1 - α^{N+1}) / (1 - α) ≈ 1/(1-α)` 个 token 一次大模型调用。

`α = 0.75`、`N = 5` 时的典型经验法则：大模型调用少 3 倍。草稿成本便宜 5 倍。总墙钟降约 2.5 倍。

**α 取决于：**

- 草稿近似验证器有多好。同族 / 同训练数据显著抬高 α。
- 解码策略。贪心草稿对贪心验证器：α 高。温度采样：更难匹配；接受率下降。
- 任务类型。代码和结构化输出接受更多（可预测）；自由创意写作接受更少。

### Medusa —— 不用草稿模型的草稿

Medusa 用验证器上的额外输出头替代草稿模型。在位置 `t`：

```
共享主干 → 隐藏 h_t
    ├── head_0: 预测 t+1 处的 token  (标准 LM 头)
    ├── head_1: 预测 t+2 处的 token
    ├── head_2: 预测 t+3 处的 token
    ├── head_3: 预测 t+4 处的 token
```

每个头输出自己的 logits。推理时你从每个头采样得到一个候选序列，再用一个一次性考虑所有候选续写的树注意力方案、用一次前向通过验证。

优点：没有第二个模型。缺点：增加可训练参数；需要一个监督微调阶段（~1B token）；接受率比配好草稿的朴素投机略低。

### EAGLE —— 靠复用隐藏状态得到更好的草稿

EAGLE-1/2/3（Li et al.，2024–2025）把草稿模型做成一个微小的 transformer（通常 1 层），它吃验证器的最后一层隐藏状态。因为草稿看到了验证器的特征表示，它的预测和验证器的输出分布强相关。接受率从约 0.6（朴素）爬到 0.85+。

EAGLE-3（2025）加了对候选续写的树搜索。vLLM 和 SGLang 把 EAGLE-2/3 作为 Llama 3/4 和 Qwen 3 的默认投机路径出厂。

### KV 缓存之舞

验证把 `N` 个草稿 token 在一次前向通过里喂进验证器。这把验证器的 KV 缓存扩展 `N` 个条目。如果某些草稿被拒，你必须把缓存回滚到被接受的前缀长度。

生产实现（vLLM 的 `--speculative-model`、TensorRT-LLM 的 LookaheadDecoder）用临时 KV 缓冲处理这点。先写，接受时提交。概念上不难，但很琐碎。

```figure
draft-verify-tokens
```

## 动手构建

见 `code/main.py`。我们实现核心的投机采样算法（拒绝步 + 残差分布），含：

- 一个"大模型"，是手写分布上的确定性 softmax（这样我们能解析地验证接受的数学）。
- 一个"草稿模型"，是大模型的扰动版。
- 一个接受/拒绝循环，产生与直接采样相同的边缘分布。

### 第 1 步：拒绝步

```python
def accept_or_reject(q_prob, p_prob, draft_token, u):
    ratio = q_prob / p_prob if p_prob > 0 else float("inf")
    return u < min(1.0, ratio)
```

`u` 是一个均匀随机数。`q_prob` 是验证器对起草 token 的概率。`p_prob` 是草稿模型的概率。Leviathan 定理是说：这个伯努利决策，加上拒绝时从残差采样，精确保住验证器的分布。

### 第 2 步：残差分布

```python
def residual_dist(q, p):
    raw = [max(0.0, qi - pi) for qi, pi in zip(q, p)]
    s = sum(raw)
    return [r / s for r in raw]
```

逐元素从 `q` 减去 `p`，把负值钳到零，重新归一化。任何拒绝时从这里采样。

### 第 3 步：一次投机步

```python
def spec_step(prefix, q_model, p_model, N, rng):
    drafts = []
    p_probs = []
    ctx = list(prefix)
    for _ in range(N):
        p_dist = p_model(ctx)
        d = sample(p_dist, rng)
        drafts.append(d)
        p_probs.append(p_dist[d])
        ctx.append(d)

    q_dists = [q_model(prefix + drafts[:i]) for i in range(N + 1)]

    for i, d in enumerate(drafts):
        u = rng.random()
        q_prob = q_dists[i][d]
        p_prob = p_probs[i]
        if u < min(1.0, q_prob / p_prob if p_prob > 0 else float("inf")):
            prefix = prefix + [d]
        else:
            res = residual_dist(q_dists[i], p_model(prefix))
            prefix = prefix + [sample(res, rng)]
            return prefix
    prefix = prefix + [sample(q_dists[N], rng)]
    return prefix
```

接受 5 个 → 一个奖励 → 一次验证器通过产出 6 个 token。

### 第 4 步：测量接受率

在不同草稿质量水平下跑 10,000 个投机步。画接受率 vs 草稿和验证器分布之间的 KL 散度。你应该看到一条干净的单调关系。

### 第 5 步：验证分布等价

经验上：投机循环产出的 token 直方图应该匹配直接从验证器采样产出的直方图。这是 Leviathan 定理的实践。卡方检验在采样误差内确认。

## 实际使用

生产：

```bash
# vLLM 配 EAGLE
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --speculative-model /models/llama-3.1-eagle-70b \
    --speculative-draft-tensor-parallel-size 1 \
    --num-speculative-tokens 5

# vLLM 配朴素草稿模型
vllm serve meta-llama/Llama-3.1-70B-Instruct \
    --speculative-model meta-llama/Llama-3.2-1B-Instruct \
    --num-speculative-tokens 5
```

截至 2026 年中，TensorRT-LLM 有最快的 Medusa 路径。`faster-whisper` 用一个小草稿为 Whisper-large 封装了投机解码。

**挑草稿：**

| 策略 | 何时选 | 加速 |
|----------|--------------|---------|
| 朴素草稿（1B/3B Llama 族） | 快速原型，无需训练 | 1.8–2.3× |
| Medusa 头 | 你能微调验证器 | 2–3× |
| EAGLE-2 / 3 | 生产、追求极速 | 3–4× |
| 前瞻 | 无草稿、无训练、无额外参数 | 1.3–1.6× |

**什么时候别投机解码：**

- 单序列生成 1–5 个 token。开销占主导。
- 极其创意 / 高温采样（α 下降）。
- 显存受限的部署（草稿模型增加显存）。

## 拿去用

见 `outputs/skill-spec-decode-picker.md`。这个 skill 为一个新的推理负载挑选投机解码策略（朴素 / Medusa / EAGLE / 前瞻）和调优参数（N、草稿温度）。

## 练习

1. **简单。** 跑 `code/main.py`。在 50,000 个 token 上确认投机 token 分布在卡方 p > 0.05 内匹配验证器的直接采样分布。
2. **中等。** 对 `α = 0.5, 0.7, 0.85` 画加速（每次大模型前向的 token 数）作为 `N` 的函数。为每个 α 找出最优 `N`。（提示：每次验证调用的期望 token 数 = `(1 - α^{N+1}) / (1 - α)`。）
3. **困难。** 实现一个迷你 Medusa：拿第 14 课的收官 GPT，加 3 个额外 LM 头预测位置 t+2、t+3、t+4。在 tinyshakespeare 上用联合多头损失训练。和把同一模型截断做成的朴素草稿对比接受率。
4. **困难。** 实现回滚：从一个 10 token 前缀的 KV 缓存开始，喂 5 个草稿 token，模拟位置 3 处一次拒绝。验证下一次迭代你的缓存读取正确匹配"前缀 + 前 2 个被接受的草稿"。

## 关键术语

| 术语 | 大家嘴上怎么说 | 实际是什么意思 |
|------|-----------------|-----------------------|
| 草稿模型 | "便宜那个" | 提议候选 token 的较小模型；通常比验证器便宜 10–50 倍。 |
| 验证器 | "大那个" | 我们要保住其分布的目标模型；每个投机步跑一次。 |
| 接受率（α） | "草稿多常对" | 验证器接受草稿的每 token 概率。典型 0.7–0.9。 |
| 残差分布 | "拒绝时的兜底" | 归一化的 `(q - p)_+`；拒绝时从这里采样保住验证器的分布。 |
| 奖励 token | "免费那个" | 全部 N 个草稿都接受时，从验证器下一步分布再采一个。 |
| Medusa | "无草稿投机" | 验证器上的多个 LM 头并行预测位置 t+1..t+k。 |
| EAGLE | "隐藏状态草稿" | 以验证器最后一层隐藏状态为条件的微小 transformer 草稿。 |
| 前瞻解码 | "Jacobi 迭代" | 用不动点迭代做自投机；无草稿模型。 |
| 树注意力 | "一次验证多个候选" | 分支验证，同时考虑几个草稿续写。 |
| KV 回滚 | "撤销被拒草稿" | 临时 KV 缓冲；接受时提交，拒绝时丢弃。 |

## 延伸阅读

- [Leviathan, Kalman, Matias (2023). Fast Inference from Transformers via Speculative Decoding](https://arxiv.org/abs/2211.17192) —— 核心算法和等价定理。
- [Chen et al. (2023). Accelerating Large Language Model Decoding with Speculative Sampling](https://arxiv.org/abs/2302.01318) —— 同期提出；干净的伯努利拒绝证明。
- [Cai et al. (2024). Medusa: Simple LLM Inference Acceleration Framework with Multiple Decoding Heads](https://arxiv.org/abs/2401.10774) —— Medusa 论文；树注意力验证。
- [Li et al. (2024). EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty](https://arxiv.org/abs/2401.15077) —— EAGLE-1；以隐藏状态为条件的草稿。
- [Li et al. (2024). EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees](https://arxiv.org/abs/2406.16858) —— EAGLE-2；动态树深度。
- [Li et al. (2025). EAGLE-3: Scaling up Inference Acceleration of Large Language Models via Training-Time Test](https://arxiv.org/abs/2503.01840) —— EAGLE-3。
- [Fu et al. (2024). Break the Sequential Dependency of LLM Inference Using Lookahead Decoding](https://arxiv.org/abs/2402.02057) —— 前瞻、无草稿方法。
- [vLLM docs — Speculative Decoding](https://docs.vllm.ai/en/latest/features/spec_decode.html) —— 接好全部四种策略的规范生产参考。
- [SafeAILab / EAGLE reference implementation](https://github.com/SafeAILab/EAGLE) —— EAGLE-1/2/3 的参考代码。
