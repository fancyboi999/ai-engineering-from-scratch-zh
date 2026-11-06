---
id: rate-sweep-never-reached-steady-state
title: 从未进入稳态的速率扫描
card: scenarios
kind: incident
level: 4
roles: [inference-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [system-design, debugging, ml-depth]
tags: [capacity, request-rate, open-loop, queue, goodput, ttft]
minutes: 30
lessons: [phases/17-infrastructure-and-production/08-inference-metrics-goodput, phases/17-infrastructure-and-production/22-load-testing-llm-apis]
manuals: [vllm-101#s-ref-lab-notes, vllm-101#s-benchmark-your-server-in-15-minutes, sglang-101#s-reading-other-peoples-benchmarks, sglang-101#s-sglang-benchmark-serving]
practice: []
cheatsheet: [inference-load-testing]
related: [scenarios/load-knee-and-admission-cap, inference-serving/goodput-sets-the-cap]
updated: 2026-11-03
system:
  version: vLLM 0.31.0 and SGLang 0.5.22
  model: Qwen/Qwen3-8B
  hardware: one L4 with 24 GB of memory
source:
  - manuals/vllm-101/sections/r-7-lab-notes.md
  - manuals/vllm-101/sections/5-1-benchmark-your-server-in-15-minutes.md
  - manuals/sglang-101/sections/5-3-reading-other-peoples-benchmarks.md
  - manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md
  - manuals/sglang-101/capture/gpu/out-l4/server-h2h-rate-sglang.log
  - manuals/sglang-101/capture/gpu/out-l4/server-h2h-rate-vllm.log
---


## Situation

一个平台团队要为新的聊天 API 估算需要多少张 L4 卡。他们在一张卡上用 `Qwen/Qwen3-8B` 做速率扫描：请求以固定速率到达，从每秒 0.5 个到每秒 16 个，每个请求带 512 token 的 prompt，返回 128 token 的回答。每次运行都跑完了，没有请求失败。输出在每秒 4 个请求时升到每秒 286.6 token，到每秒 16 个时仍有 205.8。容量报告的结论是一张卡每秒能接 16 个请求，所以集群规划用预期峰值除以 16。

采购单发出的前一晚，报告到了你手里。报告列出每个速率下的吞吐量和首 token 等待时间的中位数，并把这一列标为"负载下的延迟，预期值"。报告没有写每次运行持续了多久，也没有写 GPU 时钟发生了什么变化。

## Evidence

- [L4 上从每秒 0.5 到 16 个请求的速率扫描](evidence/rate-sweep-table.txt)
- [固定请求速率能做到而闭环做不到的事](evidence/closed-loop-against-fixed-rate.txt)
- [速率扫描的运行时长](evidence/how-long-each-run-lasted.txt)
- [SGLang 的内存池和一行有请求排队的 decode 日志](evidence/sglang-under-the-rate.txt)
- [vLLM 的内存池和一行有请求排队的统计日志](evidence/vllm-under-the-rate.txt)
- [哪些速率跟得上、哪些达到目标，以及手册拒绝比较的那一行](evidence/goodput-by-rate.txt)
- [请求到达速率超过峰值后，每秒完成的请求数](evidence/overload-cost-throughput.txt)

## Questions

1. 报告中哪一列能证明这张卡跟上了请求到达的速度？这个证明在哪个速率失效？
2. 64 个用户的闭环和每秒 16 个请求的开环都能跑完。两种情况下的队列有什么不同？
3. 每秒 16 个请求时，首 token 中位数为 94,322 ms。如果运行时间加倍，这个数会变成怎样？为什么？
4. 读两行日志。每个引擎上有多少请求在运行、多少在等待？这个上限由什么决定？
5. 根据证据，以首 token 1 秒、每 token 100 ms 为目标，定义这张卡的容量。
6. 写出你会改用的速率测试，以及判断某个点已超出容量的停止规则。

## Walkthrough

1. **把表格当成时间序列读，而不是一串独立的点。** 到每秒 2 个为止，输出随速率增长：vLLM 在 0.5 时为 70.6，在 1 时为 123.6，在 2 时为 227.8，TTFT 中位数保持在 180 到 317 ms 之间。服务器处理工作的速度跟得上工作到达的速度。到每秒 4 个时，输出为 286.6，TTFT 中位数为 8,304 ms。每秒 8 个时这对数为 261.8 和 27,510 ms，每秒 16 个时为 205.8 和 94,322 ms。输出在 4 时达到峰值然后下降，而速率每翻一倍，首 token 时间就变成三倍以上。时钟列从 4 时的 1,245 MHz 降到 16 时的 450 MHz。
2. **认清是哪种循环。** 第二份记录区分了两种负载测试。用户数固定的闭环永远不会落后，因为用户收到回答后才发下一个请求。固定速率则不管服务器跟不跟得上，都照样发送。一旦超过服务器能处理的速率，队列就会增长，每个请求的首 token 都比前一个更晚。从每秒 4 个开始，报告中的首 token 列测的是排队时间。
3. **问运行持续了多久。** 第三份记录给出了运行时长：至少 32 个 prompt，或 30 秒的到达时间。在只有 30 秒到达时间的运行中，TTFT 中位数为 94,322 ms，说明一个典型请求的等待时间比整个到达窗口还长。最后一个请求到达时，队列仍在增长。用同样的速率运行两倍时长，中位数会变大，因为每多一秒到达，就多一份服务器消化不了的工作。这个数是运行时长的属性，不是这张卡的属性。超出容量的点就是这个样子：延迟永远稳定不下来。
4. **数一数谁在运行、谁在等待。** SGLang 运行 37 个请求，队列中有 71 个，内存池 93% 已满。vLLM 运行 43 个请求，30 个在等待，内存池使用了 99.7%。两个池分别容纳 24,094 和 24,096 个 token，所以同时只放得下大约四十个 512 加 128 token 的请求。到达速度超过槽位释放速度时，多出来的请求都要等待。两个引擎的区别只在于排队前接纳了多少个。
5. **用 goodput 定义容量。** 手册设了两条限制：首 token 1 s，每 token 100 ms。每秒 2 个时，vLLM 在限制内服务的请求中位数为每秒 1.36 个，SGLang 为 0.88 个，两者的种子范围有重叠。从每秒 4 个起，两个引擎都没有一个请求满足限制。所以这张卡能维持该目标的速率在每秒 2 到 4 个之间，规划时用 2。每秒 16 那一行甚至没有可比性：两个引擎的每次运行试了三次，时钟都低于 1,000 MHz，所以手册不比较它。
6. **算一算过载的代价。** 最后一份记录是同一张卡在 SGLang 手册开环测试中的结果。过了峰值以后，BF16 服务器收到的请求越多，完成的越少：每秒到达 4 个时，每秒完成 2.01 个；每秒到达 8 个时，完成 1.91 个；每秒到达 16 个时，完成 1.62 个。SM 时钟中位数从每秒到达 4 个时的 1,320 MHz 降到每秒到达 16 个时的 465 MHz，70% 的采样显示过热降速。在这张被动散热的卡上，过载不是免费的。它让 GPU 发热，时钟下降，服务器完成的工作比低速率时还少。

## Resolution

报告把跑完当成了容量。固定速率的运行总能跑完，因为客户端在到达窗口结束时停止发送，服务器之后再把队列清空。从每秒 4 个开始，首 token 列就是这个队列的长度；到每秒 16 个时，在 30 秒的到达之后它达到了 94,322 ms。这张卡在任何延迟目标下都没有做到每秒服务 16 个请求。在 1 s 和 100 ms 的目标下，它能服务大约每秒 2 个：请求到达速率为每秒 2 个时，vLLM 的 goodput 为每秒 1.36 个请求，SGLang 为 0.88 个。

峰值要除以 2 而不是 16，然后再留余量。测试有四处改动。每个速率都要运行足够长，看首 token 能否稳定下来；如果延长运行后 TTFT 中位数上升，说明这个速率超出了容量，这个数没有意义。在吞吐量旁边，按你自己的目标报告每个请求到达速率下的 goodput。记录 SM 时钟和温度，凡是时钟低于下限的点，重跑或丢弃，就像手册对每秒 16 那一行的处理。也要跑闭环，因为闭环按用户数找到拐点，开环找到这张卡能维持的速率，规划两者都需要。

## Wrong turns

- "每次运行都跑完了，所以这张卡能处理每秒 16 个。" 固定速率客户端在窗口结束时停止发送，服务器之后再清空队列。跑完是必然的。94,322 ms 的首 token 中位数是队列，不是服务。
- "每秒 16 个时输出仍有每秒 205.8 token，所以吞吐量撑住了。" 输出从每秒 4 个时的 286.6 降到 16 个时的 205.8，同时时钟从 1,245 降到 450 MHz。速率更高时服务器做的工作更少，SGLang 手册的开环测试也显示每秒完成的请求数同样在下降。
- "把每秒 16 个时的 TTFT 当作用户会遇到的最坏情况。" 这个值取决于测试跑了多久。延长运行，它就变大。随运行时长增长的数字描述的是测试，不是服务器。
- "选每秒 8 个时 TTFT 更低的那个引擎。" 每秒 8 个时两个引擎都远远超出容量，分别为 27,510 和 37,211 ms。按队列长度在两台过载的服务器之间做选择，不是容量决策。

## Generalize

超过服务速率的系统没有稳态，所以在那里测到的每个延迟都取决于你测了多久。容量是延迟能稳定下来、goodput 能保持住的最高请求到达速率。要用一个跑得足够久、能证明延迟稳定的开环去找它，再用闭环确认对应的用户数。跑完、吞吐量，以及从不断增长的队列中取出的中位数，都不是容量。

## Taught in

vLLM 手册在[实验笔记](../../../manuals/vllm-101/sections/r-7-lab-notes.md)中给出这次扫描，在[基准测试页](../../../manuals/vllm-101/sections/5-1-benchmark-your-server-in-15-minutes.md#choose-a-closed-loop-or-a-fixed-rate)中讲两种循环，SGLang 手册在[固定到达速率一节](../../../manuals/sglang-101/sections/5-3-reading-other-peoples-benchmarks.md#the-same-pair-at-a-fixed-arrival-rate)解读同一对引擎，并在[基准测试服务页](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)运行它自己的开环测试，[推理指标课](../../../phases/17-infrastructure-and-production/08-inference-metrics-goodput/docs/en.md)定义了 goodput，[负载测试课](../../../phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/en.md)列出了四种负载模式。
