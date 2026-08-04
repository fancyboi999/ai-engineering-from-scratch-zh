# 生产环境中的 EAGLE-3 Speculative Decoding

> Speculative decoding 把一个快速草稿模型和目标模型配成一对。草稿提出 K 个 token；目标用一次 forward 验证；被接受的 token 是免费的。2026 年，EAGLE-3 是生产级的变体 —— 它把草稿头训练在目标模型的隐藏状态上，而不是原始 token 上，把接受率 alpha 推进到通用聊天上的 0.6-0.8 区间。正确的问题不是"草稿有多快"，而是"我的流量上 alpha 是多少"。如果 alpha 掉到约 0.55 以下，在高并发下 speculative decoding 就是净负 —— 因为每个被拒的草稿都要花掉目标模型第二次 forward。这一课教你先量 alpha，再去翻那个开关。

**类型：** Learn
**语言：** Python（标准库，一个玩具级接受率模拟器）
**前置要求：** 阶段 17 · 04（推理服务引擎内部机制）、阶段 10 · 18（多 token 预测）
**预计时间：** ~60 分钟

## 学习目标

- 说出 speculative decoding 的三代，并解释 EAGLE-3 相比 EAGLE-2 和相比经典草稿模型改了什么。
- 定义接受率 alpha，从 alpha 和 K（草稿长度）算出预期加速比，并找出你目标并发下的盈亏平衡 alpha。
- 解释为什么在 2026 年的 vLLM 里 speculative decoding 是 opt-in（不是默认），以及为什么不量 alpha 就打开它是一种生产反模式。
- 写一份测量方案：用哪个基准、哪种 prompt 分布、哪个并发点、用哪个指标做闸门。

## 问题背景

Decode 是内存受限的。一块 H100 跑 Llama 3.3 70B FP8，每解码一个 token 要读约 140 GB/s 的权重、吐出一个 token。decode 期间 GPU 算力几乎闲着 —— 瓶颈是 HBM 带宽，不是 matmul 吞吐。

Speculative decoding 利用了这个空当。用一个便宜的草稿模型生成 K 个候选 token，然后让目标模型用一次 forward 把这 K 个全部验证。每个验证通过的 token 实际上是免费的（摊进了一次目标本来就得做的 K 个一批的 forward 里）。

经典草稿模型方法用同一系列的小模型（用 Llama 3.2 1B 给 Llama 3.3 70B 打草稿）。它能跑，但接受率平平 —— 小模型的分布偏离目标。EAGLE，然后 EAGLE-2，再然后 EAGLE-3，把一个轻量草稿头直接训练在目标模型的内部状态上，于是草稿的分布跟目标贴得近得多。这就是为什么 alpha 从草稿模型的 0.4 涨到 EAGLE-3 的 0.6-0.8。

陷阱在于：EAGLE-3 在 2026 年的 vLLM 里是 opt-in。`speculative_config` 必须显式设置。没有 flag，就没有加速。不在自己真实流量上量 alpha 就打开它的团队，常常看到尾延迟变差，而不是变好。

## 核心概念

### Speculative decoding 实际买来了什么

没有 spec decode 时，每 token 成本是一次目标 forward。有 spec decode、草稿长度 K、接受率 alpha 时，每次目标 forward 的预期 token 数是 `1 + K * alpha`。加速比是 `(1 + K * alpha) / (1 + epsilon)`，其中 epsilon 是草稿加验证的开销。K=5、alpha=0.7 时：`(1 + 5*0.7) / (1 + 0.1) = 4.5 / 1.1 = 4.1x`。现实数字聚在 2-3x 附近，因为生产流量上 alpha 很少那么高，而且 epsilon 在高批大小下会涨。

### 为什么 alpha 是唯一重要的指标

被拒的 token 不会凭空消失 —— 它们逼出针对第一个被拒 token 的第二次目标 forward。在一个 alpha 掉到 0.4 的工作负载上，你付草稿开销加验证加重掷。在高并发下（比如 256 并发），decode 批次已经大到足以让"单跑目标"和"目标带验证"之间的内存带宽差距缩小。在 2026 年大多数硬件上，alpha 低于 0.55 时，spec decode 就是净负。

Alpha 随工作负载变。在 ShareGPT 式通用聊天上，用 ShareGPT 训练的 EAGLE-3 命中 0.6-0.8。在领域特定流量（代码、医疗、法律）上，用通用数据训练的草稿头掉到 0.4-0.6。训练一个领域特定的草稿头能把 alpha 找回来 —— 相比目标微调，这是一个轻量、快速的训练任务。

### EAGLE 各代速览

- **经典草稿模型**：同系列的小模型。Alpha 0.3-0.5。基础设施简单 —— 加载两个模型，草稿在每次目标 forward 上跑 K 次 forward。
- **EAGLE-1（2024）**：训练在目标隐藏状态（最后一层）上的单个草稿头。Alpha ~0.5-0.6。在目标之上加一点参数开销。
- **EAGLE-2（2025）**：自适应草稿长度和基于树的草稿（在一次目标 pass 里验证多条分支）。Alpha ~0.6-0.7。草稿调度器更复杂。
- **EAGLE-3（2025-2026）**：草稿头训练在多个目标层上（不只最后一层），对齐更好。通用聊天上 Alpha ~0.6-0.8。

### 2026 年的生产配方

1. 先朴素地上目标模型。在目标并发下量基线 TTFT、ITL、吞吐。
2. 通过 vLLM 的 `speculative_config` 启用 EAGLE-3 草稿。重跑基准。
3. 记录接受率 alpha。vLLM V1 把它报成 `spec_decode_metrics.accepted_tokens_per_request`。除以请求的草稿长度得到 alpha。
4. 如果在生产流量分布上 alpha < 0.55，关掉 spec decode 或训练一个领域特定的 EAGLE-3 草稿。
5. 在生产并发下重跑。确认 P99 ITL 没变差。

### 生产陷阱：P99 尾部

均值 ITL 会随 spec decode 下降。如果你不调，P99 可能变差。被拒的草稿触发一个两遍序列（草稿 + 验证失败 + 重掷）。在满批下，这两遍会串行化。盯 P99 ITL，不是 P50。

### EAGLE-3 已经部署在哪

Google 在 2025 年把 speculative decoding 部署进了 AI Overviews（质量相同，响应更快）。vLLM V1 把 `speculative_config` 作为有文档的接口发布；V1 里的 N-gram GPU speculative decoding 是与 chunked prefill 兼容的变体。SGLang 支持 EAGLE-3，把它作为 prefix 重的工作负载推荐的草稿路径。

### 一行盈亏平衡数学

预期加速比：`S(alpha, K) = (1 + K*alpha) / (1 + verify_overhead)`。令 `S = 1` 解出 alpha：`alpha_breakeven = verify_overhead / K`。对典型的 verify_overhead ~0.15 和 K=5：`alpha_breakeven = 0.03`。但那是裸 decode 数学。在高并发下，验证开销上升，而 decode 批次已经跨序列摊薄了内存读取，所以实践中有效的 alpha_breakeven 爬到 ~0.45-0.55。

### 什么时候别用 speculative decoding

- 延迟无所谓的 batch-1 离线生成。用朴素目标。
- 极短输出（不到 50 token）。草稿开销和验证成本占主导。
- 没有领域训练草稿头的专门领域。Alpha 太低。
- vLLM v0.18.0 加草稿模型 spec decode 加 `--enable-chunked-prefill`。这个组合编译不过。有文档的例外是 V1 里的 N-gram GPU spec decode。

```figure
mx-speculative-tree
```

## 实际使用

`code/main.py` 在一段 alpha 值和草稿长度 K 的范围上，模拟带和不带 speculative decoding 的 decode 循环。它打印盈亏平衡 alpha、实测加速比和尾部行为。在几个 (alpha, K) 组合上跑它，看看 speculative decoding 到底在哪里不再划算。

## 拿去用

这一课产出 `outputs/skill-eagle3-rollout.md`。给定一个目标模型、一段流量分布描述和一个并发目标，它产出一份分阶段的 EAGLE-3 上线方案 —— 基准基线、启用配置、量 alpha、以 alpha >= 0.55 为闸门、盯 P99 ITL。

## 练习

1. 跑 `code/main.py`。K=5 时，要 2x 加速你需要多少 alpha？要 3x 呢？这对 verify_overhead 有多敏感？
2. 设想生产流量 70% 通用聊天、30% 代码。通用聊天用 ShareGPT 训练的 EAGLE-3 命中 alpha 0.7；代码命中 alpha 0.4。混合 alpha 是多少，spec decode 是净正吗？
3. 读 vLLM 的 `speculative_config` 文档。说出三种模式（草稿模型、EAGLE、N-gram），以及哪一个与 chunked prefill 兼容。
4. 你看到启用 EAGLE-3 后均值 ITL 降了 25%，但 P99 ITL 涨了 15%。诊断并提出一个缓解方案。
5. 算一算 Llama 3.3 70B 的 EAGLE-3 草稿头的内存开销。它和把 Llama 3.2 1B 当经典草稿来跑相比如何？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Speculative decoding | "草稿加验证" | 用便宜模型提出 K 个 token，一次目标 forward 验证全部 K 个 |
| 接受率 alpha | "spec 接受率" | 被目标接受的草稿 token 比例；唯一重要的指标 |
| 草稿长度 K | "spec k" | 草稿每次目标 forward 提出多少 token；典型 4-8 |
| 验证开销 epsilon | "spec 开销" | 验证并重掷相比朴素目标 forward 的额外成本；随批增长 |
| EAGLE-3 | "最新 EAGLE" | 2025-2026 变体；把草稿头训练在多个目标层上；通用聊天 alpha 0.6-0.8 |
| `speculative_config` | "vLLM spec 配置" | vLLM V1 里的显式 opt-in；没默认意味着没加速 |
| N-gram spec decode | "N-gram 草稿" | GPU 侧用 prompt 里 N-gram 查找的草稿；与 chunked prefill 兼容 |
| 盈亏平衡 alpha | "无效 alpha" | spec decode 加速比为零时的 alpha；在生产并发下盯它 |
| 拒草稿两遍 | "重掷成本" | 草稿被拒时的两次目标 forward；推高 P99 尾部 |

## 延伸阅读

- [vLLM — Speculative Decoding docs](https://docs.vllm.ai/en/latest/features/spec_decode/) —— V1 里 `speculative_config` 与 chunked prefill 兼容性的权威来源。
- [vLLM Speculative Config API](https://docs.vllm.ai/en/latest/api/vllm/config/speculative/) —— 准确的字段集。
- [EAGLE paper (arXiv:2401.15077)](https://arxiv.org/abs/2401.15077) —— 原始 EAGLE 草稿头表述。
- [EAGLE-2 paper (arXiv:2406.16858)](https://arxiv.org/abs/2406.16858) —— 自适应草稿与树。
- [UC Berkeley EECS-2025-224](https://www2.eecs.berkeley.edu/Pubs/TechRpts/2025/EECS-2025-224.html) —— 带 speculative decoding 的高效 LLM 系统。
- [BentoML — Speculative Decoding](https://bentoml.com/llm/inference-optimization/speculative-decoding) —— 生产上线清单。
