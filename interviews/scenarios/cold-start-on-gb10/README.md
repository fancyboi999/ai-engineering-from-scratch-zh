---
id: cold-start-on-gb10
title: GB10 上五分钟的冷启动
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, forward-deployed-ai-engineer, applied-ai-engineer]
rounds: [debugging, system-design]
tags: [cold-start, weight-load, unified-memory, gb10, autoscaling, torch-compile]
minutes: 15
lessons: []
manuals: [vllm-101#s-size-memory-on-a-dgx-spark, vllm-101#s-keep-cuda-graphs-and-compile-on, vllm-101#s-ref-version-pins, sglang-101#s-operating-sglang]
practice: []
cheatsheet: []
related: [scenarios/ray-oom-unified-memory]
updated: 2026-11-03
system:
  version: vLLM 0.31.0 in its release container
  model: Qwen/Qwen3-30B-A3B-Instruct-2507
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/vllm-101/capture/gpu/out-gb10/server-load-vllm.log
  - manuals/vllm-101/sections/2-3-size-memory-on-a-dgx-spark.md
  - manuals/sglang-101/sections/7-1-operating-sglang.md
---

## Situation

一个团队用一组 GB10 机器部署 `Qwen/Qwen3-30B-A3B-Instruct-2507`，前面有一个自动扩缩器。流量突增时，自动扩缩器会启动新副本。每个新副本要五分钟以上才能回答第一个请求，于是自动扩缩器把它算作不健康，又启动更多副本。等副本都起来，流量高峰已经过去，团队为一批什么都没服务的机器付了钱。

第一个猜测是镜像拉取或网络。日志把两者都排除了：容器镜像早已在每台机器上，权重也在本地 NVMe 盘上。第二个猜测是模型对这台机器来说太大，可每个副本一旦起来，服务得都很好。

## Evidence

- [启动的那台服务器的设置](evidence/the-settings.txt)
- [权重加载的结尾](evidence/weight-load.txt)
- [编译和预热](evidence/compile-time.txt)
- [图捕获和 KV cache 容量设定](evidence/graphs-and-pool.txt)
- [启动结束时的内存核算行](evidence/memory-split.txt)

## Questions

1. 按顺序读启动日志。五分钟花在哪里？其中多少是权重拷贝？
2. 在这台机器上，权重文件和 GPU 分配的空间位于同一块内存中。为什么加载还要好几分钟？
3. 哪几行证明服务器按计划设定了自身的容量？它们说明 0.75 的比例在这台机器上意味着什么？
4. 同一个镜像在同一台机器上第二次启动，能跳过什么？必须重新承担什么开销？
5. 一份现场报告把另一个引擎的冷启动从 695 s 降到 88 s，再降到 9.6 s。每一步去掉了哪项成本？哪些步骤适用于这里？
6. 这会怎样改变自动扩缩的设计？

## Walkthrough

把日志当作时间线读。权重加载器在 325.26 秒后完成，模型加载那一行报告了 56.93 GiB 内存和 330.542793 秒。编译总共用了 18.67 s，预热用了 0.40 s。图捕获在 39 秒内完成，占用 1.17 GiB。因此，加载权重占了启动时间的绝大部分，编译和图捕获合计约一分钟。

第二个问题是：同一块内存里的拷贝为什么这么慢。加载器把每个张量从内存映射的 safetensors 文件拷贝到 GPU 分配的内存中，一次一个张量。在 GB10 上，从文件映射页拷贝很慢。引擎 issue 跟踪器中一个未关闭的 issue 测得：从文件视图拷贝每个张量约 1.7 ms，而从主机内存开始的拷贝约 0.2 ms。0.31.0 版本让加载的另一部分变快了，即按索引查找专家名称，在这台机器上省了约 25 s，但每个张量的拷贝成本还在。这个问题不是一个参数能解决的。

容量设定的几行显示内存计划成立了。设置行要求比例 0.75，并把块数覆盖为 14,685。服务器发现有 31.32 GiB 可用于 KV cache，用扫描需要的 14,685 覆盖了自己算出的 21,381 个块，报告池为 234,960 个 token，足够 28.68 个 8,192 token 的并发请求。结尾的核算行给出完整划分：启动时 121.69 GiB 里有 114.94 GiB 空闲，按 0.75 期望份额为 91.27 GiB；实际使用中，权重和其他内存占 58.16 GiB，峰值激活占 1.78 GiB，图占 0.31 GiB，正在使用的 cache 为 31.32 GiB。在统一内存上，比例是整台机器的一个份额，其余部分留给操作系统和它的页缓存。

同一台机器上的第二次启动还要重新付出权重的代价。编译不一样：日志显示引擎把编译好的函数存进了缓存目录，所以下次启动直接加载，不再编译。图捕获会重做。SGLang 手册里的现场报告来自 2026 年 4 月一篇关于八 GPU 服务器的工程博客，它在另一个引擎上测了相同的阶段：冷启动 695 s，其中 531 s 是权重加载。在多次运行之间保留 kernel 缓存，让热启动降到 88 s；用进程检查点并把权重放在主机内存里待命，降到 9.6 s。第一步就是这里适用的缓存挂载。最后一步需要一块能让权重待命的主机内存，而这台机器的主机内存和 GPU 共用。

## Resolution

冷启动就是权重拷贝，330 s 的加载里占 325.26 s，没有哪个服务参数能缩短它。团队围绕这个事实改了设计。每个副本只启动一次，然后常驻，因为重启要重新付出完整的加载时间。权重留在本地 NVMe 盘上，绝不放在网络挂载上。编译缓存目录放在容器销毁后仍会保留的卷上，所以第二次启动可以跳过 18.67 s 的编译。

自动扩缩器有两处改动。它的就绪检查等待应用启动日志行出现，再加一次简短请求；还在加载的副本算作启动中，不算不健康，这样自动扩缩器就不会在马上要起来的副本之上继续加副本。另外，扩缩信号从当前队列改为一个预测，提前量要长于一次启动所需的六分钟；或者资源池里保留已经加载好的热备副本。在这台机器上，0.75 的比例给 cache 留了 31.32 GiB。块数覆盖把池限制在 234,960 个 token；不加覆盖时，同样的内存按每 token 96 KiB 能放约 342,000 个 token，所以一个热备副本自己就能扛下突增流量的一大部分。

## Wrong turns

- "镜像拉取慢，把镜像缓存起来。" 镜像本来就在本地。日志显示，容器启动之后，权重加载器花了 325.26 s。
- "队列增长时更快地加副本。" 每个副本都要付出同样的五分钟，而突增持续不到这么久。来晚的副本越多，花得越多，服务的请求却为零。
- "调低内存比例，让服务器更快启动。" 比例决定 cache 大小，不决定拷贝速度。无论比例多少，权重都要 56.93 GiB 和 325.26 s。
- "关掉编译和图，省一分钟。" 两者加起来只占五分钟启动里的约一分钟，编译在第一次启动后就被缓存，而且两者在副本整个生命周期里的每个解码步都会回本。

## Generalize

启动慢时，先读各阶段的耗时，再动任何东西，因为最大的那个阶段通常没有参数能控制。然后让设计去适应它：少启动，把重启时可以复用的内容放到持久化存储上，给自动扩缩器一个提前量长于启动时间的信号。正在加载的副本不是不健康；分不清这两者的探针，会因不断扩容而拖垮整个集群。

## Taught in

vLLM 手册在[DGX Spark 页面](../../../manuals/vllm-101/sections/2-3-size-memory-on-a-dgx-spark.md)解读了这份启动日志，在[编译页面](../../../manuals/vllm-101/sections/4-3-keep-cuda-graphs-and-compile-on.md)权衡了编译和图捕获，并在[版本锁定](../../../manuals/vllm-101/sections/r-4-version-pins.md)里列出镜像和驱动，SGLang 手册则在[运维页面](../../../manuals/sglang-101/sections/7-1-operating-sglang.md)给出了缓存目录和这份现场报告。
