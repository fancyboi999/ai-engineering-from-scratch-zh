# 推测解码与 EAGLE-3

> 阶段 7 · 第 16 课证明了数学：Leviathan 拒绝规则精确保留了验证器的分布。本节课是 2026 年生产级推测解码的训练栈视角。EAGLE-3 把 draft 模型从一个廉价近似变成了一个专门构建、在验证器自己的隐藏状态上训练的小网络，然后加了一个训练时测试循环来对齐它的训练和推理分布。结果：端到端 3 倍到 6.5 倍加速，聊天上每 token 接受率超过 0.9，无分布权衡。2026 年每个生产推理栈都默认装它。

**类型：** Build
**语言：** Python（stdlib）
**前置要求：** 阶段 7 · 16（推测解码数学），阶段 10 · 12（推理优化）
**预计时间：** ~75 分钟

## 学习目标

- 用一句话陈述 Leviathan 定理，并证明推测循环产出的样本与验证器同分布。
- 走一遍从原版推测解码（Leviathan 2023）经 EAGLE、EAGLE-2 到 EAGLE-3 的两年演进，点出每一步移除的确切局限。
- 从接受率 `α` 和 draft 对验证器的成本比 `c` 计算预期加速，并为每个区间选择最优 draft 长度 `N`。
- 从零实现完整的推测循环：起草、验证、从残差拒绝采样、拒绝时回滚 KV cache、完全接受时发出 bonus token。

## 问题背景

70B 模型上的自回归解码在 H100 上也许跑 35 token/秒。GPU 远没饱和。内存带宽是天花板：每个 token 从 HBM 加载 70B 权重，做一步算术，产出一个 float。计算单元大部分时间闲着。

推测解码把这个变成一个你实际能解的吞吐问题。一个廉价的 draft 用 `N` 次小前向传播提议 `N` 个 token。验证器在前缀加全部 `N` 个 draft 上跑一次。如果验证器在位置 `i` 的分布和 draft 一致（在一个我们会精确化的统计意义上），我们接受；如果不，我们拒绝并从残差分布采样一个修正。一次大模型前向产出最多 `N+1` 个被接受的 token，而不是一个。

要紧的定理是 Leviathan、Kalman、Matias（ICML 2023）：输出分布和直接从验证器采样会产出的完全相同。不是近似。是完全相同。这就是推测解码在生产里可接受的全部理由——它是纯粹的延迟优化，没有质量权衡。

阶段 7 · 第 16 课给你的是数学。本节课给你的是训练栈。一个好的 draft 比一个廉价的 draft 多值 2 倍加速。EAGLE、EAGLE-2 和 EAGLE-3（Li et al., 2024–2025）把 "draft = 同一个模型的更小版本" 变成了一门精确的工程学科。2026 年生产推理服务器默认 EAGLE-3。

## 核心概念

### 不变量：Leviathan 拒绝采样

设 `p(t)` 是给定某个前缀时 draft 对下一个 token 的分布，`q(t)` 是验证器的。采样一个 draft token `d ~ p`。以概率 `min(1, q(d) / p(d))` 接受。拒绝时，从残差分布 `(q - p)_+ / ||(q - p)_+||_1` 采样。所得样本按 `q` 分布。无论 `p` 多差这都成立——它越差，你拒绝越频繁，但输出保持精确。

用一次验证器在 `prefix + d_1 + ... + d_N` 上的前向传播，把 `N` 次这样的调用背靠背叠起来。验证器同时返回 `q_1, q_2, ..., q_{N+1}`。从左到右走。在位置 `j` 的第一次拒绝时，从 `residual(q_j, p_j)` 采样并停止。完全接受时，从 `q_{N+1}` 采样一个 bonus token。

### 什么决定加速

设 `α` 是每个起草 token 的预期接受率。设 `c = cost(draft) / cost(verifier)` 是成本比。每次验证器前向预期接受的 token 数是：

```
E[accepted] = (1 - α^(N+1)) / (1 - α)
```

每个被接受 token 的预期总墙钟时间是 `(N * c + 1) / E[accepted]`。对 `N` 最小化它就得到甜点区。对 `α = 0.8, c = 0.05`：最优 `N` 约 5-7，加速 3.2 倍。对 `α = 0.95, c = 0.02`：最优 `N` 约 8-10，加速逼近 5 倍。

最大的单个杠杆是 `α`。在固定 `N = 5` 下从 `α = 0.6`（原版 draft）走到 `α = 0.9`（EAGLE-3），让你从每次验证器前向 2.2 个预期接受 token 变成 4.1 个。同一个验证器近乎 2 倍的吞吐。

### 两年演进

**原版推测（Leviathan，2023）。** Draft 模型是同家族独立训练的更小 LLM。容易接上，`α ≈ 0.6`，加速至多约 2 倍。

**EAGLE-1（Li et al., 2024）。** Draft 是一个小 transformer——通常一两层——它接收验证器的最后一层隐藏状态作为输入，直接预测下一个 token。因为 draft 看到了验证器的特征表示，它的分布和验证器的更接近。`α` 爬到 0.7-0.8。

**EAGLE-2（Li et al., 2024）。** 加了一棵动态 draft 树：不提议单条 `N` 个 token 的序列，而是提议一棵小候选树，用验证器在一次前向传播里给每个打分（树注意力），走概率最高的路径。Draft 长度变成每步自适应。被接受路径上每 token 的 `α` 爬过 0.85。

**EAGLE-3（Li et al., 2025，NeurIPS）。** 又两处改动。第一，完全丢掉特征预测损失——EAGLE-1/2 训练 draft 去匹配验证器的隐藏状态，这给数据能帮多少封了顶。EAGLE-3 直接在 token 预测上训练。第二，训练时测试（TTT）：draft 训练时，把 draft 自己之前的预测作为输入喂回去、跨多步，和它推理时的运作方式一样。这对齐了训练和测试分布，止住了误差累积。实测加速：聊天上至多 6.5 倍，在 H100 的 SGLang batch 64 下吞吐提升 38%。

### KV cache 回滚

验证一次性把验证器的 KV cache 扩展 `N` 个条目。如果拒绝发生在位置 `j`，超过位置 `j-1` 的缓存内容现在是错的。两种常见实现：写到一个临时缓冲、接受时提交（vLLM、TensorRT-LLM），或保留一个物理 KV cache 加一个逻辑长度、拒绝时截断。无论哪种，回滚成本是每层每头几个字节，相比前向传播成本可忽略。

对 EAGLE-2 树搜索，验证器用一个尊重树拓扑的非因果 mask 跑注意力。工程上麻烦，但计算是一次带自定义 mask 的标准 flash-attention 调用。

### 2026 年的 draft 架构

| 策略 | Draft 类型 | `α` | 加速 | 训练成本 |
|----------|-----------|-----|---------|---------------|
| 原版 | 单独的小 LLM | 0.55-0.70 | 1.8-2.3 倍 | 无（复用现有小模型） |
| Medusa | 验证器上的额外 LM 头 | 0.65-0.75 | 2-3 倍 | ~1B SFT token |
| EAGLE-1 | 隐藏状态上的 1 层 transformer | 0.70-0.80 | 2.5-3 倍 | ~60B token |
| EAGLE-2 | EAGLE-1 + 动态 draft 树 | 0.80-0.88 | 3-4 倍 | ~60B token |
| EAGLE-3 | 多层特征融合 + TTT | 0.88-0.92 | 3.5-6.5 倍 | ~60-200B token |
| Lookahead | 无 draft（Jacobi 迭代） | 不适用 | 1.3-1.6 倍 | 无 |

2026 年生产里：vLLM 和 SGLang 在可用时默认 EAGLE-3，否则 EAGLE-2。TensorRT-LLM 对 Meta 和 NVIDIA 公开模型有最快的 Medusa 路径。llama.cpp 为 CPU 部署装原版 draft。

```figure
l5-spec-decode-eagle
```

## 动手构建

见 `code/main.py`。这是完整的 Leviathan 推测循环，带所有部件：起草 N 个、验证器并行传播、按位置拒绝、残差采样、bonus token、KV 回滚，以及对输出分布匹配直接从 `q` 采样的经验验证。

### 第 1 步：拒绝规则

```python
def accept(q_prob, p_prob, u):
    if p_prob <= 0:
        return True
    return u < min(1.0, q_prob / p_prob)
```

### 第 2 步：残差分布

```python
def residual(q, p):
    raw = [max(0.0, qi - pi) for qi, pi in zip(q, p)]
    s = sum(raw)
    if s == 0:
        return list(q)
    return [r / s for r in raw]
```

### 第 3 步：一个完整的推测步骤

`spec_step` 函数从 `p` 起草 `N` 个 token，然后在一次并行 `q` 评估里验证它们全部。对每个起草 token 应用拒绝规则，在第一次拒绝时从残差采样修正。如果全部接受，它从 `q_{N+1}` 发出一个 bonus token。

### 第 4 步：KV 回滚记账

模拟器为每个 worker 跟踪一个逻辑 `kv_length`。接受 `k` 个 draft 时，`kv_length += k`。在位置 `j` 的一次拒绝时，缓存已经写过了 `j`，但逻辑长度被设为 `prefix_length + j + 1`——修正 token 之后一个。后续读取截断到逻辑长度。

### 第 5 步：Leviathan 检查

跑 50,000 次推测步骤。统计被接受 token 的经验分布。和 50,000 次直接从 `q` 采样对比。卡方统计量应该远低于临界值。定理在实践中通过。

### 第 6 步：加速 vs. α

通过以不同幅度把 `p` 从 `q` 扰开来扫描 draft 质量。测量 `α`，然后把每次验证器调用的预期 token 数作为 `α` 和 `N` 的函数画出来。代码打印一张表，显示 EAGLE-3 级别的 draft 质量（`α ≈ 0.9`）如何解锁每次验证器调用 4-5 个 token。

## 实际使用

带 EAGLE-3 的生产级 `vllm serve`：

```bash
vllm serve meta-llama/Llama-3.3-70B-Instruct \
  --speculative-config '{
    "model": "yuhuili/EAGLE3-LLaMA3.3-Instruct-70B",
    "num_speculative_tokens": 5,
    "method": "eagle3"
  }'
```

SGLang 在 H100 上 batch 64 带 EAGLE-3：据 EAGLE-3 论文，相比 batch-64 原版解码大约多 1.38 倍吞吐。

什么时候上推测解码：

- 任何 p50 延迟比峰值吞吐更要紧的交互式聊天工作负载。
- 代码生成和结构化输出（JSON、SQL）。`α` 超过 0.9，因为目标分布高度可预测。
- 长篇生成（数千个 token）。摊薄后的加速持续付费。

什么时候不上：

- 非常小的模型（< 3B）。draft 没比验证器便宜多少。
- 微小的 batch-1 CPU 部署。draft 模型的内存开销可能不值。
- 接受率 `α` 崩溃的极高温度创意采样。

## 拿去用

本节课产出 `outputs/skill-eagle3-tuner.md`。给定一个推理工作负载（模型、batch size、目标延迟、任务画像），它推荐一个推测解码策略和调优参数（draft 家族、`N`、树深度、温度感知切换）。

## 练习

1. 跑 `code/main.py`。确认 Leviathan 分布检查的卡方统计量在 50,000 个样本上保持低于 95% 临界值。

2. 把 `N` 从 1 扫到 10，`α` 固定在 0.9、`c` 固定在 0.04。画出每次验证器调用的预期 token 数和每 token 实际墙钟时间。找出最小化墙钟的 `N`。解释曲线的形状。

3. 改代码模拟 EAGLE-2 树搜索：每步 draft 提议一棵形状为 `[2, 2, 2]` 的树（八条候选路径）。验证器跑一次，概率最高的被接受路径胜出。计算每个叶子的 `α` 和每次验证器调用的总 token 数。在等价算力下和线性链推测解码对比。

4. 为两条并发序列实现一个批量 KV 回滚模拟器。序列 A 全部 draft 被接受；序列 B 在位置 2 拒绝。展示每条序列的 `kv_length` 被正确更新，且没有工作被浪费。

5. 读 EAGLE-3 论文第 4 节（训练时测试）。用两句话解释为什么没有 TTT 的朴素 draft 训练受暴露偏差之苦，以及为什么训练时把 draft 自己的预测喂给它能修复这个问题。把它和 seq2seq 里的 scheduled-sampling 文献联系起来。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Leviathan 规则 | "min(1, q 除以 p)" | 以概率 `min(1, q(d)/p(d))` 做伯努利接受/拒绝，当拒绝时从残差采样时精确保留验证器分布 |
| 残差分布 | "(q 减 p) 的正部，归一化" | `(q - p)_+` 钳到零并重归一化——拒绝时正确的采样分布 |
| 接受率 α | "draft 多常对" | 拒绝规则下每 token 的预期伯努利成功概率；主宰所有加速数学 |
| EAGLE-1 | "隐藏状态 draft" | 以验证器最后一层隐藏状态为条件的小 transformer draft（Li et al., 2024） |
| EAGLE-2 | "动态 draft 树" | EAGLE-1 加一棵候选续写树，在一次验证器传播里用树注意力打分 |
| EAGLE-3 | "训练时测试" | 丢掉特征预测损失，在直接 token 预测上训练，训练时把 draft 自己的输出喂给它 |
| 训练时测试（TTT） | "暴露偏差修复" | 训练时让 draft 自回归运行，使训练和测试输入分布匹配——scheduled sampling 的直接类比 |
| KV 回滚 | "撤销被拒的 draft" | 拒绝后把验证器的 KV cache 重置到被接受前缀长度的记账 |
| Bonus token | "免费那个" | 当所有 `N` 个 draft 都接受时，从 `q_{N+1}` 额外采样一个，无需额外验证器成本 |
| 树注意力 | "一次验证许多候选" | 带尊重 draft 树拓扑的非因果 mask 的注意力；在一次前向传播里为树中每个节点计算 `q_i` |

## 延伸阅读

- [Leviathan, Kalman, Matias — Fast Inference from Transformers via Speculative Decoding (arXiv:2211.17192, ICML 2023)](https://arxiv.org/abs/2211.17192) — 奠基性论文和等价定理
- [Chen et al. — Accelerating Large Language Model Decoding with Speculative Sampling (arXiv:2302.01318)](https://arxiv.org/abs/2302.01318) — 并行独立提出，带一个干净的证明
- [Li et al. — EAGLE: Speculative Sampling Requires Rethinking Feature Uncertainty (arXiv:2401.15077)](https://arxiv.org/abs/2401.15077) — EAGLE-1，隐藏状态条件化的 draft
- [Li et al. — EAGLE-2: Faster Inference of Language Models with Dynamic Draft Trees (arXiv:2406.16858)](https://arxiv.org/abs/2406.16858) — 动态树搜索
- [Li et al. — EAGLE-3: Scaling up Inference Acceleration via Training-Time Test (arXiv:2503.01840, NeurIPS 2025)](https://arxiv.org/abs/2503.01840) — 2026 年生产默认
- [Cai et al. — Medusa: Multiple Decoding Heads (arXiv:2401.10774)](https://arxiv.org/abs/2401.10774) — 替代的无 draft 方法
- [vLLM Speculative Decoding documentation](https://docs.vllm.ai/en/latest/features/spec_decode.html) — 接好所有策略的经典生产参考
