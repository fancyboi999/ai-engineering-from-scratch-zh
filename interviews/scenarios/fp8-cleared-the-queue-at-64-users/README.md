---
id: fp8-cleared-the-queue-at-64-users
title: FP8 在 64 用户并发下清空请求队列
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, system-design]
tags: [fp8, kv-pool, queue, capacity, quantization, goodput]
minutes: 20
lessons: [phases/17-infrastructure-and-production/08-inference-metrics-goodput]
manuals: [sglang-101#s-quantization, sglang-101#s-kv-bytes-per-token-and-the-kv-pool, vllm-101#s-fit-a-bigger-model-with-fp8-weights]
practice: []
cheatsheet: [quantization]
related: [scenarios/fp8-kv-scale-silently-one, scenarios/load-knee-and-admission-cap]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-8B in BF16, against Qwen/Qwen3-8B-FP8 with an FP8 KV cache
  hardware: one L4 with 24 GB of memory
source:
  - manuals/sglang-101/capture/gpu/out-l4/server-load-c64-scheduler.log
  - manuals/sglang-101/capture/gpu/out-l4/server-load-default.log
  - manuals/sglang-101/capture/gpu/out-l4/server-load-fp8.log
  - manuals/sglang-101/capture/gpu/out-l4/server-fp8.log
  - manuals/sglang-101/capture/gpu/out-l4/gsm8k-fp8-accuracy.txt
  - manuals/sglang-101/sections/4-3-quantization.md
  - manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md
  - manuals/vllm-101/sections/2-5-fit-a-bigger-model-with-fp8-weights.md
---

## Situation

一个团队在单张 L4 上为内部助手服务部署 BF16 精度的 `Qwen/Qwen3-8B`。在 64 个并发用户下，首字时间中位数长达约 18 秒，且 GPU 报告 100% 满载利用率。值班工程师从调度器日志中调取了一条解码日志：38 个请求正在运行，token 使用率为 0.99，队列中积压了 26 个等待请求。团队最初的扩容方案是采购第二张 L4 并在两张卡前部署负载均衡器。

一位同事提议在同一张卡上使用该模型的 FP8 检查点并搭配 FP8 KV cache。团队既担忧量化后的准确率损失，又担心一次性改变两处变量引发不可控风险。你掌握了同一次测试扫描中两台服务器的启动日志、各自在 64 用户下的解码日志行、准确率评测记录以及技术手册中的对照表格。

## Evidence

- [两台服务器在 64 用户并发下的各单条解码日志行](evidence/two-decode-lines-at-64-users.txt)
- [BF16 服务器启动时的权重与显存池日志](evidence/bf16-pool.txt)
- [FP8 服务器启动时的权重与显存池日志](evidence/fp8-pool.txt)
- [FP8 启动日志：检查点识别与缩放因子警告](evidence/the-scale-warning.txt)
- [1 到 64 用户下两台服务器的吞吐量与首字时间对比表](evidence/the-sweep-table.txt)
- [调度器日志对 64 用户的状态记录及有效吞吐量结果](evidence/goodput-and-the-cause.txt)
- [四种 SGLang 配置在 500 道 GSM8K 题目上的准确率评测](evidence/accuracy-check.txt)

## Questions

1. 阅读两条解码日志行。为什么 BF16 服务器仅运行 38 个请求而非 64 个，usage 列揭示了什么？
2. 对比两份启动日志，哪两个数值发生了变动，其中哪一个扩大了显存池？
3. FP8 日志打印了一条关于缩放因子的警告。它代表什么含义，在信任它之前必须核对什么？
4. 表格显示 FP8 在单用户下同样更快。为什么显存池无法解释单用户行的数据？
5. 本次测试同时变动了两项配置。从本次测试扫描中可以确立什么结论，上线前还需实测什么？
6. 手册采用了何种有效吞吐量目标，两台服务器在 64 用户下各自达成了什么表现？

## Walkthrough

1. **分析解码日志行中的显存池状态。** BF16 日志行显示占用 23810 个 token，使用率达到 0.99，显存池已处于完全打满状态。测试中的每个请求包含 512 输入 token 和 128 输出 token，手册计算得出 BF16 显存池在该规格下最多容纳约 37 个并发请求。服务器实际运行了 38 个请求，将剩余的 26 个请求阻塞在队列中，每个排队请求都将漫长的等待时间累计到了自身的首字时间上。FP8 日志行则以 40635 个 token、0.29 的使用率全并发运行了全部 64 个请求，队列完全为空。两台服务器上的 GPU 都处于繁忙状态，因此单纯的利用率指标从未反映出性能差异，显存池状态才反映了真相。
2. **核算启动阶段的变化。** 两个核心数值发生了变动。模型权重在 BF16 下占用 15.28 GB，而在 FP8 下缩减至 8.81 GB，释放出的宝贵显存直接划入了显存池。缓存数据类型从 bfloat16 变为 float8_e4m3fn，使每个 token 占用的字节数直接减半。两者共同作用下，显存池从 24094 个 token 剧增至 142369 个 token，手册标明相当于原容量的 5.91 倍。单改数据类型能使池容量翻倍，而缩小权重贡献了剩余的增量。两台服务器均采用 0.85 的固定内存比例，确保了显存对比的完全公平。
3. **查明警告日志的深意。** FP8 启动时识别到了检查点，随后打印提示未提供缩放因子，所有 scale 默认回退为 1.0。该检查点仅包含权重缩放因子而不含 KV 缩放因子，因此每个键和值均以 1.0 的固定 scale 存储。准确率评测文件在其第一行注明了完全相同的现象。在信赖该结果前，必须检索权重索引文件查找以 `k_scale` 或 `v_scale` 结尾的张量名称，并检查加载日志以防加载器意外跳过已存在的缩放因子。另一引擎上的事故正展示了加载器丢弃真实缩放因子时的灾难性后果。
4. **解读单用户下的性能表现。** FP8 输出吞吐为每秒 24.53 个 token，对比 BF16 的 13.42，首字时间为 140.72 ms，对比 189.16 ms。在单用户并发下显存池根本构不成瓶颈，因此该行反映的是权重规模的优势。在 L4 上解码时每个 token 都需要读取全量权重，FP8 权重的字节量减半；手册实测单 token 耗时为 39.66 ms 对比 60.16 ms。在 32 用户下 BF16 首字时间已恶化至 2,969.61 ms，FP8 为 199.09 ms，在 64 用户下更是恶化至 18,348.57 ms，FP8 为 296.42 ms。由于大量请求被阻滞排队，BF16 的吞吐量在 32 到 64 用户间从每秒 270.11 token 下跌至 250.85 token。
5. **评估有效吞吐量指标。** 手册设定的指标目标为：首字时间小于 1 秒且单 token 耗时小于 100 ms。BF16 在 32 和 64 用户下达标请求数均为每秒 0 个。FP8 在 64 用户下达标吞吐量达到每秒 2.87 个请求。这才是终端用户能够直观感受到的真实服务质量，也是应当写入方案评审的核心论据。
6. **分析准确率评测数据。** 在前 500 道 GSM8K 题目上，在 8-shot 贪心采样下，四种 SGLang 配置分别答对 458、456、458 和 460 道题，各区间相互重叠。评测未发现显著差异。但在该样本规模下无法排除存在微弱分值损失的可能性，且评测仅覆盖了单单一组模型与基准任务。

## Resolution

排队阻塞的本质是显存池容量耗尽。BF16 容量为 24094 token 的池子仅能承载该规格下约 37 个并发请求，导致 64 个用户中有 26 个被迫排队等待，直接拉垮了首字延迟。采用 FP8 权重搭配 FP8 KV cache 使同一张卡上的显存池容量暴增 5.91 倍。在 64 用户并发下队列完全清空，首字时间中位数降至 296.42 ms，在 BF16 有效吞吐降为零的苛刻目标下交出了每秒 2.87 个达标请求的答卷。

团队上线 FP8 方案时在验收报告中注明了三项前提条件：本次压测同时修改了权重与缓存，收益归功于两者的组合而非单一部件；该检查点的 KV scale 确认为 1.0，上线前已完成权重索引与加载日志的核验备案；500 题准确率评测证实单基准下精度损失极小，但在正式切流前仍需在团队自有的业务提示词上复测。第二张 L4 的采购计划暂缓，直至 FP8 显存池再次达到容量饱和。

## Wrong turns

- "采购第二张 L4 并在两卡之间做负载均衡。" 排队是由于 24094 token 仅能容纳约 37 个请求所致。双卡方案以双倍成本换来池容量翻倍，而 FP8 在单卡上就实现了 5.91 倍的池容量。
- "只做单一变量改动：保留 BF16 权重，仅将 KV cache 切到 FP8。" 这属于合理的实验设计，但本次扫描并未包含该组合。手册关于纯 FP8 缓存的证据来自实战报告，且该方案依赖独立的缩放因子文件。
- "准确率打平了，因此 FP8 对任何模型都是绝对安全的。" 评测仅针对单一模型、单个基准和 500 道题。它仅能证明在此测试下损失可控，其他模型完全可能发生更大幅度的精度衰减。
- "FP8 单 token 推理更快，因此为了速度而切换。" 手册的立场是根据显存容量而非单纯速度来选型 KV cache 数据类型。本例中排队是表象而显存池不足是根因，单用户下的速度提升仅是次生收益。

## Generalize

当 GPU 处于繁忙状态而请求依然在队列中堆积时，排查内核计算瓶颈之前先检查显存池。打满的显存池属于容量瓶颈，而在单卡上最廉价的扩容手段就是降低每 token 字节开销：更小的权重能为缓存腾出物理显存，而更紧凑的缓存数据类型能使容量直接翻倍。在自有业务任务上核验准确率以支付量化代价，并明确记录缓存实际使用的缩放因子。

## Taught in

SGLang 手册在[量化页面](../../../manuals/sglang-101/sections/4-3-quantization.md#the-same-test-on-a-24-gb-l4)记录了该卡上的对比测试并在[KV 字节页面](../../../manuals/sglang-101/sections/3-1-kv-bytes-per-token-and-the-kv-pool.md)核算了显存池大小，vLLM 手册在[FP8 权重页面](../../../manuals/vllm-101/sections/2-5-fit-a-bigger-model-with-fp8-weights.md)评估了固定显存池下的权重表现，而[推理指标课程](../../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/)定义了支撑最终决策的有效吞吐量指标。
