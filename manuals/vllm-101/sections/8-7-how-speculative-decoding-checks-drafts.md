# Speculative decoding 如何校验 draft

> 本节解释 draft 提议、校验和接受过程。

Speculative decoding 希望在不改变输出的前提下，让每个步骤产出更多 token。读完本节，你可以解释 vLLM 如何保证输出不变，以及为什么 batch 越大收益越小。

## 先猜，再校验 {#s-how-speculative-decoding-checks-drafts-guess-then-check}

小 batch 的 decode 步骤要读取全部权重，才能为每个请求生成一个 token。此时 GPU 大部分时间在等内存。Speculative decoding 会利用这段空闲时间。

廉价的 proposer 先猜测接下来的几个 token。Target model 再对这些猜测运行一次前向计算，并为每个位置计算自己的分布。拒绝采样器按顺序检查猜测：只要 target model 的分布支持该猜测就保留；遇到第一个拒绝时，就从 target 的分布中采样一个正确 token，然后停止。因此一步至少会生成一个 token，最多是猜测数加一。

校验过程保证输出分布不变。Greedy sampling 下，只有猜测与 target 的 top token 相同才会保留。随机采样下，拒绝规则会让输出分布与 target model 完全相同。

```figure
id: fig-8-7
kind: sequence
title: 一次 verify pass
claim: 一次 target pass 会保留第一个被拒绝位置之前的 draft，并额外生成一个 token，因此一个真实请求平均每次 pass 产出约 1.8 个 token。
caption: 上半部分按位置展示规则。下半部分是我们的 L4 上由 SGLang 和 EAGLE3 服务的真实 Qwen3-8B 请求；vLLM 使用相同规则。绿色 token 来自 verify pass。来源：manuals/sglang-101/capture/gpu/out-l4/eagle3-generate.txt。
```

## Proposer 的类型 {#s-how-speculative-decoding-checks-drafts-the-proposers}

vLLM 0.31.0 有多种 proposer，可通过 `--speculative-config` 设置：

| 方法 | 猜测来源 |
|---|---|
| `ngram` | 同一个 prompt 中较早出现、且与最近几个 token 匹配的文本 |
| `suffix` | 基于较早 prompt 和答案构建的 suffix tree |
| `eagle`、`eagle3` | 读取 target model 隐状态的小型 draft head |
| `*_mtp` | 部分模型自带的额外预测 head，例如 DeepSeek |
| `draft_model` | 独立的小模型 |

N-gram 和 suffix 方法几乎不增加成本，适合答案会复制 prompt 的任务，例如代码修改。EAGLE3 这类 draft head 需要针对模型训练好的 head，适合开放式文本。`Qwen/Qwen3-8B` 有一个公开的 EAGLE3 head，包含一层和 32,000 token 的 draft vocabulary。

## 负载增大时收益为何下降 {#s-how-speculative-decoding-checks-drafts-why-the-gain-falls-with-load}

Speculative decoding 利用的是计算量小于内存读取量时 GPU 的空闲时间。Batch 越大，每个 byte 对应的计算量越多，空闲时间越少。拒绝猜测所需的校验就会增加实际计算量。vLLM 文档指出，EAGLE 在请求率较低时收益高，在请求率较高时收益较低。

动态模式由此而来：它根据 batch 大小设置猜测数，并在 batch 较大时停止猜测。0.31.0 的在线示例运行在旧 model runner 上。

## 需要关注的指标 {#s-how-speculative-decoding-checks-drafts-what-to-watch}

Engine 会导出提议和接受的 token 数。Acceptance rate 和每步平均 token 数能说明 proposer 是否适合你的文本。如果接受率很高，但单位 token 耗时没有改善，batch 可能已经受计算能力限制。

```takeaways
- Proposer 猜测 token，target model 用一次前向 pass 接受或拒绝这些猜测。
- 拒绝采样规则会让输出分布与 target model 相同。
- 收益来自 GPU 空闲时间，因此 batch 越大，收益越小。
```

Sources: the vLLM source at v0.31.0 (vllm/config/speculative.py, vllm/v1/spec_decode/, vllm/v1/sample/rejection_sampler.py), vLLM documentation at v0.31.0 (docs/features/speculative_decoding/), the model config of Tengyunw/qwen3_8b_eagle3.
