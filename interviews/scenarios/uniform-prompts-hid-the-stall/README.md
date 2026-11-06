---
id: uniform-prompts-hid-the-stall
title: 统一的 prompt 长度掩盖了卡顿
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth, system-design]
tags: [load-testing, prompt-lengths, p99-itl, waves, chunked-prefill, engine-choice]
minutes: 25
lessons: [phases/17-infrastructure-and-production/22-load-testing-llm-apis]
manuals: [vllm-101#s-ref-lab-notes, vllm-101#s-keep-long-prompts-from-stalling-short-ones, sglang-101#s-reading-other-peoples-benchmarks, sglang-101#s-sglang-benchmark-serving]
practice: []
cheatsheet: [inference-load-testing, serving-engines-compared]
related: [scenarios/load-knee-and-admission-cap, scenarios/prefix-cache-inflated-benchmark]
updated: 2026-11-03
system:
  version: vLLM 0.31.0 against SGLang 0.5.22
  model: Qwen/Qwen3-8B
  hardware: one L4 with 24 GB of memory
source:
  - manuals/vllm-101/sections/r-7-lab-notes.md
  - manuals/vllm-101/sections/3-3-keep-long-prompts-from-stalling-short-ones.md
  - manuals/sglang-101/sections/5-3-reading-other-peoples-benchmarks.md
  - manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md
  - manuals/sglang-101/capture/gpu/out-l4/waves-default-input-tokens.txt
  - manuals/sglang-101/capture/gpu/out-l4/server-waves-default.log
  - manuals/sglang-101/capture/gpu/out-l4/server-waves-mixed-chunk.log
---


## Situation

一个在 L4 卡上服务 `Qwen/Qwen3-8B` 的团队在合同续签前做引擎评估。负载测试采用基准测试客户端的默认形态：64 个 prompt，同时 16 个用户，每个 prompt 512 token，每个回答 128 token。引擎 A 测得 P99 token 间间隔为 502 ms，首 token 等待时间中位数为 1,499 ms。引擎 B 测得 81 ms 和 1,775 ms。输出相同，分别为每秒 181.7 和 182.3 token。评估报告称引擎 A 的流式输出“不可用”，并排期迁移到引擎 B。

一名支持工程师指出，生产环境的 prompt 从几个 token 到几千个不等，而且在生产环境中没人见过引擎 A 有 500 ms 的间隔。团队把客户端的长度比例设为 0.5 和 0（长度参差不齐）重新测试，两个引擎在流指标上的排名对调了。你需要判断应当依据哪份结果采取行动。

## Evidence

- [L4 上按长度比例划分的波浪工作负载，涵盖两款引擎](evidence/the-waves-table.txt)
- [长度比例如何决定 prompt 和输出长度](evidence/what-the-ratio-means.txt)
- [每个比例下发送的输入 token 总数（种子 1）](evidence/input-tokens-by-ratio.txt)
- [比例为 1.0 时一次运行中的五行连续调度器日志](evidence/one-wave-in-the-log.txt)
- [SGLang 手册对两种流量形态的解读](evidence/a-different-winner-per-shape.txt)
- [开启混合分块的 SGLang 与 vLLM 按比例对比](evidence/the-mixed-chunk-test.txt)
- [比例测试的注意事项及使用规则](evidence/two-settings-two-servers.txt)

## Questions

1. 根据长度比例的定义，解释 16 个用户下的相同长度对到达模式有什么影响。
2. 读这五行日志。第一行之前的那一秒发生了什么？调度器在接下来的两行里做了什么？
3. 为什么在波浪中保持流平滑的引擎，在长度变化时失去了该优势？
4. 混合长度运行发送的输入 token 较少。两种形态之间还有什么不同？你还能比较什么？
5. 一个 SGLang 参数将其混合长度下的尾部延迟几乎减半。它的代价是什么？何时会开启它？
6. 对续签做出决定：依据哪个结果、使用哪个参数，以及在合同中加入哪项测试。

## Walkthrough

1. **看比例的作用。** 比例为 1.0 时，每个请求有 512 个 prompt token 和 128 个输出 token。为 0 时，每个长度是在 1 个 token 到该大小之间随机抽取的。固定用户数下使用相同长度，所有 16 个请求一起开始、一起结束，它们的替代请求又一起到达。流量呈波浪式涌入。而在混合长度下，请求在不同时间结束，新的 prompt 逐个到达。
2. **在日志中观察波浪。** 在第一行中，只有一个请求在运行，所以十五个请求刚刚同时完成。调度器分两个批次完成它们替代请求的 prefill（先是 4,096 个新 token，然后是 3,583 个），中间没有 decode。然后所有 16 个请求一起 decode：承载 prefill 的那一步生成吞吐量为每秒 2.62 token，随后的步骤中为 231.07 和 229.85。prefill 只发生在波浪之间，因此 decode 步有干净的间隔，而整波请求的首 token 要等待两个完整的 prefill 批次。
3. **读比例为 1 时的表格。** 两个引擎在输出上打平，181.7 对比 182.3。vLLM 更快给出首 token，1,499 对比 1,775 ms；SGLang 保持流平滑，P99 ITL 为 81 对比 502 ms。这与两个引擎在满池时做出的选择相同：一个把新 prompt 接纳进运行中的步骤，另一个先完成该波的 prefill。
4. **读比例为 0.5 和 0 时的表格。** 在混合长度下，vLLM 领先。在 0.5 时，它给出每秒 169.6 对比 159.6 token，中位数 TPOT 为 81.4 对比 87.8 ms，P99 ITL 为 191 对比 363 ms。在 0 时，P99 ITL 为 202 对比 302 ms，首 token 为 284 对比 283 ms。SGLang 手册的解读是：当新 prompt 逐个到达时，每次 prefill 都与运行中的 decode 共享一个步骤，vLLM 拆分了这项工作，因此流卡顿更少。vLLM 手册将该机制描述为批 token 预算：在每一步中，运行中的流先拿到它们的下一个 token，等待中的 prompt 填补剩余部分。
5. **解释混淆因素。** 混合长度发送的 token 较少：种子 1 下 1.0 时为 32,768 个输入 token，0.5 时为 24,504，0 时为 17,870。在同一台服务器上，0.5 和 0 的运行也排在 1.0 运行之后，所以它们首 token 的收益部分可能来自缓存。SGLang 手册指出，更少的工作和缓存解释不了流指标：在混合长度下，它的 P99 ITL 从 82 升到 300 ms，因为每次 prefill 都暂停了运行中的 decode。所以应比较每行的形态以及行内的排名，而不是跨行的绝对吞吐量。
6. **读混合分块测试。** 加上 `--enable-mixed-chunk` 后，SGLang 把运行中的 decode 放进 prefill 批次。在混合长度下它随后追平了 vLLM：0.5 时 P99 ITL 从 363 降到 193 ms，0 时从 302 降到 196 ms，每个种子范围都重叠，输出提升了约 8%。在固定长度下，该参数付出了代价：P99 ITL 从 81 升到 203 ms，种子从 83 到 349 ms，而 vLLM 保持在 502。日志显示在同一个批次中，处理 514 token prefill 的同时有 15 个请求在 decode。
7. **确定每项设置测量了什么。** SGLang 手册阐明了这一点：固定长度测量突发（慢的首 token 和之后平滑的 token）；混合长度测量稳定流量（快的首 token 和流中的停顿）。在比较两个构建版本时保持比例为 1.0，因为它是精确可复现的。在设定延迟目标之前，运行真实的长度分布。

## Resolution

迁移决策建立在生产环境从未产生过的流量形态上。固定用户数下的相同长度把请求同步成了波浪；在波浪中，引擎 A 把新 prompt 接纳进运行步骤的选择付出了 502 ms 尾部延迟的代价，而引擎 B 通过在波浪之间 prefill 避开了该代价。在生产环境具有的长度下，引擎 A 具有更低的尾部延迟（0.5 时为 191 对比 363 ms，0 时为 202 对比 302 ms）、相同或更好的首 token，以及更高的输出。根据支持工程师的证据，500 ms 的差距属于测试本身的人工产物。

续签保留引擎 A。如果团队因其他原因偏好引擎 B，`--enable-mixed-chunk` 能消除其混合长度下的劣势，代价是突发性能（81 变为 203 ms），因此选择取决于生产环境是突发到达还是平稳到达。合同测试做出调整：从生产日志中采样真实的长度分布，将其作为验收测试运行，固定长度测试仅保留用于可复现的跨构建检查。记录两者的时钟；混合长度成对测试中的每个中位数时钟都在 1,410 MHz 或以上，这就是这些行具有可比性的原因。

## Wrong turns

- "502 ms 的尾部延迟是引擎 A 的调度器 bug。" 同样的引擎在比例为 0 时测得 202 ms，在 0.5 时测得 191 ms。尾部延迟来自 16 个 prefill 落入相同的步骤，这是测试制造的，生产环境不会这样。
- "相同的长度是最公平的测试，因为没有变量。" 它们最可复现，但不是最真实的。它们测量的是突发，SGLang 手册说明应把它们用于构建对比，而不是用于延迟目标。
- "调高 token 预算，让 prefill 更快完成。" 在 DGX Spark 上，在低速率下，16,384 token 的预算让 P99 ITL 从 574 升到 798 ms，首 token 的收益没有超出种子波动范围。预算是在两种延迟之间做权衡，并不能消除卡顿。
- "对比吞吐量，两个引擎打平，所以选哪个都无所谓。" 输出上的持平掩盖了一种形态下 502 对比 81 ms 的尾部延迟，以及另一种形态下 363 对比 191 ms 的尾部延迟。用户能感受到尾部延迟。
- "在引擎 B 上各处都开启 mixed chunk。" 在固定长度突发下，它把 P99 ITL 从 81 提高到了 203 ms，种子高达 349。它修复了稳定流量并伤害了突发流量，所以先测量你的流量形态。

## Generalize

单一 prompt 长度的负载测试只测了长度分布的一个点，在固定用户数下它还会同步请求，所以它测量的是稳定流量从未产生过的突发。两个调度器的排名可能在这些形态之间对调。为每个延迟目标采样真实的长度分布，保留固定长度测试以保证可复现性，并在两者中都查看中位数旁边的尾部指标。

## Taught in

vLLM 手册在[实验笔记](../../../manuals/vllm-101/sections/r-7-lab-notes.md)中保留了波浪表格，并在 [token 预算页](../../../manuals/vllm-101/sections/3-3-keep-long-prompts-from-stalling-short-ones.md)解释了预算机制；SGLang 手册在[波浪部分](../../../manuals/sglang-101/sections/5-3-reading-other-peoples-benchmarks.md#the-same-pair-on-waves)解读了该配对，并在[其基准测试页](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md#we-tested-the-waves-on-an-l4)测试了比例；[负载测试课](../../../phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/en.md)指出了 prompt 均一性陷阱。
