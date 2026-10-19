# --mem-fraction-static 与启动容量计算

> SGLang 在启动时根据空闲内存快照一次性确定 KV 池；机器随后发生变化，可能让整个服务器退出。

上游在捕获 Mac 上的首个 SGLang 服务运行四分钟后，被并发 32 的基准触发 Metal 内存耗尽，所有服务进程退出。当时 KV 池有 95% 空着。内存已预分配给池，下一次 prefill 无处运行。

读完本节，你能理解启动内存划分，预测何时失败，并有依据地设置 `--mem-fraction-static`。

## 捕获到的崩溃

捕获工具编写前，上游用相同命令启动两次，均未设置 `--mem-fraction-static`，两次池容量差异很大。

```listing
title: 两次启动，两种池容量
source: capture/out/oom-exploratory.log
lang: text
note: 捕获工具编写前，同一 Mac 上两次探索运行的日志。注释行为上游添加。
---
# run 1 startup
[2026-10-16 13:30:31] Auto-sized attention KV pool: sys_available=27.81 GB, mlx_limit=51.8 GB, mlx_used=0.31 GB, kv_budget=24.25 GB, bytes_per_slot=114688, pool_size=227022
# run 2 startup
'mem_fraction_static': 0.872
[2026-10-16 13:38:58] Auto-sized attention KV pool: sys_available=38.29 GB, mlx_limit=51.8 GB, mlx_used=0.31 GB, kv_budget=33.39 GB, bytes_per_slot=114688, pool_size=312581
```

两次运行间 SGLang 没有变化。第二次启动时 Mac 上其他程序占用更少，因此 `sys_available` 从 27.81 GB 增至 38.29 GB，池随之从 24.25 GB 增至 33.39 GB。两次预算都是空闲内存的 87.2%，因为自动计算的 `mem_fraction_static` 为 0.872。

```listing
title: 并发 32 的崩溃
source: capture/out/oom-exploratory.log
lang: text
note: 来自 run 2，省略 RuntimeError 上方 traceback。
---
[2026-10-16 13:42:53] Decode batch, #running-req: 32, #token: 16095, token usage: 0.05, cuda graph: False, gen throughput (token/s): 564.55, #queue-req: 0
[2026-10-16 13:42:55] Prefill batch, #new-seq: 1, #new-token: 511, #cached-token: 0, token usage: 0.00, #running-req: 0, #queue-req: 9, #pending-token: 0, cuda graph: False, input throughput (token/s): 66.85
RuntimeError: [METAL] Command buffer execution failed: Insufficient Memory (00000008:kIOGPUCommandBufferCallbackErrorOutOfMemory).

[2026-10-16 13:42:57] SIGQUIT received. signum=None, frame=None. It usually means one child failed.
…
[2026-10-16 13:43:02] kill_process_tree called: parent_pid=81559, include_parent=True, pid=81559
```

先读 `token usage: 0.05`。32 个请求保留 16,095 token，仅占 312,581-token 池的 5%。池预留了 34 GB，实际使用不足 2 GB。下一次前向传播的激活需要池外内存，而操作系统已无余量。一次 command buffer 失败便导致 scheduler 退出，服务随后终止整个进程树。

```figure
id: fig-3-2
kind: comparison
title: 同一 Mac，两种内存划分
claim: 按空闲内存 87% 建池，留给激活的空间不足；比例 0.4 时服务保持运行。
caption: 每条从左向右读。绿色为 KV 池，灰色为其他用途。来源：capture/out/oom-exploratory.log 和 capture/out/server-default.log。
```

## SGLang 如何决定划分

**--mem-fraction-static：** 分给模型权重加 KV 池的内存比例。比例之外留给激活、CUDA graphs 和其他程序。参数默认 `None`，由 SGLang 启动时计算 {{code}}。

GPU 上自动值从预留量推导。起始 512 MB，每个 prefill chunk token 再加 1.5 MB {{code}}，然后为张量并行、流水线并行与 CUDA graphs 增加预留。超过 60 GB 的 GPU 至少预留 10 GiB。比例为（GPU 内存减预留）除以 GPU 内存。无法读取设备容量时使用 0.95。

加载权重后再次测量空闲内存。KV 预算是当前空闲量，减去加载前空闲量的 `1 - fraction` 部分 {{code}}。预算除以[第 3.1 节](#s-kv-bytes-per-token-and-the-kv-pool)每 token 字节数，得到池容量。预算非正时停止启动，并输出能工作的最小比例。

Apple silicon 的 MLX 后端规则更简单 {{code}}：取两个数较小者。第一项为 Metal working set 乘比例，再减当前已用内存；第二项为当前可用系统内存乘比例。第二项快照正是两次运行间变化的部分。

一篇公开调优文章反着解释该比例，说它分配权重加缓冲区，剩余才是 KV 缓存。代码恰好相反：静态份额容纳权重与 KV 池。

## 默认值假定机器专属于 SGLang

自动规则适合专用 GPU：没有别的程序分配内存，预留量覆盖一个 prefill chunk 的激活及 CUDA graphs。但三种常见场景会失败。

- **共享机器。** 笔记本、工作站或运行其他作业的节点。启动快照不能代表服务整个生命周期。
- **未知容量。** 无法读取容量的设备采用 0.95，只给激活留 5%。Issue #39675 报告 Apple MPS 正是这样在首个 prefill 内存耗尽 {{issue #39675}}。
- **估计未考虑的额外内存。** Issue #42510 中，计算目标池时草稿模型副本仍驻留，导致草稿池分配失败 {{issue #42510}}。Issue #6027 中，64K-token DeepSeek-V3 prompt 在注意力计算时内存耗尽，尽管日志报告能容纳 274,934 个 KV token {{issue #6027}}。

## GB10 的统一内存

**上游实测**在 DGX Spark 的 NVIDIA GB10 上也观察到同一规则。CPU 与 GPU 共享 121.7 GiB 内存，没有独立显存，因此启动日志各数字的含义不同。

```listing
title: GB10 从容量到池的一次启动
source: capture/gpu/out-gb10/server-default.log
lang: text
note: 摘自默认 GPU 配置启动：Qwen3-30B-A3B、BF16、比例 0.7。
---
[2026-10-17 14:12:57] Failed to get GPU memory capacity from nvidia-smi. Falling back to torch.cuda.mem_get_info(). Reported total GPU memory per device (MiB): [124610], using min: 124610 MiB.
…
[2026-10-17 14:13:05] Load weight begin. avail mem=112.59 GB
…
[2026-10-17 14:18:29] Load weight end. elapsed=323.61 s, type=Qwen3MoeForCausalLM, avail mem=54.84 GB, mem usage=57.75 GB.
[2026-10-17 14:18:32] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 227243, K size: 10.40 GB, V size: 10.40 GB
[2026-10-17 14:18:32] Memory pool end. avail mem=31.22 GB
```

第一行是容量。`nvidia-smi` 不报告 GB10 内存大小，因此 SGLang 从 PyTorch 读取总量。

第二行是空闲内存，代码在此很谨慎。共享系统内存的设备上，`torch.cuda.mem_get_info()` 将内核文件缓存算作已用。上游首次录制时文件缓存较大，工具以此读出 67.7 GiB 空闲。SGLang 检查集成设备后，改读操作系统可用内存 {{code}}，其中包括内核可回收缓存，同次启动读得 113.55 GB。重启后两者一致：PyTorch 为 112.1 GiB，SGLang 为 112.59 GB。

该选择的代价是池容量随机器其他活动变化。六次 BF16 启动使用同样命令与权重：

| 配置 | 加载权重前可用 | SGLang 测得权重占用 | KV 池 token 数 |
|---|---|---|---|
| default | 112.59 GB | 57.75 GB | 227,243 |
| no CUDA graph | 113.21 GB | 54.78 GB | 258,017 |
| deterministic | 113.44 GB | 57.90 GB | 234,517 |
| no radix cache | 113.17 GB | 57.34 GB | 236,315 |
| no overlap | 113.37 GB | 57.92 GB | 233,822 |
| EAGLE-3，带草稿模型 | 113.45 GB | 57.49 GB | 216,775 |

权重未变，测得大小却从 54.78 GB 到 57.92 GB。SGLang 以可用内存下降量测权重，加载期间内核缓存也在变。五次无草稿启动的池相差 14%。前一天同样六次启动中，异常值却落在关闭重叠的服务上，达到 261,113 token。异常值会换位置，说明原因是机器而非参数。统一内存上，一次启动的池大小只能作为下次估计，不是常量。

## 其他程序看得见的池

GB10 上 KV 池达数十 GB，SGLang 几秒就分配完。机器上其他程序都看见这些内存消失。上游 GB10 还为其他用户运行内存保护守护程序，空闲不足时暂停增长最快的进程。它三次在权重加载后暂停 scheduler：

```listing
title: 内存保护暂停 scheduler
source: capture/gpu/incidents/gb10-memory-guard-pauses.txt
lang: text
note: GB10 运行中保护日志前两行。
---
2026-10-16T12:53:16+00:00 2026/10/16 12:53:16 guardian level: Critical: 34.2 GiB left before the freeze zone.
2026-10-16T12:53:16+00:00 2026/10/16 12:53:16 guardian pause: Paused sglang::schedul (pid 2983880, rohit): it grew 36.7 GiB in 5s with 34.2 GiB left. Resume or stop it from the app.
```

SGLang 没报错。服务日志停在 `Load weight end`，永远到不了健康检查。保护程序按自身规则正确执行：scheduler 正是增长最快者。几秒后池完成，保护日志又说 “Back to normal”。上游与机器所有者协商，仅在实验期间停止保护程序。

NVIDIA 驱动启动时也报告内存错误。GB10 内核日志成批出现：

```listing
title: 服务启动时驱动输出
source: capture/gpu/incidents/gb10-driver-no-memory.txt
lang: text
note: 文件末行，上方行统计每分钟出现批次。
---
NVRM: nvCheckOkFailedNoLog: Check failed: Out of memory [NV_ERR_NO_MEMORY] (0x00000051) returned from _memdescAllocInternal(pMemDesc) @ mem_desc.c:1359
```

其中六批在分钟级上与工具的 `KV Cache is allocated` 对齐，时间为 14:36、14:55、15:04、15:30、15:47、15:58。这六个服务均变为健康并完成基准。4,096-token 池的启动未出现该错误，其余批次来自上游测试与扫描服务器。

**本手册的建议：** 统一内存上，KV 池占用的是整台机器让出的内存。有依据地设置 `--mem-fraction-static`，启动前告知其他用户。不要仅凭驱动这一行报警，应对服务器未变健康报警。

## 本手册的建议：共享机器自行设置比例

只要机器上还跑别的程序，就自行传入 `--mem-fraction-static`。捕获工具在 Mac 上使用 0.4；同样的并发 32 基准，此时 128 个请求全部完成，而此前 run 2 崩溃。

```listing
title: 显式比例的工具服务器
source: capture/out/server-default.log
lang: text
note: 默认工具配置的一行启动日志。
---
[2026-10-16 13:58:03] Auto-sized attention KV pool: sys_available=48.49 GB, mlx_limit=51.8 GB, mlx_used=0.31 GB, kv_budget=19.39 GB, bytes_per_slot=114688, pool_size=181574
```

预算变为 19.39 GB，即快照 48.49 GB 的 0.4。池仍容纳 181,574 token，远多于 32 个 640-token 请求所需。该负载从未填满池，因此缩池没有性能成本。

上游也在 GB10 测了反方向。[第 5.1 节](#s-sglang-benchmark-serving)的负载扫描分别以工具默认 0.7 与 0.82 运行，每点三个种子。

```listing
title: GB10 上更大的池，最满时刻
source: capture/gpu/out-gb10/server-load-default-kv-max.log
lang: text
note: 比例 0.82 的池，以及整次扫描占用最高的 decode 行。
---
[2026-10-17 16:35:26] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 383065, K size: 17.54 GB, V size: 17.54 GB
[2026-10-17 16:47:45] Decode batch, #running-req: 64, #token: 40751, token usage: 0.11, cuda graph: True, gen throughput (token/s): 263.88, #queue-req: 0
```

**上游实测**BF16 池从 234,600 增至 383,065 token，增长 63%。FP8 池从 1,084,458 增至 1,378,545 token。但吞吐量没变：64 用户时 BF16 为 238.72 对 235.38 tok/s，FP8 为 442.71 对 440.86。所有并发下，两中位数相差不超过 2%。

```figure
id: fig-3-2c
kind: chart
title: 池从未满时，增大毫无收益
claim: GB10 比例从 0.7 提到 0.82，BF16 池增大 63%，闭环吞吐量变化不足 2%。
caption: 输出吞吐量对最大并发，每点三个种子。实线 0.7、虚线 0.82；梅紫 BF16、绿色 FP8 加 FP8 KV。来源：capture/gpu/summary/gb10.json。
```

日志解释了原因：64 个请求占 40,751 token，即池的 11%。0.7 时最高占用也仅 17%。池从来不是限制，增大就无事可做。对比[第 4.3 节](#s-quantization)的 L4：64 用户时 BF16 池已满，FP8 几乎让吞吐量增加到三倍。

[第 5.1 节](#s-sglang-benchmark-serving)开环扫描给出另一半答案。每秒 16 请求超过 GB10 服务能力，旧请求仍在运行，新请求持续到达，此时大池确实有用。

```listing
title: 开环过载下比例 0.7 的池
source: capture/gpu/out-gb10/server-rate-default-full.log
lang: text
note: 每秒提供 16 请求、比例 0.7 的一行 decode 日志。
---
[2026-10-16 19:08:23] Decode batch, #running-req: 374, #token: 227530, token usage: 0.96, cuda graph: False, gen throughput (token/s): 866.37, #queue-req: 101
```

```listing
title: 相同过载下比例 0.82 的池
source: capture/gpu/out-gb10/server-rate-default-kv-max.log
lang: text
note: 每秒提供 16 请求、比例 0.82 时占用最高的 decode 行。
---
[2026-10-17 18:00:45] Decode batch, #running-req: 480, #token: 289721, token usage: 0.75, cuda graph: False, gen throughput (token/s): 994.20, #queue-req: 0
```

0.7 时池占 96%，101 个请求在池外等待。0.82 时本次全部 480 个请求可同时放入。**上游实测**每秒完成 5.19 对 3.88 请求，增加 34%；输出为 664 对 497 tok/s，各三个种子。两次运行相隔一天，部分差异可能来自机器。日志证明机制，收益幅度只属于本次实验。FP8 两种比例都有超过百万 token 的池，完成率未变：8.29 对 8.26。

因此额外 13.6 GB 在 64 用户时毫无收益，过载时却增加约三分之一吞吐量。按峰值 token 占用确定池容量，包括到达速度高于服务速度的突发。GB10 与其他程序共享时，多占无用内存意味着其他程序少一份内存。

专用 GPU 则先信任自动值。只有日志显示满池与回撤时，才以 0.02 为步长提高比例。在预发布环境用最长 prompt 找到上限，生产设置低一至两步。若长 prompt 在注意力计算中失败，像 issue #6027 那样，则降低比例。

比例也影响横向比较。一份独立基准用 SGLang 自动比例，对比 vLLM 默认 0.9 {{field Rawlinson 2025-12}}，两者 KV 池大小相差很大。相信未报告双方数值的比较前，先读[第 5.3 节](#s-reading-other-peoples-benchmarks)。

## 测量什么

- 启动时的 `max_total_num_tokens`，它是整套计算的结果。
- Decode 日志的 `token usage`，接近 1.0 表示池满。
- 最重 prefill 期间操作系统报告的空闲内存。

Apple silicon 还需注意：上游捕获的 `kv_cache_memory_usage_gb` 为 0.0，因为 MLX 在该指标的记账范围外分配自己的池。应读 `MlxAttentionKVPool` 日志，这里报告约 19,860 MB。

```takeaways
- 按峰值 token 占用（含突发）确定池容量，不按空闲内存。
- 运行其他程序的机器自行设置 --mem-fraction-static。
- 每次修改后读 kv_budget 与 max_total_num_tokens。
- 只有池满且回撤时，才小步提高比例。
- 长 prompt 在注意力内存耗尽时，降低比例。
- 比较引擎必须让双方都报告 KV 池容量。
- GB10 每次启动读池容量，因为各次会变。
```

Sources: python/sglang/srt/arg_groups/memory_hook.py (handle_gpu_memory_settings), python/sglang/srt/mem_cache/kv_cache_configurator.py (_profile_available_bytes), python/sglang/srt/hardware_backend/mlx/model_runner.py (_compute_pool_size), python/sglang/srt/arg_groups/fields/schedule.py (mem_fraction_static) at v0.5.22, capture/out/oom-exploratory.log, capture/out/server-default.log, capture/out/metrics.txt, python/sglang/srt/utils/common.py (get_available_gpu_memory) at v0.5.22, capture/gpu/out-gb10/server-*.log, capture/gpu/out-gb10/environment.json, capture/gpu/incidents/gb10-memory-guard-pauses.txt, capture/gpu/incidents/gb10-driver-no-memory.txt, issues #39675, #42510, and #6027, the Rawlinson benchmark of 2025-12-05. capture/gpu/out-gb10/server-load-default-kv-max.log, capture/gpu/summary/gb10.json. capture/gpu/out-gb10/server-rate-default-full.log, capture/gpu/out-gb10/server-rate-default-kv-max.log.
