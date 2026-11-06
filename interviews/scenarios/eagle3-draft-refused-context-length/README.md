---
id: eagle3-draft-refused-context-length
title: 声明了 2,048 个位置的草稿模型
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth]
tags: [speculative-decoding, eagle3, draft-model, context-length, startup]
minutes: 20
lessons: []
manuals: [sglang-101#s-speculative-decoding]
practice: []
cheatsheet: []
related: [scenarios/speculation-depth-vs-batch]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-30B-A3B-Instruct-2507 with the lmsys/SGLang-EAGLE3-Qwen3-30B-A3B-Instruct-2507-SpecForge-Nex draft, and Qwen/Qwen3-8B with the Tengyunw/qwen3_8b_eagle3 draft
  hardware: one GB10 with unified memory, and one L4 as the second machine
source:
  - manuals/sglang-101/capture/gpu/out-gb10/server-eagle3-no-env.log
  - manuals/sglang-101/capture/gpu/out-gb10/server-eagle3.command.txt
  - manuals/sglang-101/capture/gpu/out-gb10/server-eagle3.log
  - manuals/sglang-101/capture/gpu/out-l4/server-eagle3-no-env.log
  - manuals/sglang-101/sections/4-4-speculative-decoding.md
---

## Situation

一个团队要在 GB10 上的混合专家服务器上加 EAGLE-3 推测解码。他们从 cookbook 里照搬了草稿模型和形状参数：三步、top-k 为一、四个草稿 token。启动在草稿 worker 里失败，抛出一个关于两个上下文长度的 `ValueError`，调度器子进程退出。

同一天早些时候，一位同事在 L4 上为稠密的 8B 模型开启了同样的功能，用的是它自己训练好的草稿模型，服务器什么都没改就起来了。团队认定为 30B 模型发布的草稿模型有缺陷，准备给作者提 issue，请他们出一个新的草稿模型。issue 发出之前，你被请来看看这两份日志。

## Evidence

- [被拒绝的启动的回溯末尾](evidence/the-refusal.txt)
- [L4 上的 8B 目标模型和它的草稿模型，没有覆盖](evidence/l4-draft-loaded.txt)
- [L4 启动的设置行](evidence/l4-pool-and-context.txt)
- [成功启动时的命令](evidence/the-command-that-started.txt)
- [设置了覆盖后的同一项检查](evidence/override-accepted.txt)
- [目标模型和草稿模型的两个池](evidence/pool-with-draft.txt)
- [这个覆盖做什么，不做什么](evidence/what-the-variable-does.txt)

## Questions

1. 报错的是哪个组件，目标模型还是草稿模型？检查比较的是哪两个数？
2. L4 上那一对什么都没改就启动了。两个草稿模型的配置有什么不同？
3. 错误消息点名了一个环境变量。设置它会改变什么？又有什么保持原样？
4. 读成功启动的池日志行。草稿模型花了多少内存？推测解码设定了哪个请求上限？
5. 基准测试的 prompt 是 512 个 token。手册里哪起事故展示了 2,048 位置的草稿模型在长输入上的表现？上生产前你会怎样测试？

## Walkthrough

1. **从回溯底部往上读，直到第一个你认得的帧。** 调用帧从调度器进入 `maybe_init_draft_worker`，再进入 EAGLE 草稿 worker，然后进入一个模型配置，错误在 `_derive_context_length` 里抛出。所以这项检查属于草稿模型的模型配置。它拿目标模型的上下文长度 262144，和它为草稿模型推导出的长度 2048 比较，因为目标模型更大而拒绝。消息的最后一句给出了出路：设置 `SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1`。
2. **和 L4 那一对比较。** 在 L4 上，目标模型加载后还空闲 6.41 GB，类型为 `LlamaForCausalLMEagle3` 的草稿模型又加载了 1.90 GB，池算出来是 8,827 个 token，设置行写着 `context_len=40960`。这个草稿模型声明了 40,960 个位置，和它的目标模型一样，所以检查没有可拒绝的。这个变量属于某一个草稿模型配置，不属于 EAGLE-3。手册的规则是：设置它之前，先比较两份配置里的 `max_position_embeddings`。
3. **读成功的启动。** cookbook 里这一对的命令开头就设置了这个变量。设置之后，关于 262144 对 2048 的同一条警告仍然打印，下一行说明了改了什么：草稿模型的 `max_position_embeddings` 被覆盖为 262144。手册对它的含义说得很准确：这个变量只是去掉了检查，并不能让草稿模型学会读长 prompt。
4. **读草稿模型的代价。** 目标模型的池有 216,775 个 token，K 和 V 各 9.92 GB。草稿模型有一个 token 数相同的池，K 和 V 各 0.21 GB，此前用 1.30 s 加载了 1.58 GB 权重。启动还把 `max_running_requests` 重设为 48，这是你自己不设时，每个推测解码处理器都会设的上限。在 L4 上，同样设计的草稿模型把池从 24,094 个 token 压到 8,827 个，所以在小显存的卡上，草稿模型拿走的是批处理需要的内存。
5. **找出覆盖掩盖的那起事故。** 手册事故列表里的 issue #6783，用一个 70B 模型跑 EAGLE-3，草稿模型配置是 2,048 个位置、没有 rope scaling。接受长度在 1k 输入时为 3.2 个 token，3k 时为 1.6，10k 时为 1.2；在 10k 时，服务器每秒产出 63.9 个 token，而不用推测解码时是 102.7。给草稿模型配置加上 rope scaling 和 131,072 个位置后修好了。手册在 GB10 上的运行用的是 512 token 的 prompt，并说明它对长上下文毫无参考价值。测试方法是：在你自己最长的 prompt 上，读解码日志行里的 `accept len`，或者指标里的 `sglang:spec_accept_length`，并在同样的 prompt 上和关闭推测解码时的每 token 时间做比较。

## Resolution

草稿模型没有缺陷。它的配置声明了 2,048 个位置，而面对 262,144 token 的目标模型，上下文长度检查拒绝了它。cookbook 的命令为这一对设置了这个变量；设置后，服务器启动了，目标模型的池是 216,775 个 token，草稿模型 1.58 GB，运行中请求上限 48。给草稿模型作者的 issue 没有发出。

之后团队把这个变量当作一项被去掉的检查，而不是一次修复。他们用解码日志和指标端点，在自己最长的 prompt 上测了接受长度，并按扫描中推测解码仍然占优的并发度，自己设定了 `--max-running-requests`。如果长 prompt 上的接受长度像 issue #6783 那样下降，下一步是换一份带 rope scaling、位置足够的草稿模型配置，或者对这类流量不用推测解码，而不是更大的覆盖。

## Wrong turns

- "草稿模型坏了，要一个新的。" 去掉检查后，草稿模型加载并正常服务了。配置声明 2,048 个位置，是这个草稿模型的一个限制，不是它权重里的缺陷。
- "所有跑 EAGLE-3 的地方都设这个变量。" L4 上的草稿模型不需要这个变量，因为它的位置数和目标模型一致。只给需要它的草稿模型配置设，而且要先比较过两份配置。
- "覆盖修好了问题，所以长 prompt 没事。" 覆盖只是去掉了一项检查。在 issue #6783 里，2,048 位置的草稿模型在 10k 输入时接受长度降到 1.2，让服务器比不用推测解码还慢。
- "把目标模型的上下文长度降到 2048，让检查通过。" 这会把每个请求都限制在草稿模型的上限内，放弃了当初选 30B 模型想要的长上下文。应该修草稿模型配置，或者去测试这个限制。

## Generalize

启动时的拒绝是两个组件之间的一次契约检查，最快的出路是把检查关掉。关掉之前，先读每一方声明了什么，以及这项检查在保护什么。去掉检查的覆盖会把不匹配原样留下，于是检查原本代替你做的那项测量，在这里是长 prompt 上的接受长度，就变成了你的工作。比较两份配置，只为需要的那一对去掉检查，再去测量它原本守护的东西。

## Taught in

SGLang 101 的推测解码页面在[我们在 GB10 上测到的结果](../../../manuals/sglang-101/sections/4-4-speculative-decoding.md#what-we-measured-on-a-gb10)中记录了两次启动，在[没人要的上限](../../../manuals/sglang-101/sections/4-4-speculative-decoding.md#the-limit-nobody-asked-for)中给出了请求上限，并在[事故](../../../manuals/sglang-101/sections/4-4-speculative-decoding.md#incidents)下列出了长 prompt 的失败。
