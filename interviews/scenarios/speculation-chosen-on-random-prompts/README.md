---
id: speculation-chosen-on-random-prompts
title: 在随机 prompt 上选定的推测解码
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth, design-review]
tags: [speculative-decoding, eagle3, ngram, acceptance-length, dataset, ttft]
minutes: 25
lessons: []
manuals: [sglang-101#s-speculative-decoding, vllm-101#s-speed-up-decode-with-eagle3, vllm-101#s-use-n-gram-speculation-for-copy-heavy-work]
practice: []
cheatsheet: [speculative-decoding]
related: [scenarios/speculation-depth-vs-batch]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-8B with an EAGLE3 draft of 3 tokens, and NGRAM with its defaults
  hardware: one L4 with 24 GB of memory, SM clock locked at 900 MHz
source:
  - manuals/sglang-101/capture/gpu/out-l4/spec-real-prompts.txt
  - manuals/sglang-101/sections/4-4-speculative-decoding.md
  - manuals/vllm-101/sections/4-1-speed-up-decode-with-eagle3.md
  - manuals/vllm-101/sections/4-2-use-n-gram-speculation-for-copy-heavy-work.md
---


## Situation

一个推理团队在 L4 卡上用 `Qwen/Qwen3-8B` 服务三个内部产品：客服聊天、数学辅导和代码助手。为了给三者选一个统一的 decode 设置，他们用基准测试客户端的随机数据集，在 8 个用户下对引擎做基准测试。EAGLE3 大约把 token 间隔时间减半，n-gram 方法毫无变化。他们给每个产品都开了 EAGLE3，并以"没有收益"关闭了 n-gram 的工单。

两周后，客服聊天报告：忙时首 token 比改动前晚了好几秒，每分钟的回答数却没有增加。数学辅导报告的正好相反：服务在负载下快了很多。代码助手团队从没用上 n-gram，他们读到一篇论文说 n-gram 在代码上有回报，于是来问为什么当初否掉了它。现在要你判断，一个设置能否同时服务这三个产品。

## Evidence

- [机器、模型、两种草稿方式和四个数据集](evidence/the-test.txt)
- [8 个用户时，按数据集和方法列出的每输出 token 时间中位数](evidence/time-per-token-at-8-users.txt)
- [8 个用户时，按数据集列出的平均接受长度](evidence/acceptance-by-dataset.txt)
- [32 个用户时，按数据集和方法列出的每秒输出 token 数](evidence/output-at-32-users.txt)
- [32 个用户时，EAGLE3 的首 token 和 NGRAM 最差的间隔](evidence/first-token-and-tail-at-32.txt)
- [随机数据集是什么，以及其他研究在真实 prompt 上的发现](evidence/what-random-means.txt)
- [在你自己的流量上要比较的四个数字](evidence/the-check-on-your-traffic.txt)

## Questions

1. 看表之前，先说明为什么一个基准数据集无法为三个不同的产品决定推测解码设置。
2. 从接受长度表看，哪个数据集让草稿被接受的 token 最少？这类流量的什么特点解释了这一点？
3. 32 个用户时，EAGLE3 在哪里损失了输出？除了输出，它在那里还付出了什么代价？
4. n-gram 方法在随机数据集上没有收益。它在哪类流量上有回报？它对尾部做了什么？
5. 随机数据集由什么组成？为什么它同时掩盖了损失和收益？
6. 为每个产品给出一个设置，以及在生产流量上确认它的测量方法。

## Walkthrough

1. **先查方法，再看结果。** 测试在一张 L4 上运行，时钟锁定在 900 MHz，每次运行前清空缓存，两个种子，输出 128 token 并 ignore-eos。只有时钟中位数为 900 MHz 的运行才算数。四个数据集：随机集、ShareGPT、GSM8K 和代码。所以行与行之间的差别只来自数据集。
2. **读 8 个用户时的每 token 时间。** EAGLE3 在每个数据集上都降低了 TPOT 中位数：随机集从 67.6 到 68.2 ms 降到 33.8 到 39.4，ShareGPT 从 66.4 到 68.6 降到 39.5 到 43.1，GSM8K 从 65.5 降到 33.3 到 34.3，代码从 65.9 到 66.4 降到 36.8。在这个负载下，所有人都能拿到收益。n-gram 就不一样了。在随机集和 ShareGPT 上，它比默认设置略慢，分别为 68.2 到 71.4 和 69.5 到 72.4 ms。在 GSM8K 上为 54.6 到 55.0，在代码上为 58.2 到 58.8。n-gram 在随机集上的结果没有在其他数据集上重现。
3. **读接受长度。** EAGLE3 在 GSM8K 上每步提交 2.69 到 2.78 个 token，在 ShareGPT 上 2.35 到 2.43。n-gram 在 GSM8K 上提交 1.44 到 1.46 个，在 ShareGPT 上只有 1.22 到 1.25。聊天回答很少重复 prompt 里的内容，所以从 prompt 里复制的方法在那里几乎找不到东西，学出来的草稿也猜得更差。数学和代码会重复结构，所以两种方法都猜得更好。接受长度这一列预示了后面每一列。
4. **读 32 个用户时的输出。** 在随机集上，EAGLE3 每秒 239 到 242 token，默认设置为 250 到 254。在 ShareGPT 上，277 到 283 对 281 到 288。在两个类似聊天的数据集上，它在负载下都损失了输出。在 GSM8K 上它给出 648 到 660，默认为 397；在代码上 566 到 581，默认为 365 到 366。手册的说法是：GSM8K 和代码上输出为 1.6 倍，另外两个上没有更多输出。批次满的时候，每个被拒绝的草稿 token 都是从别的用户那里拿走的算力，所以只有接受长度高的地方，收益才能保住。
5. **读首 token 和尾部。** 32 个用户时，EAGLE3 把随机集上的首 token 中位数从 3.2 到 3.5 s 推到 8.6 到 8.7 s，ShareGPT 上从 2.7 到 3.0 s 推到 5.7 到 7.0 s。手册的解读是，草稿占用了队列需要的池空间，所以请求要等更久才能拿到槽位。这正是客服聊天的投诉。32 个用户时，n-gram 把 P99 ITL 提高到 244 到 779 ms，默认设置为 83 到 106 ms：更平滑的中位数掩盖了更不平稳的流。单用户的默认设置运行降频到 300 MHz 以下，被排除在外，这个处理是对的。
6. **问随机集到底是什么。** 随机数据集取 ShareGPT 对话的第一轮，截断或重复到 512 token。它是真实文本，但不是任何产品的流量，截断加重复的 prompt 内部的重复，也不是数学回答里的那种重复。手册引用的研究结论一致：合成 prompt 平均把推测解码的吞吐量高估了 23%；批次增大时，最佳草稿长度降到 1；在长回答上，接受长度从约 3.7 降到约 1.5。
7. **使用手册的检查方法。** 拿你自己流量的一个样本，分别在开启和关闭推测解码时运行，用真实的输出长度和 `--disable-ignore-eos`。比较 `sglang:spec_accept_length` 给出的接受长度、输出和每 token 时间中位数、P99 ITL 和 P99 TTFT，以及只看最长那些回答时的接受长度，每个 `/generate` 响应都在 `meta_info` 里给出这个值。

## Resolution

一个设置服务不了这三个产品，因为推测解码的收益是流量的属性，不是引擎的属性。数学辅导继续开 EAGLE3：32 个用户时每秒 648 到 660 token，默认为 397；8 个用户时每 token 33.3 到 34.3 ms，默认为 65.5。代码助手首选 EAGLE3，32 个用户时 566 到 581 对 365 到 366；n-gram 是更便宜的第二选择，在 8 个用户时对代码有回报，58.2 到 58.8 对 65.9 到 66.4，前提是它的 P99 ITL 在产品目标以内。客服聊天在忙时关掉 EAGLE3：在 ShareGPT 上 32 个用户时，它没有带来更多输出，却把首 token 中位数从 2.7 到 3.0 s 推到 5.7 到 7.0 s。如果聊天想要 8 个用户时的收益，就要给每个副本设一个足够低的用户上限，让池子永远不成为限制。

每个产品都在自己的流量上确认设置：计数器给出的接受长度、ITL 中位数和 P99、P99 TTFT，以及最长回答的接受长度，并记录时钟。随机集不再用作决策工具，只保留为冒烟测试。

## Wrong turns

- "EAGLE3 把每 token 时间减半，所以对谁都有用。" 8 个用户时确实如此，在每个数据集上都是。32 个用户时在 ShareGPT 上，它每秒 277 到 283 token，默认为 281 到 288，首 token 为 5.7 到 7.0 s，默认为 2.7 到 3.0 s。收益取决于负载和接受长度。
- "n-gram 没有收益，关闭工单。" 它是在一个没有任何可复制内容的数据集上没有收益。在代码上，8 个用户时它把每 token 时间从 65.9 到 66.4 ms 降到 58.2 到 58.8，在 GSM8K 上降到 54.6 到 55.0。
- "随机集是真实文本，所以有代表性。" 它是 ShareGPT 对话的第一轮，截断或重复到 512 token。对草稿来说它表现得像 ShareGPT，对 n-gram 来说，它不代表任何特定类型的流量。
- "用更深的草稿修好聊天的首 token。" 首 token 变慢，是因为草稿占用了队列需要的池空间。更深的草稿占用的池空间更多，不是更少。
- "比较中位数就行，尾部自己会好。" 32 个用户时，n-gram 把 P99 ITL 提高到 244 到 779 ms，默认为 83 到 106 ms，而它的中位数在两个数据集上看起来还不错。

## Generalize

一个靠猜对来提速的 decode 优化，价值取决于它猜的是什么内容。所以它的基准测试必须用它将要服务的流量，在它将要承受的负载下运行，并在中位数旁边报告尾部和首 token。一个合成数据集只给出这个空间中的一个点；为多个产品做决定，需要每个产品各测一次。

## Taught in

SGLang 手册在[推测解码页](../../../manuals/sglang-101/sections/4-4-speculative-decoding.md#real-prompts-on-the-l4)跑了这四个数据集，vLLM 手册在 [EAGLE3 页](../../../manuals/vllm-101/sections/4-1-speed-up-decode-with-eagle3.md)给出了随机 prompt 收益的局限，并在 [n-gram 页](../../../manuals/vllm-101/sections/4-2-use-n-gram-speculation-for-copy-heavy-work.md)讲了大量复制的场景。
