---
id: fraction-too-low-six-times-slower
title: 引擎内存比例设为 0.02 导致采样耗时暴增六倍
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [rl, kv-pool, mem-fraction-static, rollout-time, miles]
minutes: 20
lessons: []
manuals: [miles-101#s-troubleshoot-by-symptom, miles-101#s-stop-ray-killing-the-job, miles-101#s-read-your-first-ten-steps, miles-101#s-ref-lab-notes, sglang-101#s-mem-fraction-static-and-startup-sizing]
practice: []
cheatsheet: []
related: [scenarios/ray-oom-unified-memory]
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/miles-101/capture/gpu/out-gb10/frac-low-kv.txt
  - manuals/miles-101/sections/7-1-troubleshoot-by-symptom.md
  - manuals/miles-101/sections/2-3-stop-ray-killing-the-job.md
  - manuals/miles-101/sections/r-3-lab-notes.md
  - manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md
---

## Situation

一个团队在单张 GB10 上使用 GRPO 算法开展训练。前一周一个较大的模型因为触发整机内存超限被系统杀死，团队由此对整节点内存总量产生了极大的戒备心理。在接下来的运行中，有人将引擎显存占用比例 `--sglang-mem-fraction-static` 调低至 0.02，试图为训练器保留尽可能充裕的内存空间。启动脚本默认值为 0.4。

次日清晨单步核验任务顺利结束，模型奖励处于常规合理区间内。然而该步的执行耗时远超前一天。过程中未出现任何报错。一位工程师怀疑是温度保护机制触发，另一位怀疑是磁盘 IO 过慢，第三位则推测引擎降级使用了慢速内核算子。你拿到了该次核验的日志、同等配置下比例设为 0.25 的日志，以及比例为 0.4 的常规运行日志。

## Evidence

- [三次运行的显存池大小、采样耗时与奖励数值对比](evidence/three-runs.txt)
- [慢速运行在启动阶段输出的 KV cache 配置行](evidence/engine-pool-line.txt)
- [三次运行之间存在差异的唯一参数说明](evidence/what-each-run-set.txt)
- [技术手册中推荐的默认训练运行参数配置](evidence/default-run-settings.txt)
- [引擎如何将比例参数转化为实际显存池的机制说明](evidence/how-the-split-works.txt)
- [排障手册中针对引擎内存比例异常的排查条目](evidence/manual-entry.txt)

## Questions

1. 三个采样耗时对应三个显存池容量。哪个数值与耗时呈强相关变化，哪个没有变动？
2. 慢速运行的奖励值处于正常范围。为什么这不能证明本次运行没有问题？
3. KV cache 配置行在执行第一步之前就已经打印。其中的什么信息预示了训练会变慢，GPU 处于何种运行状态？
4. 计算单步必须生成的序列总数与最大输出长度。当前容量的显存池同时能容纳多少序列？
5. 应当朝哪个方向调整该比例，每次调整多大步长，调整后应核对什么日志？
6. 引擎既没有发生内存溢出也没有崩溃。为什么调小该参数相比调大更难以被及时察觉？

## Walkthrough

1. **对比三次运行的核心指标。** 观察每行中的 `perf/rollout_time`。极低比例的运行单次采样耗时高达 386 s。比例设为 0.25 的运行耗时 61 s，而 0.4 的常规运行同样仅耗时约一分钟。三者的奖励值分别为 0.61328125、0.66015625 和 0.625。奖励指标完全没有随参数变化而波动，但采样耗时却整整激增了约六倍。
2. **分析显存池容量数据。** 慢速运行的显存池参数为 `max_total_num_tokens=3082`。其余两次运行的显存池容量分别为 211,813 和 347,841。显存池代表引擎 KV cache 同时能容纳的最大 token 数。采样耗时完全随显存池容量的压缩而暴涨，三份日志在其他维度毫无差异。
3. **审视启动阶段的先验预警。** 慢速引擎在启动时打印了 `KV Cache is allocated`，容量仅为 3082 个 token，K 和 V 各占 0.16 GB。该日志行在任何训练步执行前就已经输出。熟悉该机型正常基线指标的人在第一步耗时结束前数分钟就能一眼识别出问题。
4. **核算单步计算任务量。** 手册默认参数为每步 32 个提示词、每提示词生成 8 个回答，单回答长度上限为 1,024 个 token。单步总共需要生成 256 个回答。容量仅为 3082 token 的显存池在极限长度下同时仅能容纳 3 个回答，算上输入提示词后容纳数量更少。引擎不得不将单步任务切碎为大量细小的微批次串行执行。系统没有任何组件损坏，GPU 大部分时间只是在饥饿中等待显存释放。
5. **理清比例向容量转换的逻辑。** 该比例界定的是模型权重与 KV 显存池的内存总和。在权重加载完成后，引擎测量剩余空闲显存并将该份额下的结余部分划拨给显存池。在 0.02 的极低比例下，即使是小模型的权重也会吞噬掉绝大部分额度，留给显存池的只剩下微不足道的残渣。
6. **结合排障手册制定处置方案。** 排障页面列出了该参数向两个极端漂移时的不同失效模式：比例过高会导致激活值和 CUDA 图缺乏内存支撑，触发 CUDA 显存不足；比例过低往往不会导致引擎崩溃，唯一的特征是 KV cache 行中的 `#tokens` 极度萎缩。针对偏低情况的修复方法是按 0.05 或 0.1 的增量逐步回调。

## Resolution

0.02 的显存比例导致显存池被压缩至仅剩 3082 个 token，单步采样耗时暴增至 386 s（对比 0.25 时的 61 s 和默认 0.4 时的一分钟）。奖励值保持正常是因为工作总量未变，只是被切分成了过多轮次执行。修复方案是将该比例恢复至 0.4，或在训练器需要更多内存时设为 0.25，绝不能调至显存池无法容纳单步批处理的红线以下。

验收验证依据启动时与第一步结束后的两组数值：KV cache 行中的 `#tokens` 与监控指标 `perf/rollout_time`。在 0.25 下显存池可容纳 211,813 个 token 且采样仅耗时 61 s。对该参数的任何新调整都必须记录该对指标，并以 0.05 或 0.1 为步长调整。前一周的内存超限是训练器本身的问题，正如 Ray 事故所揭示的那样，盲目压缩推理引擎显存并不能挽救训练器的内存失控。

## Wrong turns

- "奖励指标正常，说明运行没有问题。" 奖励衡量的是模型学到了什么，而非训练步的算力开销。耗时激增六倍意味着消耗了六倍的 GPU 机时。
- "是过热保护暂停了任务。" 降频暂停确实会延长墙上时钟耗时，但 3082 token 的显存池已足以充分解释该延迟，且当天同机 0.25 比例的任务仅耗时 61 s。
- "调高并发请求数量限制。" 引擎仅在显存池有剩余空间时才会准入请求。在 3082 token 限制下，是显存池而非并发参数硬性卡死了批大小。
- "进一步降低比例，训练器才是第一位的。" 前一周的训练器崩溃在 0.4 和 0.2 下均发生过，说明该比例并非根因。低于 0.25 训练器获益甚微而采样性能遭受毁灭性打击。

## Generalize

同一个配置项在两个方向上都可能发生错误且展现出完全不同的失效表象：为某组件划拨过多内存会导致进程直接崩溃，这种故障显而易见；划拨过少则会导致性能严重滑坡，这种隐性退化往往在账单到账前无人察觉。牢记组件在启动时打印的正常容量基线，在首步执行前就完成核验，在调整配额时采用小步快跑策略并始终将容量与耗时指标联合评估。

## Taught in

Miles 手册在[症状排障表](../../../manuals/miles-101/sections/7-1-troubleshoot-by-symptom.md)中总结了引擎比例失调的两类表象，在[Ray 故障页面](../../../manuals/miles-101/sections/2-3-stop-ray-killing-the-job.md)展示了调小比例无法避免训练器崩溃的实证，在[实验笔记](../../../manuals/miles-101/sections/r-3-lab-notes.md)中给出了默认训练配置，而 SGLang 手册在[内存划分页面](../../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md)详解了配额转化为显存池的底层计算机制。
