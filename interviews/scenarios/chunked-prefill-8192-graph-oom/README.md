---
id: chunked-prefill-8192-graph-oom
title: 调大 prefill 分块后服务器起不来了
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, applied-ai-engineer]
rounds: [debugging, ml-depth]
tags: [chunked-prefill, cuda-graphs, startup, oom, kv-pool]
minutes: 20
lessons: []
manuals: [sglang-101#s-the-scheduler-loop-and-schedule-policy, sglang-101#s-forwardmode-and-cuda-graphs, sglang-101#s-mem-fraction-static-and-startup-sizing]
practice: []
cheatsheet: []
related: [scenarios/startup-oom-shared-gpu]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-8B
  hardware: one L4, the first GPU of a two-GPU node
source:
  - manuals/sglang-101/capture/gpu/incidents/l4-chunk-8192-prefill-graph-oom.txt
  - manuals/sglang-101/capture/gpu/out-l4/server-default.log
  - manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md
  - manuals/sglang-101/sections/4-1-forwardmode-and-cuda-graphs.md
  - manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md
---

## Situation

一位工程师想让一台运行 `Qwen/Qwen3-8B` 的 L4 服务器更快地为长 prompt 返回首个 token。想法很简单：prefill 分块大一倍，长 prompt 需要的调度轮次就少一半。他们用 `--chunked-prefill-size 8192` 启动服务器，其他参数都保持默认。

服务器一直没有就绪。日志最后是一条来自 PyTorch 的 `RuntimeError`，内容是 `INTERNAL ASSERT FAILED`，并请读者向 PyTorch 报告 bug。工程师向 PyTorch 项目提了 bug，还提议整个集群都锁定一个更旧的 PyTorch。同一台服务器不加分块参数时，跑完了这张卡上的每一次基准测试。

## Evidence

- [引擎、模型、显卡，以及唯一改动的参数](evidence/the-settings.txt)
- [失败启动的最后六行](evidence/the-failed-start.txt)
- [同一台服务器使用默认分块](evidence/the-control.txt)
- [同一张卡上的默认启动：池、空闲显存和 prefill 捕获](evidence/default-start-pool-and-capture.txt)
- [默认启动的设置行](evidence/default-start-settings-line.txt)
- [按 GPU 显存划分的默认分块和最大解码批次](evidence/default-chunk-by-gpu-memory.txt)
- [手册怎样解读这次失败的启动](evidence/the-manual-reading.txt)

## Questions

1. 最后一行要求给 PyTorch 报 bug。真正的错误在哪一行？在这份日志里，怎样区分原因和后果？
2. 失败启动和扫描测试里的池一样大。显存去哪了？
3. 哪个启动步骤在池之后运行，并且需要池外的显存？分块大小怎样改变这一步的需求？
4. 默认启动在同一张卡上捕获了同一个步骤。它第一个捕获的形状用了多少显存？开始时还剩多少？
5. 如果团队仍想在这里用 8192 的分块，哪个参数能腾出空间？哪个参数不该碰？

## Walkthrough

1. **从断言往上读，停在第一个错误。** PyTorch 断言上面两行是 `torch.AcceleratorError: CUDA error: out of memory`。断言 `markCaptureEnd called with no captures in progress` 是分配器在一次图捕获被这个错误打断之后说的话。随后调度器收到了来自子进程的 SIGQUIT。手册的解读相同：真正的错误是显存不足那一行，断言是它的后果。
2. **查池占了多少。** 失败的启动分配了一个 24,094 token 的池，K 和 V 各 1.65 GB，和这张卡上扫描测试的服务器用的池一样。池之后还空闲 2.90 GB。所以池没有随分块变大，耗尽的是池外的显存。
3. **找出失败的步骤。** `Capturing prefill shape (num_tokens=8192 avail_mem=2.33 GB)` 这一行点出了它。CUDA 构建引入 prefill 的 breakable graph 之后，启动时会为不超过分块大小的每个形状捕获一个 prefill 图。最大的形状就是分块本身。捕获 8192 个 token，要容纳一次 8192 token prefill 的激活值，这需要的显存超过了剩下的 2.33 GB。
4. **和一次成功的启动对比。** 这张卡上的默认启动走的是同样的顺序，只是形状更小。那天它的池有 22,939 个 token，池之后空闲 2.86 GB，第一个捕获的形状是 `num_tokens=4096`，可用 2.28 GB。这次捕获用了 48.33 s，占用 0.83 GB，结束时还空闲 1.45 GB。捕获的 token 数翻倍后，所需显存超过了全部剩余显存。
5. **读默认值从哪来。** CUDA 图页面的表格给出：20 到 35 GB 的卡，分块为 4096；60 GB 及以上才是 8192。默认值依据这类显卡上预计可供图捕获使用的显存来定。调度器页面在 GB10 上测过分块的改动：每秒 1 个和 2 个请求时没有收益，每秒 0.5 个请求时，更小的分块反而有损失。在 L4 上，更大的分块根本没启动起来，所以它的收益没有任何测量。

## Resolution

关闭向 PyTorch 提交的 bug 报告。断言是一次被显存不足打断的捕获的症状；原因是在池之后只剩 2.33 GB 的卡上，为 8192 个 token 捕获 prefill 图。团队保留默认的 4096 分块，那台服务器在那张卡上启动并跑完了每一次测试，这就是事故记录里写明的对照组。

如果这张卡上仍想用更大的分块，就为捕获腾出空间，而不是去掉捕获。把 `--mem-fraction-static` 调低一档，让池变小，捕获就能有多于 2.33 GB 的显存，然后读 `Capture target prefill CUDA graph end` 这一行，看捕获用了多少显存。CUDA 图页面给出了顺序：用更小的图批大小或更低的比例解决捕获显存问题，图保持开启。改动上线之前，再在团队实际的 prompt 长度上，用两种分块分别测首 token 时间，因为手册在能同时跑两种分块的机器上，没发现改分块有收益。

## Wrong turns

- "锁定旧版 PyTorch，断言都说要报 bug 了。" 断言报告的是一次被打断的捕获。它上面两行的显存不足才是原因，旧版 PyTorch 改变不了空闲显存。
- "调高内存比例，让捕获拿到更多显存。" 比例分配的是给权重和池的显存。调高它，留给捕获的就更少了。应该调低。
- "关掉 CUDA 图，保留大分块。" 没有解码图的服务器，对每个用户的每个 token 都要付出 kernel 启动时间。解决捕获显存问题，保留图。
- "分块越大 prefill 总是越快，值得花这些显存。" 手册在 GB10 上测过分块大小：每秒 1 个和 2 个请求时，三种设置彼此都落在随机种子带来的波动范围内。先测量，再付出代价。

## Generalize

启动日志以某个库的断言结束时，往上读到第一个错误，因为这个库往往是第二个受害者。然后问：错误发生在哪一步，这一步的显存取决于什么。改变形状的参数，比如分块大小或图批大小，会改变使用这个形状的捕获所需的显存；而按比例定好大小的池不会挪开给它让位。在小显存的卡上，默认分块大小由显存约束决定，而不是由速度决定。

## Taught in

SGLang 101 的调度器页面在[分块 prefill 部分](../../../manuals/sglang-101/sections/2-2-the-scheduler-loop-and-schedule-policy.md)记录了这次失败的启动，图捕获一节给出了[按 GPU 显存划分的默认分块和捕获显存的规则](../../../manuals/sglang-101/sections/4-1-forwardmode-and-cuda-graphs.md#what-sglang-captures-and-when-it-gives-up)，内存页面解释了[比例怎样在池和其余一切之间划分显存](../../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md#how-sglang-decides-the-split)。
