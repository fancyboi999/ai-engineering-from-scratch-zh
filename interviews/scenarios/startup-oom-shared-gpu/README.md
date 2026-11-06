---
id: startup-oom-shared-gpu
title: 共享 GPU 上的启动显存不足
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, screen]
tags: [oom, startup, gpu-memory-utilization, max-model-len, shared-gpu, kv-pool]
minutes: 15
lessons: []
manuals: [vllm-101#s-fix-out-of-memory-at-startup, vllm-101#s-count-the-memory-before-you-pick-a-gpu, vllm-101#s-check-that-the-server-is-healthy, sglang-101#s-mem-fraction-static-and-startup-sizing]
practice: []
cheatsheet: [serving-engines-compared]
related: [inference-serving/kv-pool-users-fit]
updated: 2026-11-03
system:
  version: vLLM 0.31.0
  model: Qwen/Qwen3-8B
  hardware: the shared second L4 of a two-GPU node, with another team's processes on it
source:
  - manuals/vllm-101/capture/gpu/out-l4/livecheck-2026-10-22.txt
  - manuals/vllm-101/capture/gpu/incidents/l4-gpu1-vllm-maxlen-oom.txt
  - manuals/vllm-101/sections/2-2-fix-out-of-memory-at-startup.md
---


## Situation

一名值班工程师在节点的第二张 L4 上用 vLLM 部署 `Qwen/Qwen3-8B`。另一个团队也在这张 GPU 上运行 pod，占用了部分显存。服务器在打印 KV cache 容量行之前就停止了，日志末尾是一个提到最大长度为 40,960 token 的 `ValueError`。

一位同事见过这个错误，于是设置了两个参数：`--gpu-memory-utilization 0.83`，以避开另一个团队使用的显存；`--max-model-len 2928`，与测试所需的 2,928 token 内存池大小一致。服务器再次失败，报错几乎相同。工程师现在想把内存比例提高到 0.95，再试一次。

## Evidence

- [首次使用默认最大模型长度启动时的失败日志](evidence/default-length-fails.txt)
- [第二次将最大长度设为目标显存池容量时的失败日志](evidence/tight-length-fails.txt)
- [同一张共享显卡上顺利完成启动并打印显存池的成功案例](evidence/a-start-that-works.txt)
- [三类典型的启动故障模式及其对应的核心调优参数](evidence/three-cases.txt)

## Questions

1. 报错提到了 40,960 个 token。这个数从哪里来？为什么一个该长度的请求能否放下，决定了服务器能否启动？
2. 第二次尝试把最大长度设为池大小，却差了 16 个 token。解释报错行中的计算。
3. 在共享 GPU 上，内存比例描述的是什么？为什么不应先提高它？
4. 哪一行启动日志能证明修复有效？应把它与什么比较？
5. 按你会调整的顺序排列这三个参数，并指出哪些日志文本提示你调整哪个参数。

## Walkthrough

从末尾读第一条错误。vLLM 必须至少能服务一个达到模型最大序列长度的请求。没有人设置 `--max-model-len` 时，这个模型会从模型配置中取得 40,960 token 的长度。一个该长度的请求需要 5.62 GiB 的 KV cache，加载权重并完成启动性能分析后，这张共享卡上只剩下 1.01 GiB。消息甚至算出了答案：估计最大模型长度为 7,360 个 token。服务器失败不是因为 GPU 放不下模型，而是因为默认长度远大于服务实际会发送的任何请求。

第二条错误做的是同一项检查，只是余量不同。配置行显示，`max_model_len` 为 2,928，比例为 0.83，块数覆盖值为 183 个块，每块 16 个 token，共 2,928 个 token。检查比较一个最大长度请求所需的空间与性能分析后剩余的 KV cache 内存，而剩余内存只能容纳 2,912 个 token。两边都打印为 0.4 GiB，所以检查只差一点就能通过。如果性能分析后剩余的内存小于目标池，把最大长度设成目标池大小也没有用。

第三份记录展示了在同一张卡上成功启动的样子。一个更小的模型以 0.5 的比例启动，加载了 1.12 GiB 的权重，并打印出两条关键日志：`Available KV cache memory: 9.02 GiB` 和 `GPU KV cache size: 84,480 tokens`，默认长度下的最大并发为 2.06 倍。这两行证明启动走到了内存池分配阶段。最后一份记录把三种错误对应到三个参数。最大序列长度的报错指向 `--max-model-len`。空闲内存低于期望利用率的报错指向 `--gpu-memory-utilization`，或其他进程。性能分析或 CUDA graph 捕获期间的 CUDA 内存不足，指向批大小限制或 graph 捕获大小。

## Resolution

修复只改了一个参数，报错已经指出了它。我们设置 `--max-model-len 2048`，覆盖了 640 token 的请求，服务器随即启动成功。后来把它提高到 2,304 token，以容纳带 2,048 token 前缀的测试。在共享 GPU 上，内存比例和最大长度共同起作用，应先把最大长度降到服务实际发送的最长请求。

把比例提高到 0.95 有两处不妥。这个比例限制的是单个 vLLM 实例占整张 GPU 显存的份额，不是启动时空闲显存的份额，所以在共享卡上提高比例，就会要求使用另一个租户已经占用的内存。另一个问题是，最初的错误要求为实际请求根本不需要的长度预留 5.62 GiB。两个实例必须共用一张 GPU、且各自池大小已知时，改用 `--kv-cache-memory-bytes` 按字节设置缓存。每次修改后，启动服务器，用 `tee` 保存日志，再用 grep 查找 `GPU KV cache size`，把池大小与内存计算页算出的数量比较。

## Wrong turns

- "提高内存比例，直到能启动。" 这个比例针对整张 GPU，不是空闲内存。在共享卡上提高比例，就是要求使用其他进程已经占用的内存，可能在后续性能分析阶段启动失败，也可能让另一个团队的作业失败。
- "GPU 太小，放不下 8B 模型。" 权重已经加载。失败的是一个 40,960 token 请求的容量检查，消息也说明 7,360 token 能放下。
- "把最大长度设成池大小。" 第二次启动就是这么做的，却差了 16 个 token。池按每块 16 个 token 计数，长度检查需要留一点余量。
- "在生产环境用块数覆盖参数强制设置池大小。" 覆盖参数不会检查所需内存是否存在。它是测试参数，在共享卡上，第一个需要这部分内存的请求就会失败。

## Generalize

因长度限制而失败的启动检查，问的是你的流量需要什么，不是在评判硬件。读报错里的数字，找出哪个设置引入了这个数、真实请求需要多少，再优先修改那个设置。在任何共享机器上，按总内存比例划出的份额都没有得到其他租户的承诺，所以应优先用确切字节数指定限制。

## Taught in

vLLM 手册在[启动显存不足页面](../../../manuals/vllm-101/sections/2-2-fix-out-of-memory-at-startup.md)将各类启动报错映射至对应参数，在[显存测算页面](../../../manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md)推导了显存池大小并在[健康页面](../../../manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md)解读了启动日志，而 SGLang 手册在[内存划分页面](../../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md)展示了对等的启动显存核算机制。
