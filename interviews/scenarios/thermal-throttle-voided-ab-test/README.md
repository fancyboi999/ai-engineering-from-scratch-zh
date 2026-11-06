---
id: thermal-throttle-voided-ab-test
title: 使 A/B 测试失效的温控降频
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [thermal-throttle, sm-clock, cuda-graphs, benchmark, methodology]
minutes: 20
lessons: [phases/17-infrastructure-and-production/22-load-testing-llm-apis]
manuals: [sglang-101#s-forwardmode-and-cuda-graphs, sglang-101#s-sglang-benchmark-serving, vllm-101#s-speed-up-decode-with-eagle3, vllm-101#s-ref-lab-notes]
practice: []
cheatsheet: [inference-load-testing]
related: [scenarios/prefix-cache-inflated-benchmark]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-8B
  hardware: one L4 with 24 GB of memory, in a node whose second L4 ran other tenants
source:
  - manuals/sglang-101/capture/gpu/incidents/l4-thermal-throttle.txt
  - manuals/sglang-101/capture/gpu/out-l4/graphs-sameday-starts.log
  - manuals/sglang-101/sections/4-1-forwardmode-and-cuda-graphs.md
  - manuals/vllm-101/sections/4-1-speed-up-decode-with-eagle3.md
---


## Situation

一个团队想知道 CUDA graph 是否有助于他们在 L4 上的 `Qwen/Qwen3-8B` 服务器。他们在同一个下午先后运行了开启 graph 和关闭 graph 的并发扫描，每次运行测三个种子。两份表格在几个百分点内吻合，在几个测试点上，关闭 graph 的运行甚至读数稍快。他们得出结论：graph 在这张卡上没有任何作用，并计划在生产环境中关闭它以加快启动并节省显存。

一位同事提到，那天下午节点的风扇一直很响，而且节点中的另一张 L4 当时正在运行另一个团队的测试 pod 和 FP8 扫描。

## Evidence

- [团队最初看到的开启与关闭 CUDA graph 的首次对比](evidence/first-ab-table.txt)
- [该扫描期间节点中两张 GPU 的状态](evidence/gpu-state-during-sweep.txt)
- [重复扫描中每次运行的启动情况以及启动前的等待](evidence/cooled-restarts.txt)
- [冷却后的显卡上同一天的两次服务器对比](evidence/same-day-pair.txt)
- [另一个引擎上推测解码测试中的同类错误](evidence/the-other-engine.txt)

## Questions

1. 两次扫描在几个百分点内吻合。为什么这种吻合不能作为 graph 没有作用的证据？
2. 读 GPU 状态行。哪个降频标志被置位了？卡运行在什么时钟下？占其最大值的多大比例？
3. 低时钟对 launch 受限步和显存受限步有什么影响？为什么这尤其会掩盖 graph 的效果？
4. 设计一个使这张卡上的 A/B 测试具有可比性的规范。给出启动条件、重复规则和记录内容。
5. 在该规范下，graph 在这张卡上改变了什么？哪里的结果出乎我们的意料？
6. 另一个引擎的推测解码测试中出现了同样的错误。那里的时钟差距有多大？团队如何处理那些运行？

## Walkthrough

从第一份表格开始。默认服务器和没有 graph 的服务器在每个并发下相差都在几个百分点之内，种子范围重叠。在单用户下，范围是每秒 10.0 到 14.9 和 10.2 到 12.3 token，对于一个本应稳定的测试点来说，这个范围太宽了。扫描没有 GPU 遥测，所以表格里没有任何内容说明卡在做什么。

GPU 状态行说明了一切。运行扫描的第一张 GPU 温度为 87 C，其 SM 时钟为 360 MHz（最大值为 2,040），在卡报告 100% 利用率的同时，软件温控降频标志处于激活状态。第二张 GPU 为 81 C，在运行其他租户的 pod 时保持在 2,025 MHz。被测卡以大约六分之一的时钟运行，其原因与服务器参数毫无关系。

CUDA graph 消除的是一个 decode 步中 kernel 的 launch 时间。在这张卡和模型上，在 60 到 70 ms 的一步中，这项节省大约是半毫秒；而降频的 GPU 每一步都慢，所以这项节省消失在了噪声中。与此同时，降频随温度和邻居负载而变，所以先后运行的两次扫描并没有在相同的速度下运行。在一张时钟飘移的卡上相差几个百分点的吻合根本不是证据。团队移除了这些数字。

第三份记录展示了修正后的方法。重复扫描的每次运行都在 72 C 或以下启动，套件在每次启动前等待达到该温度，等待时间为 116 到 287 s。中位数 SM 时钟低于 1,000 MHz 的运行被搁置并重跑，最多重跑三次。两台服务器在同一天先后运行，使用相同的 24,094 token 池，采样器每秒记录一次时钟和温度。

同一天的那对运行就是结果。在 16 个用户以内，graph 每步节省 0.5 到 0.7 ms，约 1%，单用户下为 60.15 对 60.64 ms。从 2 个用户起，吞吐量差距在 1.2% 以内。在 16 和 32 个用户下，没有 graph 的服务器具有更低的 P99 ITL（73 对 80 ms 和 87 对 103 ms，种子无重叠），手册报告了该差距但没有给出机制解释。在 64 个用户下，两台服务器上超过 48 的批次都以 eager 模式运行，所以该行根本没有测量 graph。

最后一份记录是另一个引擎。其首次推测解码运行没有锁定时钟。在单用户下，不开推测的运行在 210 MHz 下运行，开启推测的运行在约 1,400 MHz 下运行。这么大的差距掩盖了该功能的任何效果，因此团队搁置了这些运行，并在再次比较之前把时钟锁定在 900 MHz。

## Resolution

第一次 A/B 测试无效。卡在温控降频激活的情况下以 360 MHz 运行，没有记录时钟，两次扫描的时钟也不同。从那些表格得出的关于 graph 的任何结论，其实反映的都是热量的影响。

修正后的对比保持 graph 开启。在这个稠密模型上，它们在每个 decode 步中节省约 1%，吞吐量基本持平（差距在 1.2% 以内）；在 16 和 32 个用户下没有 graph 时更低的长尾，是在你自己的模型上测量长尾的理由，而不是为了显存而关闭 graph 的理由。改用适合你流量的 graph 大小。真正的修复是方法：在每次基准测试期间每秒记录 `clocks.sm` 和温度，在卡能承受的温度下启动每次运行，重跑中位数时钟低于底线的任何运行，并且只在相似时钟下比较两次运行。vLLM 手册的实验笔记出于同样的原因列出了四个 L4 会话，并且只在一个会话内部比较数字。

## Wrong turns

- "两种配置都在同一张发热的卡上运行，所以热量抵消了。" 降频随温度和邻居负载而变。相隔一小时的两次运行的时钟不同，而且在六分之一时钟下运行的卡在任何情况下都会掩盖半毫秒的效果。
- "把时钟锁定在最大值，问题就消失了。" 锁定设置的是最高时钟，而高温下的 GPU 仍会降频到它以下。我们锁定在卡能保持的值 900 MHz，并且仍然搁置了低于该值的运行。
- "以相反的顺序运行两种配置。" 第二次运行仍然继承了第一次的热量。轮流测试配置，每次运行前把卡冷却到相同的温度，并记录时钟。
- "在两次运行之间等待一分钟。" 重复扫描在启动前需要 116 到 287 s 才能达到 72 C。要等待温度达标，而不是等待固定时间。

## Generalize

硬件上的每次 A/B 测试都需要控制好硬件变量。随发热或邻居变化的时钟是一个隐藏变量，它会把每个数字乘以相同的系数，而这个系数会吞没小效果，捏造大效果。每次测量都要记录时钟，固定启动条件，并把来自不同时钟的两个数字当作来自不同机器的两个数字。

## Taught in

SGLang 手册在 [CUDA graph 页](../../../manuals/sglang-101/sections/4-1-forwardmode-and-cuda-graphs.md)记录了首次扫描和修正后的成对对比，并在[基准测试页](../../../manuals/sglang-101/sections/5-1-sglang-benchmark-serving.md)设定了时钟规则；vLLM 手册在 [EAGLE3 页](../../../manuals/vllm-101/sections/4-1-speed-up-decode-with-eagle3.md)讲述了推测解码版本，并在[实验笔记](../../../manuals/vllm-101/sections/r-7-lab-notes.md)列出了各会话；[负载测试课](../../../phases/17-infrastructure-and-production/22-load-testing-llm-apis/docs/en.md)涵盖了客户端无法看到的内容。
