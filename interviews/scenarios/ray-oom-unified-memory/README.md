---
id: ray-oom-unified-memory
title: Ray 在统一内存上停掉了训练器
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, ml-depth]
tags: [rl, ray, unified-memory, gb10, oom, miles]
minutes: 20
lessons: []
manuals: [miles-101#s-stop-ray-killing-the-job, miles-101#s-memory-on-unified-memory, miles-101#s-pick-a-model-size, vllm-101#s-size-memory-on-a-dgx-spark]
practice: []
cheatsheet: []
related: [scenarios/dead-engine-and-watchdog]
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-4B
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/miles-101/capture/gpu/out-gb10/ray-oom-4b-timing.txt
  - manuals/miles-101/capture/gpu/out-gb10/ray-oom-4b.log
  - manuals/miles-101/capture/gpu/out-gb10/ray-oom-4b-lowmem.log
  - manuals/miles-101/capture/gpu/out-gb10/frac-low-kv.txt
  - manuals/miles-101/sections/2-1-pick-a-model-size.md
  - manuals/miles-101/sections/2-3-stop-ray-killing-the-job.md
---


## Situation

一个团队在一台 GB10 上用 GRPO 训练。0.6B 模型的运行没问题，于是他们换成 `Qwen/Qwen3-4B`，想拿到更好的奖励。运行启动，加载训练器，加载引擎，完成了第一次 rollout。然后在同一步的训练阶段停了，距启动约 15 分钟。日志里没有 CUDA 内存不足的报错。

值班工程师找到一条 Ray 消息，它指向的是节点而不是某块 GPU，并列出了三个进程。工单上的方案有两步：调高 Ray 的内存阈值；给引擎更小的内存比例，让训练器有更多空间。把比例设为 0.2 的第二次运行以同样方式挂掉了。

## Evidence

- [失败运行日志中的三个时间戳](evidence/run-timeline.txt)
- [终止训练器的 Ray 消息](evidence/ray-kill.txt)
- [引擎内存份额从 0.4 降到 0.2 的同一运行](evidence/smaller-engine-share.txt)
- [按模型大小估算的训练器状态，以及在 GB10 上的实际结果](evidence/estimate-table.txt)
- [极小的引擎份额对内存池和 rollout 时间的影响](evidence/engine-share-cost.txt)

## Questions

1. 日志里没有 CUDA 内存不足的报错。读终止那一行：是哪个组件停掉了训练器？它测量了什么，测量的对象是什么？
2. 列出的三个进程占用的内存远低于节点总量。其余的在哪里？为什么进程列表显示不出来？
3. 第二次运行把引擎份额从 0.4 降到 0.2，挂掉时节点总量反而更高。这说明内存去了哪里？
4. 在有独立 GPU 的机器上，调高 Ray 阈值是常见的修复。为什么在这里是错的？
5. 估算一个 4B 模型在混合精度和 Adam 优化器下的训练器状态，并选出这台机器能放下的最大模型。
6. 极小的引擎份额代价是什么？引擎日志中哪一行能在运行开始前告诉你？

## Walkthrough

时间线给出了大致经过。启动器在 05:58 开始，训练器约六分钟后记录 `rollout 0`，容错日志行在 629.7 s 后报告训练函数 `phase=fail`。所以引擎生成了完整一步的回答，训练器在用这些回答训练时挂掉了。这正是占用内存最多的阶段。

第二份记录是 Ray 的内存终止，不是 CUDA 错误。Ray 的内存监视器测量整个节点，读到 121.69 GB 中有 115.86 GB 在使用，消息本身给出的比例是 0.952127。它下面的表格列出训练器 36.77 GB、引擎调度器 2.73 GB、rollout 执行器 1.33 GB。其余在用的内存不在进程列表里。GB10 的 CPU 和 GPU 共用一个内存池，所以 GPU 分配，也就是模型权重、优化器状态和 KV cache，都算在 Ray 监视的数字里。进程列表显示的是每个进程在主机一侧的内存，显示不了这部分。

第三份记录是第二次运行。引擎份额为 0.2 时，节点在终止前达到 119.18 GB，比之前还高，训练器进程占 36.75 GB，与第一次的 36.77 GB 几乎相同。更小的引擎份额没有腾出空间，因为放不下的是训练器这一侧。

估算表说明了原因。用 Adam 和混合精度做全量微调，每个参数大约要保存 16 字节。0.6B 模型约 10 GB，1.7B 约 27 GB，4B 约 64 GB。单是 4B 的估算就占了这台机器的一半，激活、引擎和进程开销还要另算。在这台 GB10 上，1.7B 模型在回答截断为 256 token 时跑完了 4 步，4B 模型两次都在第一步被 Ray 停掉。

最后一份记录显示了反方向的代价。引擎份额为 0.02 时，内存池只能容纳 3,082 个 token，而 0.25 时为 211,813 个，一步 rollout 的时间长了大约六倍。极小的引擎份额让 rollout 缺少内存资源，而训练器照样放不下，得不偿失。

## Resolution

这次终止是真实的内存压力，不是误报。在统一内存上，Ray 读取的数字包含 GPU 分配，所以在 95.2% 处终止，意味着这台机器对上面的每个进程来说都快满了。

要改的是运行，不是监视器。换更小的模型：在这台机器上，这套配方最多放得下 1.7B，团队应该用真实的回答长度跑 4 步测试，同时用 `free -g` 观察节点内存。如果必须训练 4B 模型，就需要更多 GPU，或者换一个保存更少优化器状态的配方，比如在 Megatron 训练器上用 LoRA，这一点我们没有测试过。`RAY_memory_usage_threshold` 保持默认值。引擎份额保持启动器默认值或 0.25 左右，因为 0.2 没能避免终止，而极小的份额让 rollout 慢了好几倍。

## Wrong turns

- "调高 Ray 阈值。" 阈值调高只会让节点更接近满载。如果真的耗尽，操作系统会停掉机器上的任意进程，那种停止不会留下可读的 Ray 消息。
- "降低引擎比例，给训练器腾空间。" 第二次运行就是这么做的，结果在 119.18 GB 时挂掉，训练器占 36.75 GB。放不下的不是引擎。
- "这是 CUDA 内存不足，所以降低引擎批大小。" 日志中没有 CUDA 错误，引擎调度器只占 2.73 GB。终止来自节点内存。
- "把 Ray 的刷新间隔设为零，让监视器不再终止进程。" 日志里写了这个变量，它只会去掉警告。之后操作系统会停掉它选中的任意进程，没有任何消息。

## Generalize

在 CPU 和 GPU 共用一块内存的机器上，每个读主机内存的工具也会读到 GPU 分配，而每个读 GPU 内存的工具读到的是一个没有硬上限的数字。把这类工具发出的内存终止当作真实的短缺。开始之前，从第一性原理估算最大的消耗者。要让运行变小，而不是让监视器变安静。

## Taught in

Miles 手册在 [Ray 页](../../../manuals/miles-101/sections/2-3-stop-ray-killing-the-job.md)解读了这次终止，在[统一内存页](../../../manuals/miles-101/sections/8-4-memory-on-unified-memory.md)解释了这一个内存池，在[模型大小页](../../../manuals/miles-101/sections/2-1-pick-a-model-size.md)估算了模型大小，vLLM 手册在[它的 DGX Spark 页](../../../manuals/vllm-101/sections/2-3-size-memory-on-a-dgx-spark.md)展示了推理服务中的同一条内存规则。
