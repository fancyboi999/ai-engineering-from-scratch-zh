---
id: speculation-depth-vs-batch
title: 推测深度与批大小的取舍
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth, system-design]
tags: [speculative-decoding, eagle3, draft-depth, acceptance-length, batch-size, kv-pool]
minutes: 25
lessons: []
manuals: [vllm-101#s-speed-up-decode-with-eagle3, vllm-101#s-how-speculative-decoding-checks-drafts, sglang-101#s-speculative-decoding]
practice: []
cheatsheet: [speculative-decoding]
related: [scenarios/thermal-throttle-voided-ab-test]
updated: 2026-11-03
system:
  version: vLLM 0.31.0 and SGLang 0.5.22
  model: Qwen/Qwen3-8B with the Tengyunw/qwen3_8b_eagle3 draft
  hardware: one L4 with 24 GB of memory, SM clock locked at 900 MHz, and a GB10 as the second machine
source:
  - manuals/vllm-101/sections/4-1-speed-up-decode-with-eagle3.md
  - manuals/sglang-101/sections/4-4-speculative-decoding.md
  - manuals/sglang-101/capture/gpu/out-l4/server-load-eagle3.log
  - manuals/sglang-101/capture/gpu/out-gb10/server-eagle3.log
  - manuals/vllm-101/capture/gpu/out-l4/eagle3-long-outputs.txt
---


## Situation

一个团队在一张 L4 上服务 `Qwen/Qwen3-8B`，想给用户更短的回答。他们开启了 EAGLE3，用一个训练好的草稿，并把草稿深度设为 5，因为更深的草稿每一步能猜更多 token。一个用户时，每 token 时间几乎减半，演示很成功。

32 个用户的负载测试却是另一回事。每个 token 仍然来得更快，但服务器每秒写出的总 token 数并不比不开推测解码时多，而首 token 现在要好几秒。团队得出结论：推测解码无法扩展，并排期移除它。另一个团队在 GB10 上用同样的方法服务另一个系列的模型，他们报告收益在 64 个用户时仍然保持，于是来问第一个团队哪里做错了。

## Evidence

- [锁定时钟下，EAGLE3 三种草稿深度与不开推测解码的对比](evidence/depth-sweep-locked.txt)
- [同一个草稿在另一个引擎上，L4 上每 token 时间与输出的对比](evidence/dense-model-on-l4.txt)
- [L4 上加载了草稿的服务器的启动日志](evidence/draft-pool-cost.txt)
- [设定请求上限的那一条警告](evidence/the-silent-cap.txt)
- [GB10 上一个混合专家模型配它自己的 EAGLE3 草稿](evidence/moe-model-on-gb10.txt)
- [两个引擎在约 2,000 token 回答上的接受长度](evidence/acceptance-long-answers.txt)

## Questions

1. 为什么更深的草稿在一个用户时有回报，在 32 个用户时却有代价？说出两种情况下猜错一次各花掉了什么。
2. 从深度扫描看，32 个用户时哪个深度胜出？一个用户时呢？你怎么知道收益是真的，不是噪声？
3. 在 L4 上，每个负载下每个 token 都变快了，而输出从 32 个用户起不再增长。哪两行启动日志解释了这一点？各自的代价是什么？
4. 在 GB10 上，一个配了自己的 EAGLE3 草稿的 MoE 模型在 64 个用户时保住了收益。模型、草稿和卡都变了。你认为哪项变化解释了大部分结果？你会怎样验证？
5. 长回答上，接受长度保持在每步 2.32 到 2.69 个 token。为什么你仍要在用户拿到的最长回答上测量它？
6. 设计上线方案：用哪个深度、手动设定哪些上限、读哪些指标、上线前先跑哪些运行。

## Walkthrough

草稿模型猜接下来的 token，目标模型在一次前向中检查所有猜测。一个用户时，GPU 每一步都有空闲算力，所以多出来的猜测几乎是免费的，每一个被接受的猜测都是目标模型不必单独计算的 token。32 个用户时，每一步都已经满了，每一个猜错的 token 都从另一个用户的真实 token 那里拿走算力。

深度扫描在时钟锁定在 900 MHz 的情况下展示了这种权衡。32 个用户时，不开推测解码的运行每秒 208.8 token。深度 1 为 271.1，深度 3 为 333.6，深度 5 为 289.5。深度 3 是基线的 1.6 倍，它的种子范围与其他任何配置都不重叠。深度 5 的输出比深度 3 少，所以它多出来的猜测花掉的比带来的多。一个用户时，深度 3 把每 token 时间从深度 1 的 39.4 ms 降到 27.8 ms，深度 5 为 26.2 ms，在种子波动范围内与深度 3 持平。一个用户、不开推测解码的那次运行降到了 210 MHz，低于锁定值，所以不参与比较。中位数里还藏着一项代价：32 个用户时，深度 3 的 ITL 从 84 ms 升到 133 ms，因为现在每一步一次交付几个 token，流以更大、更稀疏的批次到达。

第二份记录是同一个草稿在同一张卡上用另一个引擎。每个负载下，每个 token 都快了 1.6 到 2.3 倍。32 个用户时，输出为每秒 269.42 token，不加草稿时为 270.11，比值 1.00；64 个用户时为 245.34 对 250.85。启动日志解释了原因。加载草稿后，KV 池能容纳 9,951 个 token，不加草稿时为 24,094，也就是大约 15 个我们 640 token 的请求，因为草稿占用了显存。服务器还自己设了 `max_running_requests=48`。第四份记录就是做这件事的那条警告：没人设定上限时，引擎会为推测解码把它重设为 48，只打印一次，然后这一行就滚走了。32 个用户时，加草稿的首 token 为 8,040 ms，不加时为 2,970 ms，因为池子只放得下大约 15 个请求，其余的都在等。

GB10 的运行是反例，但有一个前提：那次运行用的是另一个模型、另一个草稿和另一张卡，所以它没有把架构单独分离出来。在一个混合专家模型上，每个负载下每 token 时间都降低了 1.56 倍或更多，32 个用户时峰值为 1.89 倍，64 个用户时为 1.84 倍，接受长度保持在每步 2.71 到 2.74 个 token。稠密模型每一步都要读全部权重，所以更大的批次已经用掉了推测解码需要的空闲算力。混合专家模型只读这一步的 token 选中的专家，验证前向用已经读进来的专家权重为每个请求的四个位置打分。即便在那里，上限也起了作用：64 个用户时输出为 276.32 对 235.38，但首 token 中位数为 7,772 ms 对 557 ms，因为 48 个请求在运行，16 个在等待。

最后一份记录是 8 个用户时长回答上的接受长度：一个引擎在两个数据集上为每步 2.68 和 2.32 个 token，另一个为 2.69 和 2.35，第一个草稿位置的接受率为 0.77 和 0.67，后面的位置更低。从 128 token 的回答到约 2,000 token 的回答，它没有下降。这是我们在两个数据集上的测量。2026 年一项针对长达约 20,000 token 推理回答的研究发现，接受长度从约 3.7 降到约 1.5；另一项研究发现，合成 prompt 夸大了真实 prompt 上的收益。所以值得信任的数字，是来自你自己最长回答的那个。

## Resolution

对 L4 上的这个模型和草稿，正确的深度是 3。锁定时钟时，它在 32 个用户时给出 1.6 倍的输出，在一个用户时与深度 5 持平，而深度 5 在负载下损失了输出。第一个团队在一个用户时测了深度 5，然后把那个结果当成了推测解码本身的属性。

决定负载测试结果的是两个设置，而且都不是草稿深度。草稿把池子缩小到 9,951 个 token，只放得下 32 个请求中的约 15 个；引擎在没人要求的情况下把运行中请求上限设为 48，这个上限在 64 个用户时起作用。加载草稿后，读池子那一行和上限警告，自己设定 `--max-running-requests`，并算一算你的请求有多少个能放进更小的池子。然后在你自己的流量上不加 `--ignore-eos` 测量：草稿 token 和被接受 token 计数器给出的接受长度、每 token 时间中位数和输出、P99 ITL 和 P99 TTFT，因为更好的中位数可能掩盖更差的尾部。每一对运行都锁定或记录时钟。第二个团队对他们的机器来说是对的，错在推而广之：在混合专家模型上，收益随批次增大而保持；在稠密的 8B 模型上则不然。

## Wrong turns

- "草稿越深，每步的 token 总是越多。" 32 个用户时，深度 5 每秒 289.5 token，深度 3 为 333.6。超过接受长度能支撑的深度后，每多猜一次，都是从别的用户那里拿走算力。
- "推测解码无法扩展，移除它。" 稠密模型上输出持平，是因为池子只有 9,951 个 token，不是因为草稿。32 个用户时 48 的上限没有起作用；64 个用户时起作用了。混合专家模型在 64 个用户时保住了 1.84 倍。
- "一个用户时也和不开推测解码的运行比一比。" 那次运行降到了 210 MHz，其他运行都保持在 900。这么大的时钟差距会掩盖效果，所以这一行不用。
- "128 token 基准测试上的接受长度，就是我们会看到的接受长度。" 我们的长回答保住了它，但一项针对长达约 20,000 token 回答的研究看到它从约 3.7 降到约 1.5。要测你自己的尾部。
- "提高运行中请求上限，队列就没了。" 池子只放得下约 15 个 640 token 的请求。更高的上限不会增加内存，只会让等待出现在日志的另一行。

## Generalize

一个消耗空闲资源的功能，在资源有余量时有收益，没有余量时就会带来代价。所以它的价值取决于负载、模型架构和它占用的内存，而不是功能本身的属性。要在你服务的整个负载范围内测量它，读每一行被新组件改变的启动日志，并把组件替你设的默认值当成一个现在归你管的设置。

## Taught in

vLLM 手册在 [EAGLE3 页](../../../manuals/vllm-101/sections/4-1-speed-up-decode-with-eagle3.md)扫描了深度，在[推测解码页](../../../manuals/vllm-101/sections/8-7-how-speculative-decoding-checks-drafts.md)解释了检查过程，SGLang 手册在[它的推测解码页](../../../manuals/sglang-101/sections/4-4-speculative-decoding.md)测量了稠密模型和混合专家模型两种情况，并指出了请求上限。
