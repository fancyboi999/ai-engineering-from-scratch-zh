---
id: when-to-split-prefill-and-decode
title: prefill 和 decode 拆分部署什么时候划算
card: inference-serving
kind: design
level: 3
roles: [inference-engineer]
rounds: [system-design, design-review]
tags: [disaggregation, kv-transfer, p99-itl, router, prefill]
minutes: 12
lessons: []
manuals: [vllm-101#s-split-prefill-and-decode, sglang-101#s-prefill-decode-disaggregation]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
---
你的对话用户看到的流一直很平稳，直到有人粘贴了一篇长文档，服务器在做 prefill 时，所有用户的流都停顿了。一位同事建议把 prefill 和 decode 拆分部署：分开部署 prefill 服务器和 decode 服务器。这种拆分什么时候划算？它不能解决什么？你会怎么决定？

## Short answer

当测量出的问题是 token 间延迟的尾部，且由长 prompt 引起时，才将 prefill 与 decode 拆开，因为这样 prefill 服务器就永远不会与流共享调度步。它不会提高吞吐量：文档明确说明了这一点，每个请求都要付出 KV 传输的开销，还需要更多服务器和一个路由器；2025 年的一项研究发现，即使是尾部延迟的改善，也取决于负载和传输缓存的路径。靠测量来决定：先用单台服务器，再在网关后增加副本，最后才考虑拆分，并在真实负载下与相同卡数的普通服务器对比。

## Full answer

### 它解决了什么，不能解决什么

在单台服务器上，长 prompt 会与运行中的流共享每一步，每个流在等待下一个 token 时都要多等一会儿。chunked prefill 可以缩短停顿，但无法消除它。两类服务器能消除停顿：prefill 服务器计算 prompt 并构建其 KV cache，decode 服务器接收该缓存并写出回答。

vLLM 文档说明，拆分 prefill 不会提高吞吐量。它让首 token 和流变成两个可以独立调控的数字，并控制了 token 间延迟的尾部。即使是这种收益也是有条件的，并不是默认就会发生：对比拆分服务器与兼顾两个阶段的服务器的研究发现，收益取决于请求负载以及传输缓存的路径。

### 缓存如何传输

在 SGLang 中，网关发起每次交互。它选择一台 prefill 服务器和一台 decode 服务器，附上 prefill 服务器的 bootstrap 主机与端口以及一个随机的 63 位房间号，把相同的请求发送给两端。decode 服务器预留 KV 槽位并公布其地址。prefill 服务器执行正常的 prefill，并把 KV 页直接写入这些槽位中（默认传输后端使用单边 RDMA 写入，在没有 RDMA 卡的集群上走 TCP）。decode 服务器看到传输完成，就把请求加入其运行批次中。每次传输经历 bootstrapping、waiting、transferring 和 success 四个阶段，任何阶段都可能失败。bootstrap 端口默认为 8998，两个超时时间默认为 300 秒，传输队列数默认为 4。

在 vLLM 中，每台服务器获得一个 KV 连接器和一个角色（`kv_producer` 或 `kv_consumer`），常见的连接器需要一个 wheel 包未内置的库（版本固定在 1.4.1）。路由器先将每个请求发送给 prefill 服务器，从其响应中读取传输参数，然后携带参数将请求发送给 decode 服务器。如果传输失败，默认策略会让请求失败；将 `kv_load_failure_policy` 设为 `recompute` 则改为在 decode 服务器上重新计算 prompt。

切勿直接向角色服务器发送请求。调度器会断言 bootstrap 房间必须存在，并提示你使用路由器。

### 决策顺序

1. 在单台服务器上，使用混合长短 prompt 的基准测试测量 TTFT 和 token 间延迟。
2. 在网关后增加数据并行副本，再次测量。
3. 只有当长 prompt 到达时 token 间延迟尾部依然上升，才做拆分；并在真实负载下，将拆分方案与相同 GPU 数的普通服务器对比。

### 确定两边的配比

长 prompt 短回答需要更多 prefill 容量。短 prompt 长回答需要更多 decode 容量。在 8 张 GPU 上的测试发现，高并发下一台 prefill 配三台 decode 在各项指标上均胜出，而在低并发下三配一和二配二能给出更好的首 token。这指明了方向，但不代表你的具体比例。分别测量两边的首 token 和流，一次调整一台服务器。

### 其他团队踩过的坑

- 一台 prefill 配一台 decode 的组合，首 token 时间慢于相同卡数切分的普通服务器。原因是使用了旧版传输库，升级后修复。如果没有单服务器基准，没人会发现问题。
- 在 64 个并发请求下，某套环境记录了大量 bootstrap 失败并在 prefill 端记录 `Aborted by AbortReq`，而在 4 到 7 个并发下工作正常。原因是路由器针对 prefill 客户端的超时时间设得太短，随后的修复调长了它。规则是：abort 意味着客户端或路由器主动中止了请求，所以在怀疑传输之前先检查超时。
- 开启 overlap 调度器后，某部署发现吞吐量上升了约 10%，首 token 却严重变差，因为 KV 传输在等待下一次 kernel 发射；他们的修复是一个在固定版本中未找到的参数。

### 拆分后监控什么

bootstrap-failed 和 transfer-failed 计数器必须保持不再增长。传输延迟和速度指标展示了每次搬运的开销。decode 预分配队列和传输队列指标显示正在等待显存或等待传输的请求。在每次基准测试中，看吞吐量之前先看重新分词后的输出 token 数。

## Follow-ups

- **Level 3:** 在相同的 GPU 上，拆分组合的首 token 到达时间比普通服务器更晚。你首先怀疑什么？ Expected: 传输路径，旧版传输库或路由器超时；某次事故升级库后解决了问题，只有单服务器基准才能表明拆分反而让情况变差了。
- **Level 3:** 在 64 个用户的负载下 prefill 记录了 abort，而在 4 到 7 个用户下工作正常。问题出在哪里？ Expected: 路由器或客户端的超时时间，它中止了仍在运行的请求，而不是传输本身出故障；随后的修复调长了路由器超时。
- **Level 4:** 怎样选择 prefill 与 decode 服务器的比例？ Expected: 根据 prompt 和回答的长度以及并发数决定；长 prompt 短回答需要更多 prefill，反之需要更多 decode；一项测试发现高并发下一配三胜出，低并发下三配一或二配二给出了更好的首 token，所以要分别测量两边，一次调整一台服务器。

## Wrong answers

- "拆分部署能提高吞吐量。" 文档说明它不能；它让首 token 和流成为两个可以控制的数字，代价是每个请求都要做 KV 传输，并需要更多服务器。
- "直接向 decode 服务器发送请求以绕过路由器。" 调度器断言 bootstrap 房间必须存在并提示你向路由器发请求；房间是两台服务器找到同一个请求各自那半部分的方式。
- "传输失败后会自动回退到普通 prefill。" vLLM 默认策略是让请求失败；如果希望 decode 服务器重新计算 prompt，要将失败策略设为 recompute。
- "chunked prefill 已经解决了这个问题。" 它能缩短停顿但无法消除，因为分块依然与运行中的 decode 共享调度步；拆分消除了共享，代价是一次传输和另一组潜在故障。

## Taught in

[拆分 prefill 和 decode](../../../manuals/vllm-101/sections/6-3-split-prefill-and-decode.md)和 [SGLang 拆分部署一节](../../../manuals/sglang-101/sections/6-3-prefill-decode-disaggregation.md)涵盖了配置、局限与踩坑案例。
