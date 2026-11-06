---
id: cold-start-anatomy
title: 把八分钟的启动时间拆成各个部分
card: cost-capacity
kind: estimate
level: 3
roles: [inference-engineer, applied-ai-engineer]
rounds: [system-design, ml-depth]
tags: [cold-start, weight-loading, compile-cache, startup-probe]
minutes: 12
lessons: [phases/17-infrastructure-and-production/10-cold-start-mitigation]
manuals: [vllm-101#s-size-memory-on-a-dgx-spark, vllm-101#s-keep-cuda-graphs-and-compile-on, vllm-101#s-run-vllm-in-production, sglang-101#s-operating-sglang]
practice: []
cheatsheet: [serving-engines-compared, gpu-kubernetes]
related: [cost-capacity/warm-pool-or-cold-start, cost-capacity/autoscale-on-the-right-signal]
updated: 2026-11-03
---

一台统一内存机器上有个 pod 在服务一个 MoE 模型，从启动到就绪用了大约八分钟。请把这段时间拆成几个部分，说明重启时哪些部分可以跳过，并估算同一台机器上一次热重启是什么样子。

## Short answer

大部分时间花在加载权重上。手册的日志显示，那台机器把 57 GiB 权重拷进内存用了约 330 秒，逐个从文件映射页拷贝张量。引擎初始化用了 127.54 秒，里面包括 39 秒和 38 秒的两次 CUDA graph 捕获，以及 18.67 秒的编译。重启只能复用编译缓存，其他都要重来，所以这台机器上的热重启只比冷启动短一点点；除非权重已经暂存在主机内存里，或者有进程快照，一份现场报告中的启动时间就从冷启动的 695 秒降到了 9.6 秒。

## Full answer

### 从启动日志拆出的各部分

| 阶段 | 实测 | 日志位置 |
|---|---|---|
| 权重加载 | 约 330 秒加载 56.93 GiB | 模型加载那一行 |
| 引擎初始化、性能剖析、KV cache、预热，含两次 graph 捕获 | 127.54 秒，其中编译 18.67 秒 | 引擎初始化那一行 |
| 第一次 graph 捕获，在引擎初始化内 | 39 秒，1.17 GiB | 第一条 graph 捕获日志 |
| 第二次 graph 捕获，在引擎初始化内 | 38 秒，0.31 GiB | 第二条 graph 捕获日志 |

两次捕获都在初始化那一行之前结束，所以已经算在那 127.54 秒里。不要再把它们加上去。

服务器读取参数后约八分钟报告就绪。单是加载就占了三分之二以上。

### 为什么这台机器上加载慢

每个张量都要从内存映射的权重文件拷到 GPU 分配的内存里。在这个平台上，一个未关闭的 issue 测得：从文件视图拷贝一个张量约 1.7 ms，而从主机内存开始拷贝约 0.2 ms。手册固定的那个版本用按索引查找专家名的办法省了约 25 秒，但每个张量的拷贝开销还在。手册的建议是：权重放在本地 NVMe 上，不要放在网络挂载上；服务器启动一次后就让它一直运行。

### 重启能跳过什么

编译缓存在引擎的缓存目录下。把它放在持久卷上，之后的启动就能读到它，编译那部分时间会缩短。SGLang 出于同样的原因，把所有内核缓存都指向同一个目录，手册把这个目录挂在一个 pod 删除后仍然保留的卷上。graph 捕获和权重加载每次启动都会重来。所以这台机器上热重启的实际估算，是冷启动减去编译时间，仍然要好几分钟。

### 压到一分钟以内

冷启动课程把每个阶段对应到一层缓解措施：预置镜像省掉拉镜像的时间，模型流式加载大约把权重加载时间减半，GPU 显存快照恢复已加载状态比重新加载快约十倍。SGLang 手册引用了一份形态相同的现场报告，引擎不同，用了八块 GPU：冷启动 695 秒，其中 531 秒在加载权重；保留内核缓存后 88 秒；用进程检查点并把权重暂存在主机内存后 9.6 秒。要到一分钟以内，靠的是快照或暂存的权重，不是更快的磁盘。

### 这个数字决定了什么

vLLM 手册的 Kubernetes 示例给启动探针配置了 15 分钟的窗口，每 10 秒检查一次，并要求你按自己实测的冷启动来设这个窗口。自动扩缩器需要一个至少同样长的稳定窗口，交互路径还需要一个热副本，因为在八分钟的窗口里，任何扩容都帮不上忙。

## Follow-ups

- **Level 3:** 这台机器上哪个阶段占大头？为什么？ Expected: 约 330 秒的权重加载，因为每个张量都从文件映射页拷贝，这在该平台上很慢。
- **Level 3:** 持久化的编译缓存在重启时能省下什么？ Expected: 引擎初始化中编译那一部分，这里是 18.67 秒。权重加载和 graph 捕获仍要重做。
- **Level 4:** 怎样把重启压到一分钟以内？ Expected: 用进程检查点或 GPU 显存快照，并把权重暂存在主机内存里，那份现场报告靠这些做到了 9.6 秒。只换更快的磁盘做不到。
- **Level 4:** 启动要八分钟，对探针和自动扩缩器意味着什么？ Expected: 启动探针窗口要长于八分钟，稳定窗口至少同样长，交互路径要有一个热副本。

## Wrong answers

- "编译才是慢的部分，改用 eager 模式。" 编译只占八分钟启动里的 18.67 秒，eager 模式还会拖慢之后每个请求的 decode 速度。
- "换更快的 GPU，加载就更快。" 加载的瓶颈是从文件视图拷贝的路径，而不是 GPU。
- "经常重启，好让配置改动生效。" 每次重启都要付全部的加载时间。手册的建议是启动一次，然后让服务器一直运行。

## Taught in

[vLLM 101 的统一内存一节](../../../manuals/vllm-101/sections/2-3-size-memory-on-a-dgx-spark.md)解释权重为什么加载得慢，[编译一节](../../../manuals/vllm-101/sections/4-3-keep-cuda-graphs-and-compile-on.md)解读捕获和编译时间，[生产一节](../../../manuals/vllm-101/sections/7-2-run-vllm-in-production.md)保留编译缓存，[SGLang 101 的运维一节](../../../manuals/sglang-101/sections/7-1-operating-sglang.md)报告热启动和检查点启动的结果，[冷启动课程](../../../phases/17-infrastructure-and-production/10-cold-start-mitigation/)把每个阶段对应到一种缓解措施。
