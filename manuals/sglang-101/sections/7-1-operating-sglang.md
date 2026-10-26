# 运维 SGLang

> 固定镜像、保留已编译内核、只向主进程发信号，再按测量顺序调优，让 SGLang 重启只花几秒且不丢请求。

新推理引擎的首次生产事故，很少与每秒 token 数有关。滚动更新把十个生成到一半的请求杀掉；新 pod 四分钟才就绪，自动扩缩容又启动三个；存活探针在负载下超时，重启了最忙的 pod。基准里看不到这些，它们的代价却都高于一个慢内核。

读完本节，你能选择镜像标签、缩短启动时间，为健康探针选择正确端点，不丢工作地停止服务器。你也能按本手册实测顺序调整设置，并读懂三份生产报告各自的教训。

## 固定实际运行的镜像

SGLang 团队以 `lmsysorg/sglang` 在 Docker Hub 发布镜像。v0.5.22 时，`latest` 为最新稳定版，`latest-runtime` 是同版本较小镜像 {{docs}}。Nightly 标签跟随 `main`。镜像只包含 CUDA 13。文档将 `lmsysorg/sglang:v0.5.19-cu129` 列为最后一个 CUDA 12 标签，所以驱动较旧的主机需要该标签或升级驱动。

文档中的启动命令给容器分配较大共享内存，并使用主机 IPC 命名空间：

```bash
docker run -it --gpus all \
  --shm-size 32g \
  -p 30000:30000 \
  -v "$HF_CACHE_DIR:/root/.cache/huggingface" \
  --ipc=host \
  lmsysorg/sglang:latest bash
```

**我们的建议：** 不要部署 `latest`。SGLang 从 2026-09-18 到 2026-10-13，四周内发布 v0.5.20、v0.5.21、v0.5.22，每版都改变了本手册测量的默认值。固定 `v0.5.22` 这样的标签，性能回退就是你主动升级的结果；使用 `latest`，则可能只因重启就被动遭遇回退。

## pip install 没告诉你的事

镜像存在的理由，被 pip 安装掩盖了。**我们在一台双 NVIDIA L4、Ubuntu 24.04、有驱动却无 CUDA toolkit 的主机上实测。** `pip install sglang==0.5.22` 无错误完成，首次 `sglang serve` 却失败，接下来三次也失败，每次原因都不同：

```listing
title: 四次启动，四项缺失
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

四次失败都来自同一个事实：SGLang、Triton、FlashInfer 会在启动时针对目标机器编译内核，编译器需要完整工具链。

1. Triton 编译一个依赖 Python 头文件的小型 C helper。Ubuntu 系统 Python 没有 `Python.h`，我们改用 `uv` 提供、包含头文件的 Python 构建。
2. SGLang 在 `/usr/local/cuda` 下找 `nvcc`。Pip wheel 在 site-packages 的 `nvidia/cu13` 中提供 `nvcc` 13.4，但没有路径指向它。我们把 `CUDA_HOME` 指向该目录。
3. FlashInfer 随后用这个 `nvcc` 和自身捆绑的头文件编译注意力内核，但版本不匹配。我们安装了 `flashinfer-jit-cache`，其中有针对 SM 8.9 预编译的内核。
4. SGLang 的 JIT 内核从 `$CUDA_HOME/lib64` 以 `-lcudart` 链接。Wheel 只有 `lib/libcudart.so.13`。我们构造了一个 `CUDA_HOME`，让其 `lib64` 包含 `libcudart.so`。

第五次启动终于能服务请求。GB10 没遇到这个问题，因为 DGX 操作系统的 `/usr/local/cuda` 有完整 toolkit。

基准客户端还有一项依赖，在防火墙后会暴露出来。它的 `random` 数据集从 ShareGPT 取文本，会从 Hugging Face Hub 下载文件 {{code}}。设置 `HF_HUB_OFFLINE=1` 后，即使所有模型都在磁盘上，首次 GPU 基准仍失败。无网络机器应使用 `--dataset-name random-ids`，或通过 `--dataset-path` 传入本地 ShareGPT 文件。

**我们的建议：** 使用固定镜像运行 SGLang，或选择具有完整 CUDA toolkit 的主机。只有驱动的主机上，pip 安装在我们修复四项之后才能工作，每次 SGLang 升级都可能重新遇到。

## 冷启动是权重加编译器

新 SGLang 进程加载权重、编译或加载内核、确定 KV 池大小、捕获计算图。捕获日志用一行记录各阶段。以下运行的模型已在本地磁盘：

```listing
title: 默认服务器的启动阶段
source: capture/out/server-default.log
lang: text
note: 启动日志中的一行。MLX 路径不捕获 CUDA graphs，因此 CUDA graph 字段全为 0.00。
---
[2026-10-16 13:58:06] Engine startup timings (s): load_weight=0.00, kv_cache_allocation=0.00, scheduler_e2e=7.01, cuda_graph={prefill=0.00, decode=0.00, target_verify=0.00, draft_prefill=0.00, draft_decode=0.00, draft_extend=0.00}, tokenizer_e2e=11.92
```

**我们在 Mac 上测得** 0.6B 模型从首行日志到“The server is fired up and ready to roll!”共 18 s。GPU 上的大模型是另一回事。**Doubleword 的实践报告**来自 2026-04 的工程博客，测量了 SGLang v0.5.10、8 张 B200 上的 Qwen3.5-122B-A10B-FP8 {{field Doubleword 2026-04}}。冷启动 695 s，其中 531 s 加载权重；保留内核缓存后温启动 88 s；使用进程 checkpoint、将权重预放主机内存后为 9.6 s。

代码帮助处理其中成本较低的部分。Python 导入 `sglang` 时，将 Triton、TorchInductor、CUDA、TileLang、FlashInfer 缓存统一指向 `SGLANG_CACHE_DIR`，默认 `~/.cache/sglang` {{code}}。把该目录和 Hugging Face 缓存挂到生命周期长于 pod 的卷上，重启即可复用已编译内核和已下载权重。

同一报告还认为，对持续运行多日的集群，提高 10% token 吞吐量比缩短 10 秒启动时间更有价值 {{field Doubleword 2026-04}}。我们认同这个判断。但每晚都会缩容到零的集群承担着真实启动成本，因此应先修复持久缓存。

## 健康检查：/ready、/health 与 /health_generate

SGLang 有两类健康端点 {{code}}：

- `/ready` 在 tokenizer manager 就绪后返回 200，此前为 503。
- `/health` 与 `/health_generate` 共用一个处理器，启动和关闭过程中返回 503。
- 其他时候，处理器发送 `max_new_tokens` 为 1 的请求，等待 detokenizer 任意输出。
- `SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION` 默认为 true，因此普通 `/health` 也会生成这个 token。
- 等待超时由 `SGLANG_HEALTH_CHECK_TIMEOUT` 决定，默认 20 s。期间没有输出，处理器将服务器标为 `UnHealthy` 并返回 503。

文档字符串称服务器繁忙时，探测请求不花额外成本，因为调度器任意输出都能证明存活。工作量上如此，时间上却不成立。**真实事故：** issue #22511 报告，v0.5.10、两张 H800 运行 GLM-5，高负载下记录了错误 `health check failed. server could not get a response from detokenizer for last 20 seconds` {{issue #22511}}。相关 issue #35884 发现超时探测将请求留在调度器中，失败探测不断累积 {{issue #35884}}。

**我们的建议：** 就绪探针使用 `/ready`，存活探针不要触发生成。设置 `SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION=false`，`/health` 就会不经调度器请求直接返回 200 {{code}}。较慢的深度检查使用 `/health_generate`，只通知人，不重启进程。这样不会因为探测在队列等待，就杀掉最忙的 pod。

## 优雅关闭：只向主进程发信号

收到 SIGTERM 后，HTTP 服务器设置 `gracefully_exit`，`/health` 开始返回 503。Tokenizer manager 的 watchdog 每 5 s 检查一次标志 {{code}}，随后每 5 s 记录剩余请求，直到没有请求。之后向调度器发送 `ShutdownReq`，给它们 15 s 退出，超时才强制终止。[图 7.1](#fig-7-1) 展示该路径及另外两条跳过排空的路径。

```figure
id: fig-7-1
kind: state
title: SGLang 服务器停止的三种路径
claim: 只有发给主进程的 SIGTERM 会排空运行请求；强制退出或发给进程组的信号会终止当前工作。
caption: 顶部从左向右为优雅路径，再向下看另外两条。数字与图例对应。来源：capture/out/shutdown-exploratory.log、capture/out/server-default.log 和 v0.5.22 关闭代码。
```

**我们在 Mac 上测了两种情况。** 捕获工具向整个进程组发送 SIGTERM，停止每台服务器。子调度器也收到信号，率先退出：

```listing
title: 向进程组发送 SIGTERM
source: capture/out/server-default.log
lang: text
note: 默认运行结束时连续四行日志。
---
[2026-10-16 14:01:45] SIGTERM received. signum=None frame=None. Draining requests and shutting down...
[2026-10-16 14:01:45] Subprocess scheduler_0 (pid=5909) crashed with exit code -15. Triggering SIGQUIT for cleanup...
[2026-10-16 14:01:45] SIGQUIT received. signum=None, frame=None. It usually means one child failed.
[2026-10-16 14:01:46] Sleeping 5 seconds before crash diagnostics to let GPU activity settle.
```

父进程发现子进程崩溃，走崩溃路径杀掉整个进程树。那一刻没有请求运行，因此没有丢失；负载下，所有运行请求都会失败。随后我们另起服务器，发送一个 3,000 token 请求，只向主进程发 SIGTERM：

```listing
title: 一个请求运行时，向主进程发送 SIGTERM
source: capture/out/shutdown-exploratory.log
lang: text
note: 节选自独立运行的日志，省略中间的 decode batch 行。
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
title: 客户端看到了什么
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

请求完整生成 3,000 个 token，排空期间 `/health` 返回 503。信号后十三秒，服务器以代码 0 退出。`docker stop` 与 Kubernetes 都向容器主进程发 SIGTERM，这是正确目标。若包装脚本将信号转发整个进程组，或 supervisor 杀整个组，就会得到第一种日志。

代码有两种跳过排空的退出。服务器已为 `UnHealthy` 时，watchdog 立即退出；环境变量 `SGL_FORCE_SHUTDOWN` 为 true 时也立即退出。v0.5.22 的 watchdog 直接读取这个旧名称 {{code}}。

环境模块声明的新名字是 `SGLANG_FORCE_SHUTDOWN`。兼容代码只将 `SGL_` 变量复制到 `SGLANG_`，不做反向复制。**代码表明**只设置 `SGLANG_FORCE_SHUTDOWN` 无法影响 watchdog。我们没有运行实测，因此将其称为疑似 bug。需要强制停止时，设置 `SGL_FORCE_SHUTDOWN=1`。

**我们的建议：** 终止宽限期要长于输出上限下的最长请求。每秒 30 token 的 32K token 答案需要超过 18 分钟。先限制 `max_tokens`，再设宽限期，否则排空可能永远无法按时完成。

## 调整设置的顺序

多数调优建议只列参数，但顺序更重要，因为每步都会改变下一步所测内容。[图 7.1b](#fig-7-1b) 展示本手册的顺序，每行链接到对应测量章节。

```figure
id: fig-7-1b
kind: flow
title: 调整 SGLang 设置的顺序
claim: 先测量，再解决内存、prompt 和并发，之后才调整内核、并行与分离部署。
caption: 从上往下读。每行是一项设置或操作，附上支持它的测量和对应章节。
```

1. 用 `sglang.benchmark.serving` 测三个并发档位，见[第 5.1 节](#s-sglang-benchmark-serving)。没有基线，后续改动都无从量化。
2. 根据共享机器设置 `--mem-fraction-static`，见[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)。我们 Mac 上的自动值导致并发 32 崩溃。
3. 每个 prompt 都将共享文本放在前面，见[第 3.4 节](#s-prefix-friendly-prompts)。系统 prompt 开头的一个 request id，就让 TTFT 变成约 14 倍。
4. 将 `--max-running-requests` 限在实测拐点。越过拐点，吞吐量下降，TTFT 却上升。
5. 此时再调整 CUDA graph 设置和 `--attention-backend`，每次只改一个，见[第 4.1 节](#s-forwardmode-and-cuda-graphs) 与[第 4.2 节](#s-attention-backend)。v0.5.22 已弃用 `--disable-cuda-graph`，应使用 `--cuda-graph-backend-decode` 和 `--cuda-graph-backend-prefill`。
6. 单副本饱和后，添加张量、数据或注意力数据并行，见[第 6.1 节](#s-tp-size-dp-size-and-attn-dp-size)。
7. 最后才拆分 prefill 与 decode，且先测出 prefill 确实拖延 decode，见[第 6.3 节](#s-prefill-decode-disaggregation)。

## 生产团队报告了什么

三份来自 SGLang 团队之外的报告，展示运维精力花在哪里。

**LinkedIn** 的独立工程博客发表于 2026-02-20，在 H100 上服务 375M 至 0.6B 排序模型 {{field LinkedIn 2026-02}}。负载只需要 prefill 和最后一个 token 的 logits。瓶颈在 tokenizer、ZMQ 消息、Python 垃圾回收、GIL 和调度器，没有一项是 GPU 内核。

批量分词将 P99 延迟从 4,583 降至 464 ms；跳过 decode 的评分路径将 P99 从 6,220 降至 454 ms；预热和 `gc.freeze()` 消除了 100 至 300 ms 的垃圾回收停顿。375M 排序器从每 GPU 每秒 750 项提高至 2,200 项。大部分相关 PR 由 LinkedIn 自己编写，因此其“改进前”对应更旧的 SGLang。

**CERIT-SC** 是捷克学术服务。它在 2025 年从 vLLM 迁到 SGLang，到 2026-04 已报告服务 1000 亿 token {{field CERIT-SC 2026-04}}。它的流量形状值得关注：Kimi K2.6 的 prompt 中位数为 2,179 token，第 95 百分位为 99,746。团队认为这是 agent 编程工具造成的。

SGLang 的问题包括工具调用泄漏到推理输出、偶发挂起，以及模型循环占住 KV 缓存。修复办法属于运维：将输出上限设为 32K token，并对容易循环的负载设置 presence penalty。CERIT-SC 仍按模型同时使用两种引擎。

**Ant Group** 于 2025-09-26 在 LMSYS 博客发布了 H20 上运行 SGLang v0.5.2 和 DeepSeek-R1 的报告 {{field Ant Group 2025-09}}。他们选择 EP16，而非 EP32。batch 为 32 时，两者吞吐量分别为每秒 675 和 585 token。

增加推测草稿 token 后，batch 1 的速度提升 21%，batch 32 则下降约 18%。Ant Group 提供三个延迟档位。最严格档位要求 TPOT 低于 30 ms，并使用 batch 12。这体现了产品决策的重要性。

**我们的建议：** 阅读生产报告，看流量形状和修复顺序，不要照搬吞吐量。LinkedIn 先修 CPU，再修 GPU；CERIT-SC 先限制输出，再调其他；Ant Group 选择更小专家组，因为故障影响范围与实际售卖的 batch 大小，比峰值吞吐量更重要。

```takeaways
- 固定 `lmsysorg/sglang:v0.5.22` 这样的镜像标签，主动决定升级。
- 只有具备完整 CUDA toolkit 的主机才在镜像外运行。
- 将 `~/.cache/sglang` 与 Hugging Face 缓存挂载到持久卷。
- 就绪探针使用 `/ready`，存活探针使用关闭生成后的 `/health`。
- 只向主进程发 SIGTERM，并检查日志中的排空记录。
- v0.5.22 强制停止时设置 `SGL_FORCE_SHUTDOWN`，不要只设 `SGLANG_FORCE_SHUTDOWN`。
- 先限制输出长度，再选择终止宽限期。
- 按图 7.1b 的顺序调设置，每次测量只改一项。
```

来源：python/sglang/srt/entrypoints/http_server.py (ready, health_generate, HEALTH_CHECK_TIMEOUT), python/sglang/srt/managers/tokenizer_manager.py (sigterm_watchdog, _SCHEDULER_EXIT_TIMEOUT_SECS), python/sglang/srt/environ.py (SGLANG_FORCE_SHUTDOWN, SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION, SGLANG_CACHE_DIR, redirect_third_party_caches, _handle_deprecated_envs) and python/sglang/__init__.py at v0.5.22; docs/docs/get-started/install.mdx at v0.5.22; capture/out/server-default.log, capture/out/server-default.command.txt, capture/out/shutdown-exploratory.log, capture/out/shutdown-exploratory.txt, capture/shutdown_probe.py, capture/gpu/incidents/l4-toolchain-failures.txt; python/sglang/benchmark/datasets/random.py at v0.5.22; issues #22511 and #35884; field reports: Doubleword, fergusfinn.com/blog/fast-sglang-starts (2026-04-06), LinkedIn Engineering, linkedin.com/blog/engineering/ai/scaling-llm-based-ranking-systems-with-sglang-at-linkedin (2026-02-20), CERIT-SC, blog.cerit.io/blog/run-llm2 (2025-10-19) and blog-dev.cerit.io/blog/llm3 (2026-04-27), Ant Group on the LMSYS blog, lmsys.org/blog/2025-09-26-sglang-ant-group (2025-09-26).
