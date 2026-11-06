---
id: radix-cache-off-for-predictability
title: 为让结果可预测而关闭 radix 缓存
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [debugging, screen, ml-breadth]
tags: [prefix-cache, radix-cache, ttft, shared-prefix, system-prompt]
minutes: 20
lessons: [phases/17-infrastructure-and-production/06-sglang-radixattention]
manuals: [sglang-101#s-radixcache, vllm-101#s-make-repeated-prompts-hit-the-prefix-cache, vllm-101#s-ref-lab-notes]
practice: []
cheatsheet: [sglang-serving]
related: [scenarios/prefix-cache-inflated-benchmark, scenarios/request-id-at-prompt-start, inference-serving/prefix-cache-order]
updated: 2026-11-03
system:
  version: SGLang 0.5.22, with vLLM 0.31.0 as the second engine
  model: Qwen/Qwen3-30B-A3B-Instruct-2507 on the GB10, and Qwen/Qwen3-8B on the L4
  hardware: one GB10 with 128 GB of unified memory, and one L4 with 24 GB of memory
source:
  - manuals/sglang-101/sections/3-3-radixcache.md
  - manuals/sglang-101/capture/gpu/out-gb10/bench-shared-prefix.txt
  - manuals/sglang-101/capture/gpu/out-gb10/no-radix-cache-bench-shared-prefix.txt
  - manuals/sglang-101/capture/gpu/out-l4/server-prefix-default.log
  - manuals/sglang-101/capture/gpu/out-l4/server-prefix-no-radix-cache.log
  - manuals/vllm-101/sections/3-2-make-repeated-prompts-hit-the-prefix-cache.md
  - manuals/vllm-101/sections/r-7-lab-notes.md
---


## Situation

之前出过一次基准测试事故：热的前缀缓存让一台高负载服务器看起来更快。事后平台团队写了一条新规定：生产环境和基准测试必须一致，所以每台 SGLang 服务器都用 `--disable-radix-cache` 启动，vLLM 副本都用 `--no-enable-prefix-caching` 启动。这次变更在一个周五上线。

周一，一位客户报告了问题。他的助手每次提问都带一个约两千 token 的系统 prompt。现在首 token 要好几秒，以前不到一秒；用户数不变，服务每分钟能回答的问题却变少了。平台团队回复说，模型和硬件都没变，新的数字才是"真实"的数字。由你来给出结论。

## Evidence

- [共享前缀基准测试：四组，每组 16 个 prompt，各共用一个系统 prompt](evidence/the-shared-prefix-workload.txt)
- [GB10 上开启 radix 缓存的共享前缀运行](evidence/gb10-with-the-cache.txt)
- [GB10 上加了 --disable-radix-cache 的同一运行](evidence/gb10-without-the-cache.txt)
- [L4 上开启缓存、共享 2,048 个 token 时的两行 prefill 日志](evidence/l4-prefill-with-the-cache.txt)
- [L4 上关闭缓存、共享 4,096 个 token 时的两行 prefill 日志](evidence/l4-prefill-without-the-cache.txt)
- [另一个引擎上的同一测试，按共享长度分别开关缓存](evidence/the-other-engine.txt)
- [L4 上按共享长度列出的 SGLang 表格，以及时钟方面的注意事项](evidence/the-factor-and-its-caveat.txt)

## Questions

1. 前缀缓存改变了服务器所做工作的哪一部分？哪一部分保持不变？
2. 从 GB10 的两次运行看，首 token 和吞吐量分别变了多少？哪一行证明两次请求的工作量相同？
3. 读 L4 的四行 prefill 日志。`#new-token`、`#cached-token` 和 `#pending-token` 分别说明了两种配置的什么情况？
4. 两个引擎都测过了。这个效应只属于某一个引擎吗？它的大小如何随共享长度变化？
5. 这条规定想要的是可预测的数字。哪种修复既能做到这一点，又不付出这个代价？

## Walkthrough

1. **弄清缓存省下了什么。** 这棵树索引了服务器见过的每个 prompt 的 KV 条目。新请求复用最长的匹配前缀，只对前缀之后的 token 做 prefill。decode 工作不变，所以缓存命中只省掉 prefill 时间，别的都不省。每个请求都重复同一个系统 prompt，是最理想的情况：整个共享部分都从树里取。
2. **读负载。** 工具包运行引擎自带的共享前缀基准测试：四组 prompt，每组 16 个，每组一个 2,048 token 的系统 prompt，每个 prompt 后接一个 128 token 的问题，同时最多八个请求。第二台服务器在禁用缓存的情况下启动。
3. **比较 GB10 的两次运行。** 两次都报告 64 个请求共 146646 个输入 token，所以客户端请求的工作量相同。开启缓存时，运行耗时 28.97 s，输出为每秒 141.38 token，TTFT 中位数为 690.96 ms。关闭缓存时，运行耗时 50.26 s，输出降到 81.49，TTFT 中位数升到 2542.06 ms，P99 为 3304.86 ms，而开启时是 2051.54。每秒输入 token 数说明的是同一件事：有树时 5061.63，没有树时 2917.46。客户的两条投诉，首 token 变慢和每分钟回答变少，都体现在这一对数据里。
4. **读 L4 的 prefill 日志。** 开启缓存、共享 prompt 为 2,048 token 时，一个批次 prefill 了 405 个新 token，从缓存中取了 12952 个；下一个批次 prefill 了 546 个新 token，缓存 17269 个。关闭缓存、共享 prompt 为 4,096 token 时，每个批次都 prefill 4096 个新 token，缓存为 0，还有 5527 个 token 等着下一个分块。每个请求都要按 prefill 分块大小处理整个 prompt，其他请求则在一旁等待。
5. **核对另一个引擎。** 在 L4 上用 vLLM 时，开启缓存让首 token 中位数在每个共享长度下都保持在 400 ms 左右：408、488、396、410 和 375 ms。关闭缓存后，首 token 随共享部分增长：392、753、1,213、2,550 和 13,353 ms，输出从每秒 113.6 token 降到 19.6。手册提醒最后两行要谨慎看待，因为那时 GPU 降频了；它把 1,024 token 那一行作为干净的对照：开启缓存时首 token 快约三倍，输出多 50%。两个引擎上的效应相同，并且随共享长度增大。
6. **给倍数划定上限。** L4 上的 SGLang 表格在共享 4,096 个 token 时为 479 ms 对 14,706 ms，相差 30.7 倍，吞吐量相差 4.3 倍。没有缓存的那次运行频率为 930 MHz，有缓存时为 1,440，且 62% 的采样带有过热标志，所以手册把这两个倍数都当作上限，并指出 35% 的时钟差距解释不了 30 倍。可信的幅度要看 GB10 那一对数据，它没有这种差距。

## Resolution

事故是这条规定造成的。让基准测试失真的从来不是缓存，而是方法：工具包在同一台服务器上复用同一个种子，两次运行之间从不清空缓存。把缓存从生产环境拿掉，就拿掉了客户流量赖以节省工作的机制。在 GB10 上，同样 146646 个输入 token，共享前缀运行的 TTFT 中位数从 690.96 ms 升到 2542.06 ms，输出从每秒 141.38 token 降到 81.49。

修复办法是在两个引擎上重新开启缓存，并用流程让基准测试变得可预测：每次要比较的运行前清空缓存，每次运行换新种子，在结果旁记录缓存 token 数。用 prefill 日志里的 `#cached-token` 证明生产修复生效，它应当覆盖每个共享 prompt 的大部分；同时客户流量的 TTFT 中位数应回到接近有缓存时的水平。保留手册给的唯一例外：只有在测试错误答案是否来自复用的 KV 时才关闭缓存，而且先试 `--kv-canary log`。

## Wrong turns

- "缓存让基准测试失真，所以生产环境不该用它。" 基准测试失真，是因为它不清空缓存就复用 prompt。生产环境中的缓存服务的是真正重复的 prompt，客户的系统 prompt 正是这种情况。
- "只有首 token 受影响，吞吐量不变。" 在 GB10 上，输出从每秒 141.38 token 降到 81.49，运行耗时从 28.97 s 变成 50.26 s。重新计算的 prefill 占用了本可用于 decode 的步数。
- "这是 SGLang 的细节。" 另一个引擎在同一张卡上，共享 1,024 个 token 时从 396 ms 变成 1,213 ms，共享 4,096 个时从 375 ms 变成 13,353 ms。
- "改为缩短客户的系统 prompt。" 这个 prompt 是客户的产品。用服务器功能去掉重复工作是更便宜的修复，手册也测过，没有共享内容时缓存没有任何代价。
- "继续关闭，因为错误答案可能来自复用的 KV。" 这是手册唯一接受的理由，即便如此，它也要求先试 `--kv-canary log`，并且只在测试期间关闭缓存。

## Generalize

测量造成的假象要在测量中修复，而不是在系统中修复。缓存或其他状态在基准测试运行之间留存时，在两次运行之间重置它并记录下来；不要把这个机制从生产环境拿掉，生产环境要的正是这份状态。改动一个能省工作的默认设置之前，先测一测会重复的流量，算出这个默认设置在那里省下了多少。

## Taught in

SGLang 手册在 [RadixCache 页](../../../manuals/sglang-101/sections/3-3-radixcache.md#the-same-test-on-a-24-gb-l4)测量了这一对数据，vLLM 手册在[前缀缓存页](../../../manuals/vllm-101/sections/3-2-make-repeated-prompts-hit-the-prefix-cache.md)测量了另一个引擎，完整表格见[实验笔记](../../../manuals/vllm-101/sections/r-7-lab-notes.md)，[RadixAttention 课](../../../phases/17-infrastructure-and-production/06-sglang-radixattention/docs/en.md)讲解了这棵树及其适用和不适用的情形。
