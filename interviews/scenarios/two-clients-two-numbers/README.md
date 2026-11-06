---
id: two-clients-two-numbers
title: 两个客户端，两个数字，一台服务器
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [benchmark, client, temperature, methodology, ttft, throughput]
minutes: 25
lessons: [phases/17-infrastructure-and-production/22-load-testing-llm-apis]
manuals: [vllm-101#s-benchmark-your-server-in-15-minutes, sglang-101#s-sglang-benchmark-serving]
practice: []
cheatsheet: [inference-load-testing]
related: [scenarios/prefix-cache-inflated-benchmark, scenarios/thermal-throttle-voided-ab-test]
updated: 2026-11-03
system:
  version: vLLM 0.31.0, measured by the SGLang 0.5.22 client and by vllm bench serve
  model: Qwen/Qwen3-0.6B
  hardware: the shared second L4 of a two-GPU node, throttled but steady at 420 to 495 MHz
source:
  - manuals/vllm-101/capture/gpu/out-l4/bench-client-bias.txt
  - manuals/vllm-101/sections/5-1-benchmark-your-server-in-15-minutes.md
  - manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md
---


## Situation

两名工程师在一张共享 L4 上对一台提供 `Qwen/Qwen3-0.6B` 的 vLLM 服务器做评估，这份报告将决定团队是否保留该引擎。第一位工程师使用 SGLang 基准测试客户端，温度设为 0.7（产品的真实温度），提交的数据为：16 个用户时首 token 等待时间中位数为 1,212 ms，64 个用户时每秒输出 331 个 token。第二位工程师使用 `vllm bench serve`，温度设为 0，提交的数据为：在这台服务器上首 token 等待时间为 1,027 ms，每秒输出 379 个 token。

第一位工程师断定服务器在两次会话之间发生了退化，要求回滚上一个镜像。第二位工程师说对方的客户端有问题。第三位同事针对同一台服务器，以交错轮次的方式运行了所有三个客户端（SGLang 客户端以及 vLLM 客户端的两个版本），并把输出交给了你。

## Evidence

- [一台服务器、三个客户端以及运行规则](evidence/one-server-three-clients.txt)
- [三个客户端在两种温度下的首 token 时间中位数（ms）](evidence/first-token-by-client.txt)
- [来自三个客户端的每秒输出 token 数](evidence/throughput-by-client.txt)
- [表格下方写明的四项发现](evidence/what-the-run-showed.txt)
- [SGLang 手册对同一张表的解读](evidence/report-the-client.txt)
- [导致两次运行结果不一致的四个错误](evidence/the-four-mistakes.txt)

## Questions

1. 在读任何表格之前，列出两份提交除了服务器之外有哪些不同。
2. TTFT 表中的哪些单元格隔离了客户端？客户端效应的大小是多少？
3. 哪些单元格隔离了温度？温度对哪项指标影响最大？
4. 为什么单用户下的一轮测试不能作为反驳吞吐量结论的依据？
5. 两个客户端发送了不同的 prompt。为什么这里它是混淆变量而不是原因？
6. 用四行写出本可避免这场争议的基准测试规则。

## Walkthrough

1. **先列出变量。** 两份提交的不同之处在于：客户端、客户端抽取的数据集、温度以及会话时间，因此时钟和缓存状态也不同。服务器是它们唯一的共同点。在把服务器当作原因之前，这种幅度的分歧有四个候选原因。
2. **读测试设置。** 第三位同事的运行把其中四个变量固定了下来。一台服务器。每次运行的时钟都在 420 到 495 MHz 之间，虽有降频但保持稳定，所以时钟无法区分各个客户端。每次运行前都清空了前缀缓存。两个轮次按客户端交错运行，因此整个会话期间的漂移对每个客户端的影响是相同的。每次运行输入 512 token、输出 128 token，种子为 1，并忽略结束 token。
3. **在 TTFT 表中隔离客户端。** 跨列比较相同温度下的单元格。在单用户且温度为 0 下：SGLang 客户端读数为 154 和 164 ms，`vllm bench` 为 149 和 150，其 Rust 版本为 144 和 144。在 16 个用户下：1,077 和 1,045 对比 1,033 和 1,027。在 64 个用户下：1,688 和 1,838 对比 1,624 和 1,667。SGLang 客户端在每个单元格中的首 token 读数都更高。两个 vLLM 客户端在噪声范围内相互一致，由此可知单用户下的噪声底线为几毫秒，64 用户下为几十毫秒。
4. **隔离温度。** 比较同一客户端下的不同行。对于 16 用户下的 SGLang 客户端，温度 0.7 读数为 1,212 和 1,089 ms，而温度 0 为 1,077 和 1,045。表格下方的注释给出了温度影响最大的指标：单用户下中位数 TPOT 高出约 10% 到 13%（34 ms 对比 30 ms），在 16 和 64 用户下高出 3% 到 6%。吞吐量低了 3% 到 10%。采样需要服务器为每个 token 付出一个 kernel 的计算，而客户端对此什么都不付，所以在这张卡上，0.7 下服务器就慢了这么多。
5. **读包含异常值的吞吐量表。** 16 用户下，SGLang 客户端读数为每秒 218 和 216 token，对比 222 和 222。64 用户下为 359 和 348，对比 379 和 377。在单用户下，SGLang 的某一轮读数为 39.9，而其他所有轮次都在 32 左右。两轮中的一轮不能构成结论，所以注释没有给出单用户下的吞吐量差距。在 16 和 64 用户下差距为 2% 到 8%，TTFT 差距为 3% 到 10%。
6. **说明混淆因素。** SGLang 客户端从 `random-ids` 抽取 prompt，`vllm bench` 从 `random` 抽取。因此两个客户端发送了不同的 token 集合，几个百分点的差距中有一部分可能是 prompt 造成的，而不是客户端代码。那次运行无法把两者分开，所以它报告的是综合的客户端效应，并指明了混淆因素。若要作为原因，需要两个客户端发送相同的 prompt。
7. **把两份提交拼在一起。** 第一份提交是 0.7 下的 SGLang 客户端。第二份是 0 下的 `vllm bench`。它们之间的差距是客户端效应加上温度效应，在不同的日子里测量，没有共享的时钟记录。其中没有任何内容指向镜像有问题。

## Resolution

既没有退化，也没有损坏的客户端。两份报告测量的是两种方法。在这台服务器上，16 和 64 用户下，SGLang 客户端测得的首 token 时间中位数比 `vllm bench serve` 高 3% 到 10%，输出低 2% 到 8%（其间包含 prompt 的混淆影响）；而在单用户下，温度 0.7 相比温度 0 让每 token 时间增加了 10% 到 13%。两个 vLLM 客户端在噪声范围内一致，这正是这张卡上的真实差异幅度。

取消回滚。团队的规则有四行：每个数字旁边写明一个客户端、一个数据集和一个温度；交错测试，至少两轮；每次运行前清空缓存；记录 SM 时钟，因为这次对比之所以成立，唯一的理由就是整个过程中时钟都保持在 420 到 495 MHz。以后使用不同客户端或不同温度的报告是新的基准，而不是对比。

## Wrong turns

- "服务器退化了，回滚镜像。" 两次提交在不同会话中同时改变了客户端和温度。对照运行表明，仅这两项就足以解释该幅度的差距。
- "SGLang 客户端坏了，因为它测出的服务器更慢。" 两个 vLLM 客户端在 0.7 下测出的服务器也慢于在 0 下，而且 SGLang 客户端的偏差是 3% 到 10%，其间还有 prompt 的混淆因素。读数高出几个百分点的客户端是一把不同的尺子，而不是一把错误的尺子。
- "把两份提交的数据取平均值。" 它们测量的是不同的东西。把 0.7 的运行和 0 的运行取平均，得出的数字对应的温度根本没有人在用。
- "在单用户下运行，那里的数字最集中。" 单用户下 SGLang 有一轮测出每秒 39.9 token，而其他轮次都在 32 左右。小负载也不能免除异常值的影响，单个异常值就会颠覆两轮测试的单元格结论。

## Generalize

基准测试数字是整个方法的属性，而不是服务器的属性。只有当方法中除被测对象之外的所有部分都保持固定时，两个数字才具有可比性：客户端、数据集、采样设置、缓存状态、时钟以及运行顺序。两份报告不一致时，在指责系统之前先列出不同之处，再用一次只改动一件事的测试测出每个差异的大小。

## Taught in

vLLM 手册在[基准测试页](../../../manuals/vllm-101/sections/5-1-benchmark-your-server-in-15-minutes.md#use-the-vllm-client)对比了三个客户端，SGLang 手册在[其基准测试页](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md#compare-two-clients-on-one-server)解读了同一张表格，[负载测试课](../../../phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/en.md)解释了为什么测试框架会改变数字。
