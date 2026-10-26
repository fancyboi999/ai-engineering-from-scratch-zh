# 使用 EAGLE3 加速解码

> EAGLE3 在低并发时收益明显；共享每一步的用户越多，合适的 draft 深度就越低。

低负载时，用户仍可能要等很久才拿到完整回答。读完本节后，你可以根据并发数选择 draft 深度。

**我们的结果：**在锁定时钟的 L4 上，32 个用户使用深度 3 时，EAGLE3 的输出吞吐达到未启用 speculative decoding 时的 1.6 倍。提示词来自随机数据集，输出长度为 128 个 token。

## 启用 EAGLE3 {#s-speed-up-decode-with-eagle3-turn-it-on}

EAGLE3 使用一个小型 draft model，根据 target model 的隐藏状态预测后续 token。target model 会在一次前向计算中校验这些预测，详见[speculative decoding 的校验过程](#s-how-speculative-decoding-checks-drafts-guess-then-check)。target model 只保留自己也会生成的预测结果。

你需要为 target model 训练好的 draft model。我们在 `Qwen/Qwen3-8B` 上使用了 `Tengyunw/qwen3_8b_eagle3`：

```bash
vllm serve Qwen/Qwen3-8B \
  --speculative-config '{"method": "eagle3", "model": "Tengyunw/qwen3_8b_eagle3", "num_speculative_tokens": 3}'
```

`num_speculative_tokens` 是 draft 深度，也就是 draft model 每一步猜测的 token 数。如果省略这个选项，vLLM 会读取 draft 配置中的值（若配置存在）。建议显式设置，这样你能确认实际运行的参数。

EAGLE3 会保持异步调度开启。[异步调度一节](#s-leave-async-scheduling-on-know-what-it-does)说明了哪些方法会关闭它。

## draft 深度为何重要 {#s-speed-up-decode-with-eagle3-know-why-the-depth-matters}

更深的 draft 每次可以向 target model 提供更多 token，但 target model 校验每个猜测也需要计算。只有一个用户时，GPU 每一步都有空余算力，额外猜测几乎不增加成本。并发用户很多时，每一步已经接近满载；错误猜测会占用本可用于真实 token 的算力。

## 实测结果 {#s-speed-up-decode-with-eagle3-see-what-our-runs-show}

**我们测得：**2026-10-22，我们在 L4 上使用 `Qwen/Qwen3-8B`，比较了 draft 深度 1、3、5 与未启用 speculative decoding 的结果。这次测试位于[900 MHz 锁频时段](#s-front-l4-sessions)，并发数为 1 和 32，每个配置使用两个随机种子。提示词来自基准工具的随机数据集，输入 512 个 token，输出 128 个 token。

```figure
id: fig-4-1
kind: chart
title: 不同 draft 深度下的 EAGLE3 输出吞吐
claim: 在锁定时钟时，32 个用户使用深度 3 时吞吐最高；1 个用户时，深度 3 与 5 的结果相近。
caption: 每根柱子表示两个随机种子的中位数。单用户、未启用 speculative decoding 的数据未列出，因为该次运行的时钟降到了 210 MHz。来源：capture/gpu/summary/l4.json。
```

| 用户数，L4 锁频时段 | 配置 | TPOT 中位数 | 输出 tok/s | SM 时钟中位数 |
|---|---|---:|---:|---:|
| 32 | 未启用 speculative decoding | 119.9 ms | 208.8 | 881 MHz |
| 32 | 深度 1 | 100.4 ms | 271.1 | 900 MHz |
| 32 | 深度 3 | 77.8 ms | 333.6 | 900 MHz |
| 32 | 深度 5 | 83.7 ms | 289.5 | 885 MHz |
| 1 | 深度 1 | 39.4 ms | 22.4 | 900 MHz |
| 1 | 深度 3 | 27.8 ms | 31.3 | 900 MHz |
| 1 | 深度 5 | 26.2 ms | 31.7 | 900 MHz |

32 个用户时，深度 3 的输出吞吐是未启用 speculative decoding 时的 1.6 倍。它的两个种子区间没有与其他配置重叠。深度 5 的吞吐低于深度 3，说明额外猜测的成本超过了收益。

单用户时，深度 3 将 TPOT 从深度 1 的 39.4 ms 降至 27.8 ms。深度 5 与深度 3 的结果接近，两组种子区间重叠。

单用户、未启用 speculative decoding 的那次运行时钟降到 210 MHz，低于锁频值。锁频只设定最高时钟，不能阻止 GPU 降频。因此，我们不比较这次运行与单用户 EAGLE3 的数据。

这些运行没有收集 acceptance 数据，因此这里不报告 acceptance length。

TPOT 中位数下降了，但 token 组之间的间隔变大。32 个用户时，深度 3 的 ITL 中位数从未启用 speculative decoding 时的 84 ms 升到 133 ms。每一步一次发送多个 token，因此输出流会以更大、间隔更长的分组到达。

## 结果的适用范围 {#s-speed-up-decode-with-eagle3-know-the-limits-of-our-result}

本次收益来自随机提示词和 128-token 回答。其他团队发现，真实流量的收益可能更低。以下现象并非本次实测：

- NVIDIA 研究人员在 2026 年的论文 “SPEED-Bench: A Unified and Diverse Benchmark for Speculative Decoding” 中发现，合成提示词会高估真实提示词下 speculative decoding 的吞吐。他们还发现，最佳 draft 深度会随 batch size 改变。
- 2026 年论文 “Test-Time Speculation” 研究了 EAGLE-3 等 draft 在 MATH 回答中的表现。回答长度接近 20,000 个 token 时，acceptance length 从约 3.7 降到约 1.5。

因此，短随机回答上的收益无法预测长聊天回答或长推理轨迹上的收益。

## 查看长回答中的 acceptance {#s-speed-up-decode-with-eagle3-read-the-acceptance-over-a-long-answer}

2026-10-23，我们测量了 acceptance length 随回答位置的变化。测试使用第二块 L4 GPU、`Qwen/Qwen3-8B-FP8`、EAGLE3 draft 和 3 个 speculative token。8 条提示词均开启 thinking、使用 greedy 解码、并发数为 1，最多生成 4,096 个 token。

```listing
title: 回答不同位置的平均 acceptance length
source: capture/gpu/out-l4/eagle3-acceptance-by-position.txt
lang: text
note: 数值范围表示不同提示词的差异；括号中是到达该区间的提示词数量。SGLang 列来自同一批提示词，在 SGLang 0.5.22 上的运行。
---
segment of the output   SGLang                 vLLM
0 to 256                2.05 to 2.64 (8)       2.14 to 2.51 (8)
256 to 512              1.95 to 2.64 (8)       2.09 to 2.55 (8)
512 to 1,024            2.11 to 2.77 (8)       2.12 to 2.79 (8)
1,024 to 2,048          2.09 to 2.47 (5)       1.72 to 2.66 (5)
2,048 to 4,096          2.33 and 2.48 (2)      2.35 and 2.60 (2)
```

在 4,096 个 token 的范围内，acceptance length 没有持续下降。两个 engine 每一步都接受约 2.1 到 2.8 个 token。8 条提示词中只有 2 条超过 2,048 个 token，因此最后一段数据只来自两个回答。GPU 与其他任务共享，也没有锁频；这会影响速度，但不会改变 acceptance。受限于可用显存，最长只测到 4,096 个 token，未达到论文研究的长度。

2026-10-23 的另一轮测试使用第一块 GPU，以 BF16 运行 `Qwen/Qwen3-8B`。并发 8 个用户，回答最多 2,048 个 token，未使用 ignore-eos。回答中位数为 1,800 到 2,000 个 token。vLLM 在每次运行前后读取计数器，得到 acceptance：

```listing
title: 约 2,000-token 回答、8 个用户时的 EAGLE3 acceptance
source: capture/gpu/out-l4/eagle3-long-outputs.txt
lang: text
note: 文件中的表格。短回答的对比数据未展示。
---
engine          dataset    mean acceptance length   accepted per draft position 1 / 2 / 3
SGLang EAGLE3   GSM8K      2.68
SGLang EAGLE3   ShareGPT   2.32
vLLM EAGLE3     GSM8K      2.69                     0.77 / 0.54 / 0.38
vLLM EAGLE3     ShareGPT   2.35                     0.67 / 0.42 / 0.26
```

GSM8K 中第一个 draft token 的 acceptance 为 77%，ShareGPT 为 67%；越靠后的预测位置，acceptance 越低。同一时段中，128-token 短回答的 SGLang acceptance 在 GSM8K 上为 2.69 到 2.78，在 ShareGPT 上为 2.33 到 2.43。长回答与短回答的数据差异不超过 0.01。本轮没有 vLLM 的短回答 acceptance，因此表中 vLLM 数据只展示长回答结果。

在相信加速收益前，先测量自己的长回答。页面末尾列出了相关指标。

## 对比前锁定时钟 {#s-speed-up-decode-with-eagle3-lock-the-clock-before-you-compare}

第一轮 EAGLE3 测试没有锁定时钟。单用户、未启用 speculative decoding 时，时钟只有 210 MHz；EAGLE3 运行时约为 1,400 MHz。如此大的差异会掩盖 speculative decoding 的影响，因此我们弃用了这组数据。

比较启用和关闭 speculative decoding 的结果前，先锁定时钟，或者记录每次运行的时钟。只比较时钟接近的运行。锁频需要 root 权限：

```bash
sudo nvidia-smi -lgc 900,900
sudo nvidia-smi -rgc
```

第一条命令将 SM 时钟锁定在 900 MHz；第二条命令在测试后解除锁频。

## 选择 draft 深度 {#s-speed-up-decode-with-eagle3-choose-the-depth}

- 对 `Qwen3-8B` 和当前 draft，先从深度 3 开始。在我们的 L4 测试中，32 个用户时它输出最高，单用户时与深度 5 相近。
- 高负载服务器应使用自己的模型测试不同深度。在我们的 L4 测试中，32 个用户时深度 5 的输出低于深度 3。
- 如果一天中的负载变化很大，vLLM 可以通过 `num_speculative_tokens_per_batch_size` 按 batch size 设置深度。我们没有测试此选项。

## 在自己的提示词上验证收益 {#s-speed-up-decode-with-eagle3-check-the-gain-on-your-prompts}

使用一组真实流量，分别启用和关闭配置。保留真实回答长度，不要使用 `--ignore-eos`。对比以下数据：

1. acceptance rate，使用下方两个计数器计算。
2. TPOT 中位数和输出吞吐。
3. P99 ITL 和 P99 TTFT。中位数提升可能伴随着尾延迟恶化。
4. 如果回答会达到数千个 token，单独计算最长回答的 acceptance rate。

从 `/metrics` 读取两个计数器：

```bash
curl -s http://localhost:8000/metrics | grep -E "spec_decode_num_(draft|accepted)_tokens"
```

用 accepted token 数除以 draft token 数。vLLM 也会在日志中输出 `SpecDecoding metrics` 行，其中包含 mean acceptance length。

```takeaways
- 选择针对 target model 训练的 draft，并从深度 3 开始。
- 在自己的流量上测量 acceptance rate 和 P99 延迟。
- 对比 speculative decoding 前先锁定或记录 GPU 时钟。
```

Sources: capture/gpu/summary/l4.json（load.vllm-lock-b、load.vllm-lock-eagle3-k1、load.vllm-lock-eagle3-k3、load.vllm-lock-eagle3-k5，以及未锁频的 load.vllm-eagle3 和 load.vllm-eagle3-k5）；vLLM 0.31.0 源码（vllm/config/speculative.py、vllm/v1/spec_decode/metrics.py）；vLLM 0.31.0 文档（docs/features/speculative_decoding/eagle.md、docs/features/speculative_decoding/dynamic_speculative_decoding.md）；SPEED-Bench: A Unified and Diverse Benchmark for Speculative Decoding（arXiv 2604.09557，2026）；Test-Time Speculation（arXiv 2605.09329，2026）；capture/gpu/out-l4/eagle3-acceptance-by-position.txt；capture/gpu/out-l4/eagle3-long-outputs.txt。
