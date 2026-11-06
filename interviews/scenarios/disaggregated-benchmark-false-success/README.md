---
id: disaggregated-benchmark-false-success
title: 把失败计为成功的 prefill/decode 分离压测
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [disaggregation, benchmark, kv-transfer, retokenized, false-success, router]
minutes: 20
lessons: [phases/17-infrastructure-and-production/22-load-testing-llm-apis]
manuals: [sglang-101#s-prefill-decode-disaggregation, sglang-101#s-sglang-benchmark-serving, sglang-101#s-sgl-model-gateway, vllm-101#s-split-prefill-and-decode]
practice: []
cheatsheet: [async-disaggregated-inference, inference-load-testing]
related: [scenarios/prefix-cache-inflated-benchmark]
updated: 2026-11-03
system:
  version: SGLang 0.5.22 with the mooncake_tcp transfer backend
  model: Qwen/Qwen3-8B
  hardware: two L4s in one node, the second shared with another team
source:
  - manuals/sglang-101/capture/gpu/incidents/l4-pd-mooncake-tcp-queue.txt
  - manuals/sglang-101/capture/gpu/incidents/l4-pd-summary-lines.txt
  - manuals/sglang-101/capture/gpu/out-l4/bench-pd-swap.txt
  - manuals/sglang-101/sections/6-3-prefill-decode-disaggregation.md
---

## Situation

一个团队不想让长 prompt 卡住其他用户的流式输出，于是把 `Qwen/Qwen3-8B` 拆成两部分：第一张 L4 上的 prefill 服务器和第二张 L4 上的 decode 服务器，前面放一个路由器。两张卡之间没有 RDMA，所以 KV cache 通过 TCP 传输。第二张卡上还跑着另一个团队的 pod。

他们通过路由器跑固定速率扫描。在每秒 8 个请求的固定速率下，摘要打印出 240 个请求中 240 个成功，输出吞吐量为每秒 751.85 个 token，比同一速率下他们最好的单服务器的 728.61 还高。幻灯片都做好了。一位评审又读了一遍摘要，停在一行上：平均首 token 时间是 0.00 ms。

## Evidence

- [启动时的传输后端和两个 KV 池](evidence/two-pools.txt)
- [decode 服务器在等待，传输队列塞满，会话断开](evidence/queue-fills.txt)
- [每秒 8 个请求下的传输失败计数和基准测试摘要](evidence/the-summary-that-lied.txt)
- [prefill 在整卡上、decode 在共享卡上时，扫描的摘要行](evidence/sweep-summary-lines.txt)
- [角色互换后的同一个扫描](evidence/the-swap.txt)

## Questions

1. 读两行池日志。它们描述了什么不对称？对于在一张卡上 prefill、在另一张卡上 decode 的请求，这意味着什么？
2. decode 日志行显示 2 个运行中的请求、19 个预分配的请求。decode 服务器在等什么？它等待时，prefill 那边堆积了什么？
3. 会话失败之后，后面的每个请求仍被算作成功。路由器怎么会返回一个没有文本的 200？哪两个摘要数字暴露了这一点？
4. 角色互换后，分离部署在 8 个用户以内正常，从 16 个用户开始丢文本。这说明小池会在哪里造成伤害？
5. 写出你的基准测试套件在打印吞吐量之前要执行的规则。
6. prefill/decode 分离什么时候值得承担它带来的新失败模式？保留它之前必须先有什么测量？

## Walkthrough

先看池。prefill 服务器分配了 24,094 个 token 的 KV cache，共享卡上的 decode 服务器分配了 2,925 个 token。请求在大池上做完 prefill，然后必须在小池上找到位置。按我们的请求大小，decode 池同时只能放大约四个请求，所以 prefill 那边做完的几乎每个请求都要等 decode 的内存。

第二份清单展示了这种等待。decode 服务器在跑 2 个请求，另有 19 个已经预分配、正在等内存。prefill 继续为它们生成 KV cache，通往 decode 的 TCP 传输通道被塞满：日志里有 4,096 次队列已满的拒绝。扫描开始大约三分钟后，传输会话失败。此后每次传输也都失败，两边都是：prefill 送不出它的 KV 分块，decode 也无法从一个它认为已经死掉的 prefill 实例取到 cache。会话再也没有恢复。

第三份清单是危险的部分。prefill 日志里有 2,902 次传输失败，而基准测试在这个速率下仍把 240 个请求全部算作成功，并计为生成了 30,720 个 token。有两个数字露了馅。重新分词后的 token 数是 0，所以没有任何文本返回给客户端去数。平均 TTFT 是 0.00 ms，因为第一个 token 从来没有到达。对一个 decode 从未运行的请求，路由器返回了 200，客户端则把请求的输出长度当成了已生成的长度。751.85 的吞吐量，就这样来自一台一个字都没写的服务器。

扫描的摘要行显示，分离部署在每种负载下都很早就失败了。2 个用户时，2,048 个生成 token 里只有 512 个作为文本返回；4 个用户时一个都没有，而打印出的吞吐量跳到了 2,516.97。固定速率扫描从每秒 0.5 个请求起就丢了大部分文本。角色互换后，decode 在整卡上、prefill 在共享卡上，从 1 到 8 个用户都正常，每个 token 都重新分词核对过。16 个用户时，8,192 个 token 里有 2,048 个作为文本返回；32 个用户时一个都没有，而打印的吞吐量仍然是 333.41。所以小池放在哪一边，分离部署就在哪一边坏掉；放在 prefill 一边，只是坏得晚一些。

## Resolution

在这两张卡上，分离部署没有有效的负载测试结果，团队不能声称已有结果。在不对称的池下，两台服务器之间的传输会话失败且没有恢复，之后路由器把空响应算成了成功。

由此有三项修复。第一，基准测试套件拒绝任何所有请求首 token 时间都为 0 的运行，并在每份摘要里把 `Total generated tokens (retokenized)` 放在生成 token 数旁边。第二，分离部署需要两个大小与流量匹配的池，共享卡给不了这一点；运行期间，指标 `sglang:num_transfer_failed_reqs_total` 和 `sglang:num_bootstrap_failed_reqs_total` 必须保持不变。第三，团队退回单服务器，测量长 prompt 到达时的 token 间延迟；只有测量显示存在 prefill 干扰，而网关后面的数据并行副本又消除不了它时，才做分离。

## Wrong turns

- "分离部署达到了每秒 751.85 个 token，比单服务器多。" 重新分词后的 token 数是 0。吞吐量数的是客户端要求的 token，不是到达的 token。
- "240 个请求中 240 个成功，说明路由器和两台服务器都健康。" 对传输已经失败的请求，路由器也返回了 200。只有重新分词计数和首 token 时间能看出文本是空的。
- "调大传输队列，让通道不再拒绝。" 通道被塞满，是因为 decode 在 2,925 token 的池里只能放两个请求。更大的队列只会推迟同一个失败。
- "把整卡给 decode，分离部署就能用了。" 角色互换后的部署从 16 个用户开始丢文本，32 个用户时全丢。小池在哪一边都会让分离部署坏掉，只是负载不同。
- "第五项检查以后再加，幻灯片要交了。" 一个没有文本的运行得出的吞吐量，不是来晚了，而是错的。验收规则要在第一张幻灯片之前就放进套件。

## Generalize

由两个服务组成的流水线，可能在边界处报告成功，而工作根本没有发生，因为回答客户端的组件不是失败的那个组件。每份基准测试摘要都需要一项检查，确认输出确实存在，而不只是请求返回了；每种分离架构，在它的数字有意义之前，都需要一个单服务器基线和一个传输失败计数器。

## Taught in

SGLang 手册在[分离部署页面](../../../manuals/sglang-101/sections/6-3-prefill-decode-disaggregation.md)记录了两种拆分，在[基准测试页面](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)给出了基准测试客户端，在[网关页面](../../../manuals/sglang-101/sections/6-4-sgl-model-gateway.md)给出了路由器，vLLM 手册在[prefill 与 decode 页面](../../../manuals/vllm-101/sections/6-3-split-prefill-and-decode.md)讲了同样的拆分，[负载测试这一课](../../../phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/en.md)解释了客户端为什么会说谎。
