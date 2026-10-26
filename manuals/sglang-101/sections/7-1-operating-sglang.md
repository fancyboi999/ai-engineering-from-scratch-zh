# 运维 SGLang

> 固定镜像、保留编译内核、只向主进程发信号，并按测量顺序调优，让 SGLang 重启只需数秒且不丢请求。

新推理引擎的第一次生产事故，很少关乎每秒 token 数。滚动更新在回答中途终止十个请求。新 pod 四分钟才就绪，自动扩缩容又启动三个。存活探针在负载下超时，重启最繁忙的 pod。这些都不会出现在基准中，代价却都高于慢内核。

读完本节，你能选择镜像标签并缩短启动时间。你能将健康探针接到正确端点，并在不丢工作的情况下停止服务器。你也能按本手册实测的顺序调整设置，并从三份生产报告中提取各自的经验。

## 固定运行的镜像 {#s-operating-sglang-pin-the-image-you-run}

SGLang 团队在 Docker Hub 发布 `lmsysorg/sglang` 镜像。v0.5.22 时，`latest` 包含最新稳定版，`latest-runtime` 是同版本的较小镜像 {{docs}}。nightly 标签跟随 `main`。镜像仅包含 CUDA 13。文档将 `lmsysorg/sglang:v0.5.19-cu129` 列为最后一个 CUDA 12 标签，因此旧驱动主机需要该标签或升级驱动。

文档中的启动命令为容器提供大共享内存段和宿主 IPC 命名空间：

```bash
docker run -it --gpus all \
  --shm-size 32g \
  -p 30000:30000 \
  -v "$HF_CACHE_DIR:/root/.cache/huggingface" \
  --ipc=host \
  lmsysorg/sglang:latest bash
```

**我们的建议：** 不要部署 `latest`。2026-09-18 至 2026-10-13 的四周内，SGLang 发布了 v0.5.20、v0.5.21 和 v0.5.22，每版都改变了本手册测量的默认值。固定 `v0.5.22` 等标签，版本退化就来自你主动选择的升级。使用 `latest`，它可能在一次重启后自行出现。

## pip install 缺少什么 {#s-operating-sglang-what-pip-install-leaves-out}

镜像存在的原因，单看 pip 安装看不出来。**我们测得**，一台双 NVIDIA L4 主机运行 Ubuntu 24.04，只有驱动，没有 CUDA toolkit。`pip install sglang==0.5.22` 无错完成。但首次 `sglang serve` 失败，之后三次也分别因新原因失败：

```listing
title: 四次启动，缺少四个组件
source: capture/gpu/incidents/l4-toolchain-failures.txt
lang: text
note: 每次尝试的首条错误，省略重复行和进度条。
---
=== attempt: out-l4-nopyheaders/server-default.log
<site-packages>/triton/backends/nvidia/driver.c:9:10: fatal error: Python.h: No such file or directory
…
=== attempt: out-l4-nonvcc/server-default.log
[2026-10-16 14:21:19] RuntimeError: Could not find nvcc and default cuda_home='/usr/local/cuda' doesn't exist
…
=== attempt: out-l4-jitmismatch/server-default.log
…
<site-packages>/flashinfer/data/cccl/libcudacxx/include/cuda/std/__cccl/cuda_toolkit.h:41:8: error: #error "CUDA compiler and CUDA toolkit headers are incompatible, please check your include paths"
…
=== attempt: out-l4-nolibcudart/server-default.log
/usr/bin/ld: cannot find -lcudart: No such file or directory
```

四次失败来自同一个事实：SGLang、Triton 和 FlashInfer 启动时在目标机器上编译内核，而编译器需要完整工具链。

1. Triton 编译一个依赖 Python 头文件的小型 C 辅助程序。Ubuntu 系统 Python 没有 `Python.h`。我们改用 `uv` 提供的、包含头文件的 Python 构建。
2. SGLang 在 `/usr/local/cuda` 下查找 `nvcc`。pip wheel 在 site-packages 的 `nvidia/cu13` 中包含 `nvcc` 13.4，却没有配置指向它。我们将 `CUDA_HOME` 设为该目录。
3. FlashInfer 随后用该 `nvcc` 和自身附带头文件编译注意力内核，但版本不匹配。我们安装了 `flashinfer-jit-cache`，其中包含为 SM 8.9 预编译的内核。
4. SGLang 的 JIT 内核使用 `$CUDA_HOME/lib64` 中的 `-lcudart` 链接。wheel 只有 `lib/libcudart.so.13`。我们构建了一个 `CUDA_HOME`，在其 `lib64` 目录放入 `libcudart.so`。

第五次启动才成功服务请求。GB10 没有这个问题，因为其 DGX 操作系统在 `/usr/local/cuda` 中提供完整工具链。

基准客户端还有一个依赖，防火墙会暴露它。`random` 数据集取用 ShareGPT 文本，从 Hugging Face Hub 下载该文件 {{code}}。设置 `HF_HUB_OFFLINE=1` 后，首次 GPU 基准失败，尽管所有模型都已在磁盘上。我们没有保留该日志。无网络机器使用 `--dataset-name random-ids`，或通过 `--dataset-path` 传入本地 ShareGPT 文件。

**我们的建议：** 从固定镜像运行 SGLang，或使用有完整 CUDA toolkit 的主机。只有驱动的主机，pip 安装需要上述四项修复才能工作。每次升级 SGLang 都可能再次需要它们。

## 冷启动包括权重和编译器 {#s-operating-sglang-cold-start-is-weights-plus-compilers}

新的 SGLang 进程加载权重、编译或加载内核、确定 KV 池大小并捕获 graphs。捕获记录在一行中记录各阶段。这次运行的模型已经在磁盘上：

```listing
title: 默认服务器的启动阶段
source: capture/out/server-default.log
lang: text
note: 启动日志中的一行。MLX 路径不捕获 CUDA graphs，因此 CUDA graph 字段均为 0.00。
---
[2026-10-16 13:58:06] Engine startup timings (s): load_weight=0.00, kv_cache_allocation=0.00, scheduler_e2e=7.01, cuda_graph={prefill=0.00, decode=0.00, target_verify=0.00, draft_prefill=0.00, draft_decode=0.00, draft_extend=0.00}, tokenizer_e2e=11.92
```

**我们测得**，Mac 上 0.6B 模型从首条日志到 `The server is fired up and ready to roll!` 用时 18 s。GPU 上的大模型是另一种问题。**一份实践报告**来自 Doubleword 工程师 2026-04 的博客，在 8 张 B200 上测了 SGLang v0.5.10 和 Qwen3.5-122B-A10B-FP8 {{field Doubleword 2026-04}}。冷启动 695 s，其中加载权重 531 s。保留内核缓存后，热启动 88 s。采用进程 checkpoint 并将权重暂存在主机内存后，用时 9.6 s。

代码能帮助减少其中较低成本的工作。Python 导入 `sglang` 时，会将 Triton、TorchInductor、CUDA、TileLang 和 FlashInfer 缓存重定向到 `SGLANG_CACHE_DIR`，默认 `~/.cache/sglang` {{code}}。将该目录和 Hugging Face 缓存挂载到 pod 删除后仍保留的卷上，重启就能复用已编译内核和已下载权重。

同一报告也为慢启动辩护。对他们而言，每秒 token 数多 10%，比启动快 10 秒更有价值 {{field Doubleword 2026-04}}。对于连续运行数天的集群，我们同意。若集群每晚缩容至零，启动时间就是实际成本，首先应持久化缓存。

## 健康检查：/ready、/health 与 /health_generate {#s-operating-sglang-health-checks-ready-health-and-health-generate}

SGLang 有两类健康端点 {{code}}：

- 分词器管理器就绪后，`/ready` 返回 200，此前返回 503。
- `/health` 和 `/health_generate` 共用一个处理函数。启动和关闭期间返回 503。
- 其他情况下，处理函数发送 `max_new_tokens` 为 1 的单 token 请求，等待反分词器的任意输出。
- `SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION` 默认 true，因此普通 `/health` 也会生成该 token。
- 等待时长为 `SGLANG_HEALTH_CHECK_TIMEOUT`，默认 20 s。期间没有输出，处理函数将服务器标为 `UnHealthy` 并返回 503。

docstring 称，服务器繁忙时探针请求不增加工作，因为调度器任何输出都算存活证明。就工作量而言成立，就时间而言不成立。**真实事故：** issue #22511 报告，v0.5.10 在两张 H800 上运行 GLM-5，高负载下出现 `health check failed. server could not get a response from detokenizer for last 20 seconds` {{issue #22511}}。相关 issue #35884 发现，探针超时后，其请求仍留在调度器中，失败探针不断累积 {{issue #35884}}。

**我们的建议：** 就绪探针使用 `/ready`。存活探针不要触发生成。设置 `SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION=false`，此时 `/health` 不向调度器发请求就返回 200 {{code}}。将 `/health_generate` 用作较慢的深度检查，只告警给人，不触发重启。这样繁忙服务器就不会因排队中的探针丢掉最繁忙的 pod。

## 优雅关闭：只向主进程发信号 {#s-operating-sglang-graceful-shutdown-signal-the-main-process-only}

收到 SIGTERM 后，HTTP 服务器设置 `gracefully_exit`，`/health` 开始返回 503。分词器管理器中的 watchdog 每 5 s 检查该标志 {{code}}。随后每 5 s 记录剩余请求，直到全部结束，再向调度器发送 `ShutdownReq`，给它们 15 s 退出，之后才强制终止。[图 7.1](#fig-7-1)展示该路径及两条跳过排空的路径。

```figure
id: fig-7-1
kind: state
title: SGLang 服务器停止的三条路径
claim: 只有发往主进程的 SIGTERM 会排空运行中请求，强制退出或向进程组发信号都会中止进行中的工作。
caption: 先沿顶部从左向右读优雅关闭路径，再向下读另外两条路径。数字对应图例。来源：capture/out/shutdown-exploratory.log、capture/out/server-default.log 及 v0.5.22 的关闭代码。
```

**我们测得**两种情况，均在 Mac 上。捕获工具通过向整个进程组发送 SIGTERM 停止服务器。调度器子进程也收到信号，先退出了：

```listing
title: 向进程组发送 SIGTERM
source: capture/out/server-default.log
lang: text
note: 默认运行结尾连续四行。
---
[2026-10-16 14:01:45] SIGTERM received. signum=None frame=None. Draining requests and shutting down...
[2026-10-16 14:01:45] Subprocess scheduler_0 (pid=5909) crashed with exit code -15. Triggering SIGQUIT for cleanup...
[2026-10-16 14:01:45] SIGQUIT received. signum=None, frame=None. It usually means one child failed.
[2026-10-16 14:01:46] Sleeping 5 seconds before crash diagnostics to let GPU activity settle.
```

父进程发现子进程崩溃，进入崩溃路径并终止整个进程树。当时没有运行中的请求，因此没有损失。若有负载，全部运行中请求都会失败。随后我们启动服务器，发送一个要求输出 3,000 token 的请求，并只向主进程发送 SIGTERM：

```listing
title: 有一个请求运行时，只向主进程发送 SIGTERM
source: capture/out/shutdown-exploratory.log
lang: text
note: 另一次独立运行的日志摘录，省略中间的 decode batch 行。
---
[2026-10-16 14:13:54] SIGTERM received. signum=None frame=None. Draining requests and shutting down...
…
[2026-10-16 14:13:55] INFO:     127.0.0.1:53237 - "GET /health HTTP/1.1" 503 Service Unavailable
…
[2026-10-16 14:13:57] Gracefully exiting... Remaining number of requests 1. Remaining requests remaining_rids=['ef12359aaaaf40d78fedb4e7f7aaed25'].
…
[2026-10-16 14:14:04] INFO:     127.0.0.1:53209 - "POST /generate HTTP/1.1" 200 OK
[2026-10-16 14:14:07] Gracefully exiting... Remaining number of requests 0. Remaining requests remaining_rids=[].
…
[2026-10-16 14:14:07] INFO:     Finished server process [53853]
```

```listing
title: 客户端看到的结果
source: capture/out/shutdown-exploratory.txt
lang: text
note: 探测脚本的完整输出。
---
health before SIGTERM: 200
sent SIGTERM to the server process only
health during drain: 503
in-flight request: {"status": 200, "completion_tokens": 3000, "finish_reason": {"type": "length", "length": 3000}, "seconds": 14.2}
server exit code: 0
```

请求完整生成了 3,000 token，排空期间 `/health` 返回 503。信号发出十三秒后，服务器以代码 0 退出。`docker stop` 和 Kubernetes 向容器主进程发送 SIGTERM。只有当 `sglang serve` 是主进程时，这才是正确目标，因此应通过 `exec` 或作为 entrypoint 启动它。上面的交互命令让 `bash` 成为主进程，而 `bash` 不会转发信号。若包装脚本向整个进程组转发信号，或 supervisor 终止整个组，就会出现第一份日志的情况。

代码有两条跳过排空的退出路径。服务器已是 `UnHealthy` 时，watchdog 立即退出。环境变量 `SGL_FORCE_SHUTDOWN` 为 true 时，也立即退出。v0.5.22 的 watchdog 直接读取这个旧名称 {{code}}。

环境模块声明了新名称 `SGLANG_FORCE_SHUTDOWN`。兼容代码只将 `SGL_` 变量复制为 `SGLANG_` 名称，不反向复制。**代码显示**，只设置 `SGLANG_FORCE_SHUTDOWN` 无法传到 watchdog。我们读了代码但没有运行验证，因此称其为疑似缺陷。v0.5.22 需要强制停止时，设置 `SGL_FORCE_SHUTDOWN=1`。

**我们的建议：** 终止宽限期要长于输出上限下的最长请求。32K token 的回答以每秒 30 token 生成，需要超过 18 分钟。先限制 `max_tokens`，再设置宽限期，否则排空可能无法按时结束。

## 相信测量结果前 {#s-operating-sglang-before-you-trust-a-measurement}

三项检查能避免我们在自身机器上发现的大多数错误结果：

1. 每次比较前刷新前缀缓存，并记录缓存 token，方法见[第 5.1 节](#s-sglang-benchmark-serving)。工具中，热缓存曾让较高负载看起来更快。后来用 `Qwen/Qwen3-0.6B`、上限 16 测试，不刷新就重复运行，TTFT 中位数约低 4.8 倍。
2. 每次运行记录 SM 时钟和温度，方法见[第 5.1 节](#s-sglang-benchmark-serving)。过热 L4 的吞吐量最多低 28%。
3. 共享 GB10 上，以设置内存上限的容器运行 SGLang，并在启动时记录空闲内存，方法见[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)。

两次运行的贪心输出变化时，先查缓存。命中 prompt 缓存的请求会走不同的 prefill 路径，见[第 4.6 节](#s-deterministic-inference-and-logprobs)。逐个运行请求时，热缓存改变了我们 32 个贪心输出中的 21 个，刷新后恢复完全重复。这两项测试在共享且未锁时钟的 L4 上运行，因此可信的是比值和计数，而非时间。

## 大量驱逐时服务器中止或挂起 {#s-operating-sglang-the-server-aborts-or-hangs-under-heavy-eviction}

**症状：** 多轮负载中，服务器因 `CUDA error: an illegal memory access was encountered` 停止。或日志停止且没有错误，但 GPU 保持 100%。

我们在 SGLang 0.5.22、`Qwen/Qwen3-0.6B`、8,192 token 池及[第 3.5 节](#s-eviction-policies-and-hicache)的轨迹中观察到该现象。从第四轮开始，池几乎每步都驱逐前缀。CUDA graphs 和重叠调度器均按默认开启。运行于 2026-10-23，使用 L4 节点的第二张 GPU，由所有者共享且没有锁时钟。

```listing
title: 相同服务器和轨迹下，各变体的中止与挂起
source: capture/gpu/out-l4/small-pool-crash.txt
lang: text
note: 汇总计数。日志 5 分钟无新行，或运行超过 15 分钟，计为挂起。
---
variant                                          runs   aborts   hangs   clean
lru, CUDA graph and overlap on (default)         6      1        3       2
lru, CUDA_LAUNCH_BLOCKING=1                      3      0        0       3
lru, --disable-cuda-graph                        4      0        0       4
lru, --enable-hierarchical-cache                 3      1        0       2
lru, HiCache, CUDA_LAUNCH_BLOCKING=1             2      0        0       2
```

默认配置 6 次中失败 4 次。HiCache 没有阻止问题，3 次中有 1 次中止。中止和所有挂起都停在同一位置：调度器等待 decode 结果复制完成。关闭 CUDA graphs 后，4 次中失败 0 次。使用 `CUDA_LAUNCH_BLOCKING=1` 后，3 次中失败 0 次。

我们没有找到出错内核，因为阻塞启动时不再触发故障。没有向上游提交 issue。

**临时规避：** 添加 `--disable-cuda-graph`。我们的 L4 运行 8B 模型时，graphs 为每个 decode 步骤节省约 1%，见[第 4.1 节](#s-forwardmode-and-cuda-graphs)。小模型每步中启动开销占比更大，应在自己的模型上测量代价。`CUDA_LAUNCH_BLOCKING=1` 也隐藏了问题，但它让每次内核启动都等待前一次完成，只用于调试，不用于服务。

**还应测试：** 更大的池。池达到 16,384 token 或更多时，同一轨迹不再抖动驱逐，见第 3.5 节。我们没有统计较大池的崩溃次数，因此这不是已证实的修复。

## 调整设置的顺序 {#s-operating-sglang-the-order-to-change-settings}

多数调优建议列参数，顺序却比清单更重要，因为每一步都改变下一步测量的对象。[图 7.1b](#fig-7-1b)展示本手册采用的顺序，各行链接到对应实测章节。

```figure
id: fig-7-1b
kind: flow
title: SGLang 设置的调整顺序
claim: 先测量，再修正内存、prompt 和并发，最后调整内核、并行与分离。
caption: 从上往下读。每行是一项设置或动作，配有支持该选择的测量和相应章节。
```

1. 用 `sglang.benchmark.serving` 测三个并发级别，见[第 5.1 节](#s-sglang-benchmark-serving)。没有基线，后续变更就没有比较数字。
2. 为共享机器设置 `--mem-fraction-static`，见[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)。Mac 上的自动值在并发 32 时导致服务器崩溃。
3. 将每个 prompt 的共享文本放在最前，见[第 3.4 节](#s-prefix-friendly-prompts)。system prompt 开头的一个请求 ID 让我们的首 token 时间约增至 14 倍。
4. 将 `--max-running-requests` 限制在实测拐点。我们的 L4 超过拐点后，吞吐量下降，首 token 时间增长。GB10 到 64 用户时仍在上升，我们没有单独测量并发上限。
5. 此后才调整 CUDA graph 设置和 `--attention-backend`，每次运行只改一项，见[第 4.1 节](#s-forwardmode-and-cuda-graphs)与[第 4.2 节](#s-attention-backend)。v0.5.22 已弃用 `--disable-cuda-graph`，改用 `--cuda-graph-backend-decode` 和 `--cuda-graph-backend-prefill`。
6. 一个副本饱和后，再增加张量、数据或注意力数据并行，见[第 6.1 节](#s-tp-size-dp-size-and-attn-dp-size)。
7. 最后才分离 prefill 与 decode，且必须先测到 prefill 延迟了 decode，见[第 6.3 节](#s-prefill-decode-disaggregation)。

## 生产团队的报告 {#s-operating-sglang-what-production-teams-report}

三个 SGLang 外部团队的报告说明，运维工作花在哪里。

**LinkedIn** 于 2026-02-20 在独立工程博客介绍，使用 H100 服务 375M 至 0.6B 参数的排序模型 {{field LinkedIn 2026-02}}。该负载只需 prefill 和最后 token 的 logits。瓶颈在分词器、ZMQ 消息、Python 垃圾回收、GIL 和调度器，没有一项是 GPU 内核。

批量分词将 P99 延迟从 4,583 ms 降至 464 ms。跳过 decode 的打分路径将 P99 从 6,220 ms 降至 454 ms。预热和 `gc.freeze()` 消除了 100 至 300 ms 的垃圾回收暂停。375M 排序模型从每 GPU 每秒 750 项提升至 2,200 项。相关 PR 多数由 LinkedIn 编写，因此其改进前使用的是较旧 SGLang。

**CERIT-SC** 是捷克学术服务，2025 年从 vLLM 迁移到 SGLang，报告截至 2026-04 已服务 1000 亿 token {{field CERIT-SC 2026-04}}。经验在流量形态。Kimi K2.6 的 prompt 中位数为 2,179 token，第 95 百分位为 99,746 token，他们归因于 agent 编码工具。遇到的问题包括工具调用泄露到推理输出、罕见挂起，以及模型循环持续占用 KV 缓存。修正属于运维措施：输出上限设为 32K token，对循环负载设置 presence penalty。他们仍按模型选择，同时运行两个引擎。

**Ant Group** 于 2025-09-26 在 LMSYS 博客发布 H20 上的 DeepSeek-R1 部署，使用 SGLang v0.5.2 {{field Ant Group 2025-09}}。他们选 EP16 而非 EP32，因为 batch 32 下，EP16 为每秒 675 token，EP32 为 585。增加推测草稿 token 在 batch 1 获益 21%，在 batch 32 却下降约 18%。他们提供三个延迟档位，最严格档要求 TPOT 低于 30 ms，运行 batch 12。重点在于：基于实测的档位表是一项产品决策。

**我们的建议：** 读生产报告，应看流量形态和修复顺序，不要照抄吞吐量。LinkedIn 先修 CPU 工作，再修 GPU。CERIT-SC 在其他调优前先限制输出。Ant Group 选择较小专家组，因为故障影响范围和售卖档位的 batch 大小，比峰值吞吐量更重要。

```takeaways
- 固定 `lmsysorg/sglang:v0.5.22` 等镜像标签，主动选择升级。
- 只有主机具备完整 CUDA toolkit，才在镜像外运行。
- 将 `~/.cache/sglang` 和 Hugging Face 缓存挂载到持久卷。
- `/ready` 用于就绪探测，关闭生成的 `/health` 用于存活探测。
- 只向主进程发送 SIGTERM，并检查日志中的排空记录。
- v0.5.22 强制停止使用 `SGL_FORCE_SHUTDOWN`，不能只设 `SGLANG_FORCE_SHUTDOWN`。
- 先限制输出长度，再选择终止宽限期。
- 按图 7.1b 顺序调整，每次实测只改一项。
- 每次比较前刷新前缀缓存，记录时钟。
- 大量驱逐时出现非法内存访问，应测试扩大池或添加 --disable-cuda-graph。
```

来源：v0.5.22 的 python/sglang/srt/entrypoints/http_server.py (ready, health_generate, HEALTH_CHECK_TIMEOUT)、python/sglang/srt/managers/tokenizer_manager.py (sigterm_watchdog, _SCHEDULER_EXIT_TIMEOUT_SECS)、python/sglang/srt/environ.py (SGLANG_FORCE_SHUTDOWN, SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION, SGLANG_CACHE_DIR, redirect_third_party_caches, _handle_deprecated_envs) 和 python/sglang/__init__.py；v0.5.22 的 docs/docs/get-started/install.mdx；capture/out/server-default.log、capture/out/server-default.command.txt、capture/out/shutdown-exploratory.log、capture/out/shutdown-exploratory.txt、capture/shutdown_probe.py、capture/gpu/incidents/l4-toolchain-failures.txt；v0.5.22 的 python/sglang/benchmark/datasets/random.py；issue #22511 和 #35884；实践报告：Doubleword，fergusfinn.com/blog/fast-sglang-starts（2026-04-06），LinkedIn Engineering，linkedin.com/blog/engineering/ai/scaling-llm-based-ranking-systems-with-sglang-at-linkedin（2026-02-20），CERIT-SC，blog.cerit.io/blog/run-llm2（2025-10-19）和 blog-dev.cerit.io/blog/llm3（2026-04-27），Ant Group 发表于 LMSYS 博客，lmsys.org/blog/2025-09-26-sglang-ant-group（2025-09-26）；capture/gpu/out-l4/os-release.txt；本手册第 3.2、4.6、5.1 节（缓存、时钟和内存检查）；capture/gpu/out-l4/prefix-cache-flush.txt、capture/gpu/out-l4/greedy-output-cache-batch-dtype.txt、capture/gpu/out-l4/small-pool-crash.txt、capture/gpu/out-l4/eviction-multiturn.txt；本手册第 4.1 节（L4 上 CUDA graphs 的代价）。
