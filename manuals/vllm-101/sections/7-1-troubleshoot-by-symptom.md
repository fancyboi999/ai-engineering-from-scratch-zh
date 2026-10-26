# 按症状排查问题

> 大多数故障都有已知原因，一行日志或一项指标通常就能找到线索。

遇到故障时，你可能知道现象，却不知道原因。读完本节后，你可以将症状对应到可能原因，执行一项检查，再采取一项修复措施。

在列表中找到你遇到的症状。每项都提供可能原因、确认原因的检查，以及对应的修复方法。Issue 编号来自 vLLM 仓库，状态以 v0.31.0 为准。标注“来自 vLLM 文档”的内容摘录自 v0.31.0 排障指南，我们没有复现这些现象。

```figure
id: fig-7-1
kind: decision
title: 根据症状定位排障章节
claim: 从症状开始，检查一项指标或一行日志，再前往对应的修复章节。
caption: 每一行对应下文的一个条目，顺序相同。依次查看症状、第一项检查和修复位置。依据：我们的运行记录、vLLM issues 与文档。
```

## 服务器无法启动 {#s-troubleshoot-by-symptom-the-server-does-not-start}

### 下载模型时启动过程卡住 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-start-hangs-while-it-downloads-the-model}

- **原因：**下载缓慢，或模型需要 Hugging Face token。来自 vLLM 文档。
- **检查：**日志尚未出现 `Model loading took`，Hugging Face 缓存目录增长很慢或没有增长。
- **修复：**先用 `hf download` 下载模型。访问受限的模型需要设置 `HF_TOKEN`。然后设置 `HF_HUB_OFFLINE=1`，让 vLLM 只使用本地副本。

### 启动提示模型不受支持 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-start-stops-with-a-message-that-the-model-is-not-supported}

- **原因：**该模型架构不受 vLLM 0.31.0 支持，或缺失的依赖导致 vLLM 无法导入模型代码。来自 vLLM 文档。
- **检查：**错误会列出无法加载的架构，例如 `Model architectures [...] are not supported for now` 或 `failed to be inspected`。
- **修复：**检查当前版本的支持模型列表。如果模型在列表中，检查错误前的日志，查找 import failure。

### 启动提示 driver 或 PTX 工具链错误 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-start-stops-with-a-message-about-the-driver-or-the-ptx-toolchain}

- **原因：**vLLM 的 CUDA 构建版本高于 NVIDIA driver 支持的版本。来自 vLLM 文档。
- **检查：**错误显示 `The NVIDIA driver on your system is too old`，或说明 PTX 是由不受支持的工具链编译的。
- **修复：**升级 driver。使用官方镜像时，部分数据中心 GPU 可通过 `-e VLLM_ENABLE_CUDA_COMPATIBILITY=1` 启用 CUDA compatibility libraries。

### 启动提示 KV cache 无法满足最大长度 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-start-stops-with-a-message-about-the-kv-cache-and-the-maximum-length}

- **原因：**一个达到 `--max-model-len` 的请求需要的 KV cache 超过权重加载后的剩余容量。
- **检查：**错误消息会给出当前能容纳的最大长度。
- **修复：**把 `--max-model-len` 设为最长请求所需长度。[修复启动时显存不足](#s-fix-out-of-memory-at-startup)一节介绍详细方法。

### 启动提示可用内存或内存比例不足 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-start-stops-with-a-message-about-free-memory-and-the-memory-fraction}

- **原因：**其他进程正在使用 GPU 内存，无法满足你设置的内存比例。
- **检查：**运行 `nvidia-smi`，查看该 GPU 上的进程。
- **修复：**将 `--gpu-memory-utilization` 降到空闲内存比例以下，或停止其他进程。

### 设置 FP8 KV cache 后，服务器启动即崩溃 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-server-crashes-at-start-after-you-set-an-fp8-kv-cache}

- **原因：**启用 FP8 cache 后，vLLM 切换到了 FlashInfer backend，但 FlashInfer 无法编译其 kernel。Issue 60262 追踪了此问题；在 v0.31.0 时仍为 open。
- **检查：**找到日志中声明 attention backend 的那一行，并查看其后的 FlashInfer error。
- **修复：**添加 `--attention-backend TRITON_ATTN`。[FP8 KV cache](#s-fit-more-users-with-an-fp8-kv-cache)一节说明了我们的情况。

### 首次启动提示缺少 nvcc {#s-troubleshoot-by-symptom-the-server-does-not-start-the-first-start-stops-with-a-message-that-nvcc-is-missing}

- **原因：**FlashInfer 会在首次启动时编译 kernel。主机有 driver，但没有 CUDA toolkit。我们在 L4 节点新安装的 uv 环境中使用 0.31.0 时遇到过该问题。
- **检查：**错误来自 `flashinfer/jit/cpp_ext.py`，并包含 `Could not find nvcc and default cuda_home='/usr/local/cuda' doesn't exist`。
- **修复：**安装 CUDA toolkit 并设置 `CUDA_HOME`，然后重新启动。也可以使用包含 toolkit 的官方镜像。

### 设置 CUDA_HOME 后 sampler 编译失败 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-sampler-fails-to-compile-after-you-set-cuda-home}

- **原因：**主机上的 toolkit 与 PyTorch CUDA 构建不匹配，导致 FlashInfer sampler 无法编译。我们在 L4 节点上使用 nvcc 13.4 的 host toolkit 时遇到过该问题。
- **检查：**错误显示 `CUDA compiler and CUDA toolkit headers are incompatible`。
- **修复：**安装与 PyTorch 构建相匹配的 toolkit。也可以像[FP8 KV cache](#s-fit-more-users-with-an-fp8-kv-cache)一节那样启动时设置 `VLLM_USE_FLASHINFER_SAMPLER=0`。

### DGX Spark 内存比例看似留有空间，却仍然 OOM {#s-troubleshoot-by-symptom-the-server-does-not-start-a-dgx-spark-runs-out-of-memory-although-the-fraction-leaves-room}

- **原因：**统一内存机器上的 `--gpu-memory-utilization` 不一定能限制 vLLM 的全部占用。Issue 46307 报告了内存比例为 0.70 时仍占用约 112 GiB；该 issue 后来因 stale 关闭，未提供修复。Issue 44740 报告 GB10 开启 MTP speculation 时 KV cache 过大；在 v0.31.0 时仍为 open。
- **检查：**对比 `Available KV cache memory` 日志行与预期容量，并在启动时监控 `free -g`。
- **修复：**通过 `--kv-cache-memory-bytes` 直接设置 cache 大小。[DGX Spark 内存](#s-size-memory-on-a-dgx-spark)一节有详细说明。

### DGX Spark 首次启动需要很久 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-first-start-on-a-dgx-spark-takes-many-minutes}

- **原因：**加载权重时，vLLM 会从文件映射复制每个 tensor。在 GB10 上，复制速度较慢。Issue 58726 追踪了此问题；在 v0.31.0 时仍为 open。
- **检查：**查看 `Model loading took` 日志行。我们加载 57 GiB 权重时耗时 330 秒。
- **修复：**把权重放在本地磁盘，并保持服务器运行。[DGX Spark](#s-size-memory-on-a-dgx-spark)一节有详细说明。

### 编译阶段启动失败 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-start-fails-in-the-compile-step}

- **原因：**编译缓存损坏，或 Triton library 与 PyTorch 不匹配。来自 vLLM 文档。
- **检查：**错误来自 `torch.compile` 或 `torch/_inductor` 目录。
- **修复：**先设置 `VLLM_DISABLE_COMPILE_CACHE=1` 启动一次。如果能够启动，再删除 `~/.cache/vllm/torch_compile_cache`。调试期间也可以使用 `-O0` 关闭编译。

### 多 GPU 服务器启动时卡住 {#s-troubleshoot-by-symptom-the-server-does-not-start-a-server-on-several-gpus-hangs-at-start}

- **原因：**GPU 之间无法通过 NCCL 通信，可能涉及网络、driver，或缺少共享内存挂载。来自 vLLM 文档。
- **检查：**设置 `NCCL_DEBUG=TRACE` 并重新启动，查看日志停在哪一步。运行[并行策略](#s-choose-tensor-pipeline-or-data-parallelism-answer-three-questions)一节中的 NCCL test。
- **修复：**容器使用 `--ipc=host` 或较大的 `/dev/shm`。在 PCIe 机器上，遇到 peer access error 时，vLLM 指南建议设置 `NCCL_CUMEM_HOST_ENABLE=0` 或升级 driver。

### 升级后最大长度变短 {#s-troubleshoot-by-symptom-the-server-does-not-start-the-maximum-length-is-shorter-after-an-upgrade}

- **原因：**vLLM 0.30.0 改变了 context scaling（例如 YaRN）的读取方式，部分模型推导出的最大长度因此变短。
- **检查：**比较启动日志中的推导长度与旧版本记录。
- **修复：**确认模型支持该长度后，显式设置 `--max-model-len`。

## 服务器运行时请求失败 {#s-troubleshoot-by-symptom-requests-fail-while-the-server-runs}

### 请求返回 HTTP 400，提示超出最大 context length {#s-troubleshoot-by-symptom-requests-fail-while-the-server-runs-a-request-returns-http-400-about-the-maximum-context-length}

- **原因：**提示词 token 数与 `max_tokens` 相加后超过 `--max-model-len`。
- **检查：**错误包含 `This model's maximum context length is`，后面会给出 token 数量。当 `max_tokens` 单独超过上限时，错误会提示 `max_tokens` 不能大于 `max_model_len`。我们在 L4 上观察到了后一种情况。
- **修复：**缩短提示词或减小 `max_tokens`。如果缓存池容量允许，也可以用更大的最大长度重新启动服务器。

### Engine 报错后所有请求都失败 {#s-troubleshoot-by-symptom-requests-fail-while-the-server-runs-every-request-fails-after-an-error-in-the-engine}

- **原因：**engine core process 已停止，例如 GPU error 导致进程退出。API server 仍在运行，但不能处理请求。来自 vLLM 源码。
- **检查：**日志出现 `EngineCore encountered an issue`，真实错误位于它上方的日志行中。
- **修复：**根据前面的日志修复原因，再重启服务器。服务器不会自行恢复；让 orchestrator 执行重启。

## 服务器速度较慢 {#s-troubleshoot-by-symptom-the-server-is-slow}

### 首 token 需要数秒，但后续流式输出很快 {#s-troubleshoot-by-symptom-the-server-is-slow-the-first-token-takes-seconds-but-the-stream-is-fast-after-it}

- **原因：**缓存池或 batch 已满，请求正在队列中等待。
- **检查：**`vllm:num_requests_waiting` 大于 0，且 `vllm:kv_cache_usage_perc` 接近 1。
- **修复：**减少 GPU 上的并发用户，或通过 FP8 KV cache、较短的最大长度为缓存池腾出空间。

### 并发用户较多时，token 流出现长间隔 {#s-troubleshoot-by-symptom-the-server-is-slow-the-stream-has-long-gaps-when-many-users-are-active}

- **原因：**新提示词与运行中请求共享 decode step，而长提示词占用了每一步的大部分时间。
- **检查：**比较 P99 ITL 与 ITL 中位数。差距较大说明请求出现停顿，而不是 GPU 持续变慢。
- **修复：**降低 token budget，详见[长提示词的预算](#s-keep-long-prompts-from-stalling-short-ones-know-the-budget)。在我们的机器上，提示词长度和 engine 也会影响间隔，详见[engine 对比](#s-decide-between-vllm-and-sglang-know-what-we-compared)。

### preemption 计数器持续增长 {#s-troubleshoot-by-symptom-the-server-is-slow-the-preemption-counter-rises}

- **原因：**运行中的请求需要新 block，但池中没有空闲 block。vLLM 会停止该请求，之后重新计算。
- **检查：**`vllm:num_preemptions_total` 持续增长，周期日志中也会出现 preemption 计数。
- **修复：**提高 `--gpu-memory-utilization`，或降低 `--max-num-seqs`、`--max-num-batched-tokens`。

### N-gram speculation 的收益低于预期 {#s-troubleshoot-by-symptom-the-server-is-slow-n-gram-speculation-gives-less-than-you-expected}

- **原因：**在 vLLM 0.31.0 中，n-gram 方法会使 vLLM 改用旧版 model runner，并关闭异步调度。
- **检查：**启动日志提示异步调度已关闭。
- **修复：**在自己的流量上与未启用 speculation 的情况比较，并确保两边使用相同的 model runner。

### 以 eager mode 启动后，首批请求很慢 {#s-troubleshoot-by-symptom-the-server-is-slow-the-first-requests-after-a-start-in-eager-mode-are-slow}

- **原因：**自 vLLM 0.31.0 起，`--enforce-eager` 也会关闭启动时编译 kernel 的 warmup，因此首批请求需要现场编译。
- **检查：**最初几条请求比后续请求慢。
- **修复：**对外提供服务前先发送几条 warmup 请求，或使用 `-O0`。

### DGX Spark 上的 NVFP4 decode 比旧版本慢 {#s-troubleshoot-by-symptom-the-server-is-slow-nvfp4-decode-is-slower-on-a-dgx-spark-than-on-older-releases}

- **原因：**Issue 59770 报告 GB10 上的一个 NVFP4 模型自 vLLM 0.29.0 起 decode 变慢。该 issue 在 v0.31.0 时仍为 open。
- **检查：**比较当前版本和 0.28 的每 token 耗时。
- **修复：**在问题修复前，为该模型固定使用较快的版本。

## 输出结果不正确 {#s-troubleshoot-by-symptom-the-output-is-wrong}

### 回答开头出现很长的思考内容 {#s-troubleshoot-by-symptom-the-output-is-wrong-the-answer-starts-with-a-long-thinking-block}

- **原因：**Qwen3 等 reasoning model 未配置 reasoning parser。
- **检查：**`content` 字段以 `<think>` 开头。
- **修复：**为模型设置相应的 parser，例如 `--reasoning-parser qwen3`。详见[推理模型](#s-serve-reasoning-models-know-what-the-model-writes)。

### 命中 prefix cache 后，模型重复输出一个 token {#s-troubleshoot-by-symptom-the-output-is-wrong-the-model-repeats-one-token-after-a-prefix-cache-hit}

- **原因：**Issue 60174 报告，在 vLLM 0.30 和 0.31 中，DFlash2 或 DSpark speculation 与 prefix cache 同时使用时会产生损坏输出。从第三个请求开始，命中缓存 block 的回答会反复输出同一个 token。该问题于 2026-10-22 关闭，晚于 v0.31.0；请确认自己的版本是否包含修复。
- **检查：**该问题仅在 cache hit 后出现；添加 `--no-enable-prefix-caching` 后消失。
- **修复：**为该模型关闭 prefix cache 或 speculation 方法。

### 开启 speculative decoding 后，JSON 输出无效 {#s-troubleshoot-by-symptom-the-output-is-wrong-json-output-is-invalid-with-speculative-decoding-on}

- **原因：**JSON schema 与 speculation 方法可能对下一个 token 有不同要求。Issue 60830 在一个模型上报告了 MTP 的这一问题，该 issue 已关闭。
- **检查：**不使用 `--speculative-config`，重新发送相同请求并比较。
- **修复：**升级版本，或在 JSON 流量上关闭 speculation。

### 多次运行得到不同输出 {#s-troubleshoot-by-symptom-the-output-is-wrong-the-output-changes-from-run-to-run}

- **原因：**vLLM 默认不保证输出一致。请求进入的 batch 会改变求和顺序；prefix cache hit 也可能改变 greedy 输出。在我们对单用户 `Qwen/Qwen3-0.6B` 的测试中，热缓存将 32 条 greedy 输出中的 11 条改变了。该 GPU 是未锁频的共享 L4。dtype 变化（例如 BF16 切换到 FP16）也会改变大多数输出。
- **检查：**单独发送相同请求两次。若回答相同，变化来自 batch；若回答不同，第二次请求可能命中了 prefix cache。添加 `--no-enable-prefix-caching` 重试；若两次回答相同，则缓存导致了差异。
- **修复：**离线运行时，设置 `VLLM_ENABLE_V1_MULTIPROCESSING=0`。在线运行时，batch-invariant mode 有帮助，但 v0.31.0 尚未覆盖所有路径。对比运行前重置 prefix cache。详见[可复现输出](#s-get-reproducible-outputs-know-why-outputs-change)。

## 基准测试结果异常 {#s-troubleshoot-by-symptom-the-benchmark-is-wrong}

### 第二轮基准测试比第一轮快 {#s-troubleshoot-by-symptom-the-benchmark-is-wrong-the-second-benchmark-run-is-faster-than-the-first}

- **原因：**固定 seed 会让随机数据集重复发送同一组提示词，prefix cache 随后直接返回缓存结果。我们在共享 L4 上以单用户测试 `Qwen/Qwen3-0.6B` 时，未重置缓存的重复运行将 TTFT 中位数降低了约 6 倍。该 GPU 未锁频。
- **检查：**第二轮运行期间，`vllm:prefix_cache_hits_total` 增加。
- **修复：**每轮运行前重置 prefix cache、使用新 seed，并记录缓存 token 数。[基准测试](#s-benchmark-your-server-in-15-minutes-run-one-sweep)一节提供完整流程。`POST /reset_prefix_cache` 路由只在 `VLLM_SERVER_DEV_MODE=1` 时存在，因此只能在未对外暴露的服务器上使用。

```takeaways
- 修改参数前先查看最新日志、排队指标和缓存指标。
- 排查部署问题前，先检查对应模型、GPU 和版本的 open issue。
- 每次只测试一项改动，并固定 benchmark 与 GPU 时钟。
```

Sources: vLLM issues 44740、46307、58726、59770、60174、60262、60830；vLLM 0.30.0、0.31.0、0.32.0 release notes；vLLM 0.31.0 文档（docs/usage/troubleshooting.md、docs/design/torch_compile.md、docs/configuration/optimization.md、docs/usage/reproducibility.md、docs/benchmarking/cli.md、docs/features/reasoning_outputs.md）；vLLM 0.31.0 源码（vllm/config/vllm.py、vllm/config/model.py、vllm/renderers/params.py、vllm/v1/engine/exceptions.py、vllm/envs.py）；capture/gpu/out-gb10/server-load-vllm.log；Same Request, Different Answer: Quantization Amplifies Cache-Induced Divergence in LLM Serving（arXiv 2609.04748，2026）；capture/gpu/out-l4/livecheck-2026-10-22.txt、capture/gpu/out-l4/prefix-cache-flush.txt、capture/gpu/out-l4/greedy-output-cache-batch-dtype.txt、capture/gpu/out-l4/livecheck-2026-10-23.txt。
