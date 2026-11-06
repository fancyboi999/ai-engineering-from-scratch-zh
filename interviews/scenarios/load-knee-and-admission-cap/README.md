---
id: load-knee-and-admission-cap
title: 负载拐点与让卡顿恶化的并发上限配置
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [debugging, system-design]
tags: [p99-itl, admission, max-num-seqs, knee, chat, goodput]
minutes: 25
lessons: [phases/17-infrastructure-and-production/08-inference-metrics-goodput]
manuals: [vllm-101#s-tune-chat-for-many-users, vllm-101#s-why-one-token-budget-replaces-a-prefill-phase, sglang-101#s-admission-and-retraction, sglang-101#s-reading-other-peoples-benchmarks]
practice: []
cheatsheet: [inference-load-testing, serving-engines-compared]
related: [scenarios/prefix-cache-inflated-benchmark, inference-serving/goodput-sets-the-cap]
updated: 2026-11-03
system:
  version: vLLM 0.31.0 against SGLang 0.5.22
  model: Qwen/Qwen3-8B
  hardware: one L4 with 24 GB of memory; the first sweep ran at the full clock, and the reruns locked the SM clock at 900 MHz
source:
  - manuals/vllm-101/sections/3-1-tune-chat-for-many-users.md
  - manuals/sglang-101/sections/5-3-reading-other-peoples-benchmarks.md
  - manuals/sglang-101/capture/gpu/out-l4/server-h2h-sglang.log
  - manuals/sglang-101/capture/gpu/out-l4/server-h2h-vllm.log
  - manuals/vllm-101/capture/gpu/out-l4/admission-cap-64-users.txt
  - manuals/vllm-101/capture/gpu/out-l4/load-flushed-vs-unflushed.txt
---

## Situation

一个聊天服务在单张 L4 上使用 vLLM 为 `Qwen/Qwen3-8B` 提供流式响应服务。其服务等级目标是首字延迟小于 1 秒且 token 间延迟小于等于 100 ms。在业务高峰期该服务有 64 个并发用户，流式输出出现明显卡顿：用户看到输出一个 token，随后停顿超过一秒，紧接着吐出一串文本。大盘上的吞吐量指标看起来依然正常，保持在每秒 241.39 个 token。

一名工程师了解到 `--max-num-seqs` 能够限制同时运行的请求数，便将其从默认的 256 调低到 16，期望让每条流更平滑。次日清晨卡顿停顿依旧存在，且首字等待时间的中位数恶化到了约一分钟。第二位工程师提议更换推理引擎，因为某公开对比测试表格声称竞品引擎在同一显卡上能将停顿控制在 150 ms 附近。

## Evidence

- [聊天压测扫描中各用户数下满足 SLO 目标的请求比例](evidence/chat-target-by-users.txt)
- [每次运行前执行与不执行缓存清理对达标比例与 P99 ITL 的影响](evidence/flushed-against-unflushed.txt)
- [32 用户并发下将并发序列限制为 16 与默认参数的对比数据](evidence/cap-of-16-at-32-users.txt)
- [相同显存池下两套引擎在 1 到 64 用户并发下的表现](evidence/two-engines-at-a-full-pool.txt)
- [SGLang 在 64 并发上限时的显存池与单条解码日志行](evidence/sglang-stats-at-64.txt)
- [vLLM 在 64 并发上限时的显存池与单条统计日志行](evidence/vllm-stats-at-64.txt)
- [我们在 64 用户下尝试过的所有并发准入上限测试记录](evidence/caps-at-64-users.txt)

## Questions

1. 聊天用户能够直观感受到的两个核心指标是什么，为什么总吞吐量在此场景下是错误的观察指标？
2. 阅读首个测试列表。在达到多少用户数时服务开始脱离达标区间，首字延迟与 token 间卡顿哪个先发生恶化？
3. 针对并发运行序列设定上限改变了单个调度步内部的什么，又对什么完全没有改变？
4. 两套引擎在 64 用户下输出了完全相同的每秒 token 数。结合两条日志行解释为什么一个首字更快而另一个保持流更平滑。
5. 最后一项记录测试了六种上限设置。用一句话总结其结果，并说明在当前显卡上消除卡顿的真正解法是什么。
6. 假定必须继续使用 vLLM。应配置什么参数、规划多少副本数、监控什么指标，如何证明该修复有效？

## Walkthrough

1. **明确用户的直观体验指标。** 聊天用户感知到的是首字时间与 token 间延迟。吞吐量代表的是基础设施账单，而非用户体验。流式输出中出现一次漫长的顿挫，其体验远比整体速率稍慢的稳定流要糟糕得多，因此真正应当监控的指标是 P99 ITL，即百个 token 中最差的一次停顿。
2. **定位性能劣化的拐点。** 第一项记录来自时钟未锁定测试：在 8 用户下 75% 的请求达标且 P99 ITL 为 67 ms；在 16 用户下达标率为 64% 且 P99 ITL 为 85 ms；到了 32 用户，虽然总吞吐依然攀升至每秒 275.1 token，但 P99 ITL 剧增至 613 ms 且达标率为 0%；到了 64 用户，首字时间恶化至 11.18 s，P99 ITL 达到 1,233 ms。这证明在吞吐量停止增长之前，流式卡顿早已率先击穿体验底线。该测试未在各档并发间清理前缀缓存，导致低并发行测得的首字时间虚快。第二项记录锁定时钟在 900 MHz 并在每次运行前主动清理缓存：8 用户下达标率从 75%~81% 降至 50%，16 用户下从 64%~66% 暴跌至 25%（P99 ITL 从 82~84 ms 激增至 522~523 ms）。因此在该显卡上，真正的服务质量拐点发生在 8 到 16 用户之间。
3. **剖析并发上限的真实效果。** 在 32 用户下设置 `--max-num-seqs 16`，中位数 ITL 仅从 80.5 降至 69.8 ms，P99 ITL 从 613 仅微降至 595 ms；而首字时间从 1.8 s 暴增至 12.3 s，输出吞吐从每秒 275.1 跌至 171.8 token，损失达 38%。设置上限并不能凭空为更多用户创造硬件空间，它仅仅是在决定谁在等待，并将原本分散在流式过程中的停顿全部转变为队列前置的漫长阻塞。
4. **对比两套引擎在饱和状态下的调度取舍。** 在容量同为 24,096 token 的池子下，两套引擎在 32 用户内吞吐平齐；64 用户下 SGLang 输出为 256.62 token/s，vLLM 为 241.39 token/s。首字时间中位数 SGLang 为 18,356 ms，vLLM 为 10,953 ms；而 P99 ITL SGLang 仅为 114 ms，vLLM 高达 1,363 ms。日志揭示了原因：SGLang 准入 37 个请求并将 27 个排在队列中（池使用率 92%）；vLLM 准入了 40 个请求仅保留 11 个排队，将池子打满至 99.5%，在其他人解码的同时，以每秒 460.3 token 的速度为新提示词做 prefill 预填充。每一次新的 prefill 都在跟解码流抢占同一个计算步，导致正在输出的流发生卡顿。vLLM 优先保障首字时间，SGLang 优先保障流的平滑度。
5. **评估用并发上限挽回平滑流的尝试。** 并非每次运行的时钟都能维持在 900 MHz，因此在看并发上限前需先看时钟列。有三行运行在 900 MHz 下。SGLang 默认配置的 P99 ITL 为 143 至 153 ms，首字时间为 19.4 s。vLLM 默认配置在首字 11.8 s 下给出了 1,359 ms。`--max-num-active-seqs 48` 在相同的 11.8 s 下给出了 1,329 至 1,373 ms，因此该上限未改变任何表现。`--max-num-seqs 32` 运行在 900 和 795 MHz 下，给出了 1,163 至 1,399 ms 并把首字时间推迟至 17.2 至 20.6 s。`--max-num-active-seqs 16` 运行在 795 和 683 MHz 下，因此这不是一组严格匹配的结果，但它给出了 1,133 至 1,139 ms 的表现，首字时间达 44.8 至 48.8 s，输出吞吐降至 129 至 136。没有任何并发上限能将 P99 ITL 降至 1.1 s 以下，且任何起效的上限都将等待转移到了首字时间上。

## Resolution

存在两处根本性错误：服务已经远远超出了其物理承载拐点，而并发上限尝试把容量不足的问题当成调度策略问题来解决。在当前显卡上经缓存清理测得的拐点就在 8 到 16 用户之间。在 64 用户下，显存池仅能容纳约 37 至 40 个 640 token 的请求，剩余请求必须排队，且任何混入解码步的新 prefill 都会打断正在输出的流。

真正的解法是降低单副本的承载用户数。在该卡上，单副本 8 用户能满足半数请求的 SLO，16 用户满足四分之一，因此副本规模的规划必须依据体验目标而非吞吐量峰值。移除 `--max-num-seqs 16` 配置（该配置在 32 用户下白白损失了 38% 的吞吐并将首字时间推迟到了 12.3 s，而 P99 ITL 依然高达约 600 ms）。保留默认准入策略，通过水平扩容增加副本，直到高峰期 P99 ITL 和首字时间双双达标。

更换引擎是一项架构权衡而非银弹修复。在 64 用户饱和状态下，SGLang 能将 P99 ITL 压在 114 ms 但首字需等待 18,356 ms；vLLM 则相反。根据终端用户更能容忍哪一项指标来选型引擎，并在自有硬件上实测对比。

## Wrong turns

- "减小批次以便让每个计算步更快。" 限制并发序列无法增加物理显存空间。它只是改变了谁在等待，并将等待转移到了队列前置首字时间中。在 32 用户下该操作直接削减了 38% 的吞吐量。
- "吞吐量表现良好，说明服务没有问题。" 在 32 用户下总吞吐量依然在上升，但达标请求数已然归零。吞吐量反映的是算力成本账单，P99 ITL 才是衡量用户体验的准绳。
- "缩小模型最大上下文长度以容纳更多用户。" 显存池总量未变，所能容纳的 640 token 请求数分毫未增。唯有扩大显存池或减少单机并发才能改变现状。
- "竞品引擎性能更快。" 两套引擎在各级并发下的每秒 token 输出基本打平。两者的区别在于池满时对不同延迟维度的调度取舍，而非绝对算力速度的差距。
- "将上限设为 48 防止显存池打满。" 限制 48 个活跃序列时 P99 ITL 依然高达 1,329~1,373 ms，与默认参数无异。顿挫源自抢占计算步的 prefill，而非仅仅受运行序列绝对数量影响。

## Generalize

当系统负载越过物理拐点后，任何准入控制旋钮都不过是在用一种延迟置换另一种延迟，没有任何旋钮能凭空凭添物理容量。将面向用户的核心时延指标与吞吐量并列监控，查明同时满足各项时延要求的最大并发临界点，并据此推导集群副本容量。当两套系统总吞吐打平时，差异体现为它们在饱和状态下的调度取舍，在做出架构切换前，必须将首字尾部延迟与流式卡顿尾部延迟并列实测。

## Taught in

vLLM 手册在[聊天调优页面](../../../manuals/vllm-101/sections/3-1-tune-chat-for-many-users.md)记录了该测试扫描与并发上限实测，并在[token 预算页面](../../../manuals/vllm-101/sections/8-2-why-one-token-budget-replaces-a-prefill-phase.md)阐述了混合计算步的原理，SGLang 手册在[准入页面](../../../manuals/sglang-101/sections/2-3-admission-and-retraction.md)探讨了排队机制并在[基准测试解读页面](../../../manuals/sglang-101/sections/5-3-reading-other-peoples-benchmarks.md)对比了双引擎表现，而[推理指标课程](../../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/en.md)为核心指标提供了规范定义。
