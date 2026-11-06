---
id: auto-fraction-oom-at-concurrency-32
title: KV 池只用了 5%，服务器还是崩了
card: scenarios
kind: incident
level: 1
roles: [applied-ai-engineer, inference-engineer, ai-developer-relations-engineer]
rounds: [screen, debugging]
tags: [mem-fraction-static, oom, kv-pool, unified-memory, mlx, startup]
minutes: 15
lessons: []
manuals: [sglang-101#s-mem-fraction-static-and-startup-sizing]
practice: []
cheatsheet: []
related: [scenarios/startup-oom-shared-gpu]
updated: 2026-11-03
system:
  version: SGLang 0.5.22 with the MLX backend
  model: mlx-community/Qwen3-0.6B-4bit
  hardware: a laptop with unified memory, shared with the other programs of a desktop session
source:
  - manuals/sglang-101/capture/out/oom-exploratory.log
  - manuals/sglang-101/capture/out/server-default.log
  - manuals/sglang-101/capture/out/bench-random-c32.txt
  - manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md
---

## Situation

一位开发者布道师在笔记本上准备工作坊演示。服务器用 MLX 后端运行一个量化小模型，启动时只给了模型路径，没有任何内存设置。单个请求正常，几个人同时用也正常。为了展示这台笔记本的能力，布道师用基准测试客户端同时发出 32 个请求。

整个服务器崩溃了。日志最后是一条 Metal 错误 `Insufficient Memory`，进程树全部消失。崩溃前的解码日志行显示有 32 个运行中的请求，token 使用率为 0.05。布道师认定这台笔记本撑不住 32 个用户，打算把演示的并发数降到四个。

## Evidence

- [第一次启动的池日志行](evidence/run-1-startup.txt)
- [几分钟后第二次启动的池日志行](evidence/run-2-startup.txt)
- [并发 32 的基准测试和崩溃](evidence/the-crash.txt)
- [两次启动的池大小为什么不同](evidence/why-the-two-starts-differ.txt)
- [手册怎样解读这次崩溃](evidence/how-to-read-the-crash.txt)
- [采集套件服务器显式设置比例后的池日志行](evidence/the-kit-start.txt)
- [对采集套件服务器跑同一个基准测试](evidence/the-benchmark-that-finished.txt)

## Questions

1. 服务器崩溃时池几乎是空的。内存不在池里，那在哪里？
2. 同一条命令启动两次，得到了两个池大小。两次之间变了什么？
3. 比例是由什么规则算出来的？这条规则对机器做了什么假设？
4. 哪个参数能修好这个问题？采集套件用了什么值？之后池变成什么样？
5. 什么能证明修复有效：一行启动日志，还是一次基准测试结果？

## Walkthrough

1. **读报错前的解码日志行。** 32 个请求占用了 16,095 个 token，只是 312,581 个 token 的池的 5%。池预留了 33 GB，用了不到 2 GB。下一次 prefill 需要池外的激活内存，可操作系统已经没有内存可给了。一个命令缓冲区失败拖垮了调度器，父进程收到 SIGQUIT，杀掉了整个进程树。服务器耗尽的不是 KV cache，而是其他所有内存。
2. **对比两行启动日志。** 第一次启动看到 27.81 GB 可用系统内存，给池的预算是 24.25 GB，可放 227,022 个 token。几分钟后第二次启动看到 38.29 GB，给了 33.39 GB，可放 312,581 个 token。SGLang 没有任何变化。第二次启动时，笔记本上其他程序用的内存更少，空闲内存快照更大，池也跟着变大。
3. **读规则。** 两次预算都是空闲内存的 87.2%，因为自动比例算出来是 0.872。在这个后端上，规则取两个数里较小的一个：Metal 工作集的一个比例，和当前可用系统内存的一个比例；变动的正是第二个快照。这条规则假设服务器运行期间整台机器都归 SGLang 所有。开着浏览器和编辑器的笔记本不是这样的机器。
4. **读采集套件启动里的修复。** 采集套件传了 `--mem-fraction-static 0.4`。它的启动日志行显示快照为 48.49 GB，预算为 19.39 GB，正好是快照的 0.4，池能放 181,574 个 token。32 个 640 token 的请求所需远小于这个池，所以在这个负载下，池变小没有任何代价。
5. **用同样的负载证明。** 对采集套件的服务器跑并发 32 的基准测试，128 个请求在 64.83 秒内全部完成。启动日志行展示了内存怎样划分。基准测试结果证明服务器扛住了之前让它崩溃的负载。

## Resolution

瓶颈从来不是笔记本。自动比例拿走了 87% 的空闲内存给池，而负载只用了池的 5%，下一次 prefill 的激活内存一点也没剩下。用 `--mem-fraction-static 0.4` 后，池缩小到 181,574 个 token，同一个基准测试在并发 32 下完成了全部 128 个请求。

现在演示启动时会设置这个比例，每次改动后布道师都读两行：池日志行上的 `kv_budget`，和设置行上的 `max_total_num_tokens`。在这个后端上，缓存内存指标读数是 0.0，因为 MLX 的池分配在这个指标的统计范围之外，所以要信池日志行上的数字。

## Wrong turns

- "这台笔记本撑不住 32 个用户。" 池能放 312,581 个 token，32 个请求只用了 5%。内存是在池外耗尽的，比例留给那里的内存太少。
- "调高比例，让池更大。" 池就是原因。它占用了 87% 的空闲内存，导致激活内存不足。应该调低。
- "重启服务器，第二次启动的内存更多。" 快照随机器上其他程序变化，下一次启动看到的可能更少。自己设置比例，让池不依赖快照。
- "比例设成 0.95，保险一点。" 0.95 只给激活内存留 5%，手册里的 issue #39675 报告的正是第一次 prefill 时的这种失败。

## Generalize

进程死掉时池几乎是空的，说明内存去了池不统计的地方。在还运行着别的程序的机器上，用空闲内存快照算出来的比例，是在赌服务器整个生命周期里机器其他部分的表现。自己设定份额，读那两行显示结果的启动日志，并用当初搞垮服务器的那个负载来证明内存修复，而不是用一次成功的启动。

## Taught in

SGLang 101 的内存页面在[我们记录的崩溃](../../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md#the-crash-we-recorded)和[我们的立场：在任何共享机器上自己设置比例](../../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md#our-position-set-the-fraction-yourself-on-any-shared-machine)中记录了这次崩溃和修复。
