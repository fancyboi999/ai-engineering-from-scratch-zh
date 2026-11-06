---
id: smaller-prefill-chunks
title: prefill 分块应该更小吗
card: inference-serving
kind: tradeoff
level: 3
roles: [inference-engineer]
rounds: [design-review, ml-depth]
tags: [chunked-prefill, mixed-chunk, p99-itl, moe, scheduler]
minutes: 10
lessons: []
manuals: [sglang-101#s-the-scheduler-loop-and-schedule-policy, vllm-101#s-keep-long-prompts-from-stalling-short-ones]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---
长 prompt 会让你的 SGLang 服务器上其他用户的流式输出发生停顿。一篇调优指南建议调小 `--chunked-prefill-size`，以便在长 prompt 的各个分块之间能更频繁地插入 decode 步。你会照着做吗？手册在实测中发现了什么？你会尝试什么替代方案？

## Short answer

没有测量数据前不要照做，因为在手册的测试中，小分块在两张卡上都没有起作用。在 GB10 上，低到达率下 1,024 的分块让 P99 ITL 变得更差，从默认 8,192 下的 929 ms 恶化到 1,977 ms；更高到达率下所有分块大小基本打平。我会先尝试 `--enable-mixed-chunk`，它把 decode token 放进 prefill 批次，并权衡其得失：在 GB10 上它把 P99 ITL 降低了 15% 到 19%，而在每秒 1 和 2 个请求时，中位首 token 时间增加了 49% 到 74%。

## Full answer

### 建议背后的规则

只要能够准入请求，调度器就会运行一个 prefill 批次，否则运行一个 decode 步。chunked prefill 把长 prompt 切分为不超过分块大小的碎片，每个 prefill 批次处理一片。默认值取决于 GPU 显存：在 22 GB 的 L4 上是 4,096，在 GB10 上是 8,192。该建议假设切出更多碎片能给 decode 步让出更多机会。

### 手册测得的结果

每次运行发送 48 个 1,024 到 4,096 token 的 prompt，输出 256 token，泊松到达率为每秒 0.5、1 或 2 个请求，每个点三个种子：

| GPU、模型 | 分块大小 | 每秒到达率 | 输出 tok/s | 中位 TTFT | P99 ITL |
|---|---|---|---|---|---|
| GB10, Qwen3-30B-A3B | 8,192 | 0.5 | 70.1 | 892 ms | 929 ms |
| GB10, Qwen3-30B-A3B | 1,024 | 0.5 | 68.1 | 1,253 ms | 1,977 ms |
| GB10, Qwen3-30B-A3B | 8,192 | 2 | 129.3 | 269 ms | 312 ms |
| GB10, Qwen3-30B-A3B | 1,024 | 2 | 130.1 | 256 ms | 260 ms |
| L4, Qwen3-8B | 4,096 | 0.5 | 44.1 | 36.0 s | 2,579 ms |
| L4, Qwen3-8B | 1,024 | 0.5 | 43.3 | 37.4 s | 2,922 ms |

在 GB10 上，每秒 1 和 2 个请求时，各分块大小的结果都处在彼此的种子波动范围内。在每秒 0.5 个请求时，小分块输了，且种子范围没有重叠。在 L4 上，这个负载超出了卡能承受的范围：无论哪种到达率，输出都停留在每秒 44 个 token 左右，首 token 用时 36 到 62 秒，两种分块下的最差间隔都在 2.5 到 2.9 秒之间。

### 为什么小分块在 MoE 模型上表现更差

prompt 的每个分块都要重新加载选中的专家权重。2025 年一项关于 MoE 模型 chunked prefill 的研究测得，额外加载带来的显存流量增加了多达 39%。在 1,024 的分块下，一个 4,096 token 的 prompt 最多拆成 4 个分块，每个分块都要把专家权重重新读一遍。手册没有测量专家显存流量，所以这是一种解读而非测量结论。

### 为什么在 L4 上什么都没起效

只要调度器能够准入请求，prefill 就会胜出。在队列堆满的情况下，更小的分块只会在 decode 步之前增加更多轮 prefill，流式输出依然在等待。手册认为解决办法是增加 prefill 算力或减少每秒的长 prompt 数量，并未对此做测试。

### 混合分块

`--enable-mixed-chunk` 把 decode token 放进 prefill 批次，这样 decode 步就不用等 prefill 轮次。在 GB10 上与同日默认运行的对比：

| 每秒到达率 | P99 ITL，默认 / 混合 | 中位 TTFT，默认 / 混合 | 输出 tok/s，默认 / 混合 |
|---|---|---|---|
| 0.5 | 922 / 781 ms | 841 / 910 ms | 70.9 / 72.1 |
| 1 | 219 / 177 ms | 244 / 362 ms | 108.8 / 112.6 |
| 2 | 261 / 221 ms | 238 / 416 ms | 133.2 / 138.1 |

流更顺畅，但首 token 变慢。P99 ITL 下降了 15% 到 19%，在每秒 0.5 和 2 个请求下超出了种子波动范围。中位 TTFT 在每秒 1 和 2 个请求时上升了 49% 到 74%，也超出了波动范围。在 L4 上，该参数只改变了 5% 到 8% 的 P99 ITL，处在波动范围内，因为瓶颈在队列。能不能享受到这个权衡，取决于硬件。

### 往另一个方向调整会在启动时失败

在 L4 上使用 8,192 的分块时，服务器在 graph capture 阶段退出。KV 池占用了与之前相同的 24,094 token，而 8,192 token 的 prefill graph 需要超过剩余的 2.33 GB 显存。最后一行日志是一个提示提交 bug 报告的 PyTorch 内部断言，真正的错误是它上面两行的显存不足（OOM）。

### vLLM 中的相同权衡

vLLM 没有单独的分块大小。它的 token 预算扮演着同样的角色，在 GB10 的低负载下，16,384 的预算相比 2,048 把 P99 ITL 推高了 39%。两个引擎都在长 prompt 的首 token 与流式输出的停顿之间做取舍，最佳值随负载变动。

## Follow-ups

- **Level 3:** 为什么在把每个 token 路由到少数几个专家的模型上，小分块的代价会高于 dense 模型？ Expected: 每个分块都要重新读取选中的专家权重，所以四个分块可能把专家权重读四遍；而在 dense 模型上，每步不管怎样都读同一份权重一次。
- **Level 3:** 在 L4 上，两个参数都没能改善流的平稳度。为什么？ Expected: 卡跟不上 prompt 的到达，所以 prefill 赢得了每一次可能的机会；更小的分块只会在 decode 步之前增加 prefill 轮次，解决办法是增加 prefill 算力或减少每秒的长 prompt 数量。
- **Level 4:** 在 L4 上把分块调大到 8,192，服务器启动时退出并打印提示提交 bug 的断言。发生了什么？ Expected: 8,192 token 的 prefill graph 所需显存超过了池分配后剩下的 2.33 GB；断言只是最后一行，上面两行的显存不足才是原因。

## Wrong answers

- "更小的分块总能让流更平顺。" 在 GB10 上每秒 0.5 个请求时，1,024 的分块把 P99 ITL 从 929 ms 推高到 1,977 ms，更高到达率下各尺寸打平。
- "混合分块没有代价。" 它用更慢的首 token 换来了更平顺的流：在 GB10 上每秒 1 和 2 个请求时，中位 TTFT 上升了 49% 到 74%。
- "启动时的 PyTorch 断言是 PyTorch 的 bug。" 真正的错误是它上面两行的显存不足日志；更大分块的 prefill graph 塞不进池剩下的显存里。
- "因为池大小相同，更大的分块不需要更多显存。" 池虽然保持在 24,094 token，但捕获 8,192 token 的 prefill graph 所需显存超过了剩余的 2.33 GB。

## Taught in

[调度器循环与 --schedule-policy](../../../manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md)给出了分块和混合分块的压测，[防止长 prompt 拖慢短 prompt](../../../manuals/vllm-101/sections/3-3-keep-long-prompts-from-stalling-short-ones.md)测量了 vLLM 中的相同权衡。
