# 使用 expert parallelism 部署 MoE 模型

> Expert parallelism 会将 MoE 模型的 experts 分配到多块 GPU；小型 MoE 模型也可能只用一块 GPU 部署。

你要部署 mixture-of-experts 模型。读完本节，你可以判断何时使用 expert parallelism。

**我们的测量结果：**单台 DGX Spark 无需 expert parallelism 就能运行 Qwen3-30B-A3B，在 64 个用户时达到 239 token/s。

## 了解 MoE 模型的特点 {#s-serve-moe-models-with-expert-parallelism-know-what-changes-with-a-moe-model}

Mixture-of-experts 层包含许多 experts，但每个 token 只会使用其中少数几个。Qwen/Qwen3-30B-A3B-Instruct-2507 有 30B 个参数，每个 token 大约会激活 3B 个参数。因此模型需要为全部权重预留内存，但每个 token 的计算量只对应其中一小部分。

## 模型能装下时先用单设备 {#s-serve-moe-models-with-expert-parallelism-start-with-one-device-if-the-model-fits}

我们的 DGX Spark 上，单个 GB10 能以 BF16 容纳整个模型。权重占用 56.93 GiB，服务器在 64 个用户时达到 239.3 tok/s。单设备无需进行 GPU 间通信。如果模型和 KV cache 都能放下，先从单设备开始。

我们的理解是：包含大量 token 的 batch 会使用许多不同的 expert，因此 batch 增长时，decode 步骤需要读取更多权重。带宽有限的设备上，每个 token 的耗时会随 batch 增长。在 GB10 上，单用户时每个 token 中位耗时为 32 ms，64 个用户时则为 244 ms。

## 大模型使用 expert parallelism {#s-serve-moe-models-with-expert-parallelism-add-expert-parallelism-for-large-models}

单机有 8 块 GPU 时，可将 experts 分布到所有 GPU：

```bash
vllm serve <model> --data-parallel-size 8 --enable-expert-parallel
```

DeepSeek 大模型等无法装入单机的模型，可以在每台机器上运行一条命令。下面的示例使用两台机器，每台 8 块 GPU。先按 vLLM 文档中的 expert parallel 指南在两台机器上安装 DeepEP 和 DeepGEMM。它们不属于普通安装环境；配置 DeepEP backend 却未安装 DeepEP 时，服务器会在启动时停止。第一台机器负责接收请求：

```bash
vllm serve <model> --enable-expert-parallel \
  --all2all-backend deepep_low_latency \
  --data-parallel-size 16 --data-parallel-size-local 8 \
  --data-parallel-address 192.168.1.100 --data-parallel-rpc-port 13345
```

第二台机器以 headless 模式运行，不启动 API server。它的起始 rank 等于排在它之前的机器所占 rank 数：

```bash
vllm serve <model> --enable-expert-parallel \
  --all2all-backend deepep_low_latency \
  --data-parallel-size 16 --data-parallel-size-local 8 \
  --data-parallel-start-rank 8 \
  --data-parallel-address 192.168.1.100 --data-parallel-rpc-port 13345 \
  --headless
```

将地址设为第一台机器的 IP，两台机器使用相同的 RPC 端口。跨机器交换 token 时，vLLM 文档使用 DeepEP kernel。

启用 expert parallelism 后，每块 GPU 持有部分 experts；token 会发送到拥有对应 expert 的 GPU，再返回。每块 GPU 上的 attention layer 通过 data parallel 运行。Token 的 all-to-all 交换需要 GPU 间有高速链路。

大规模部署还有两个功能可用：

- **Expert 负载均衡。** 参数 --enable-eplb 会迁移繁忙的 expert，以分散负载，因为不同 expert 收到的 token 数可能差异很大。
- **弹性 expert parallelism。** 可在运行中的部署中增加或移除 GPU。0.32 将此功能引入 Model Runner V2。

我们没有在自己的硬件上测量。当前每台机器只有一块 GPU，因此没有运行过 expert parallelism。

## 检查设置 {#s-serve-moe-models-with-expert-parallelism-check-the-setup}

在多 GPU 部署中，观察负载增加时每个 token 的耗时，并与较少 GPU 上的同一模型比较。如果耗时增长快于输出量增长，GPU 间的交换可能限制了执行步骤。

```takeaways
- MoE 模型需要为所有 experts 保留内存，但每个 token 只计算其中少数部分。
- 模型能装下时，从单设备开始，因为无需 GPU 间交换。
- 单机放不下的大模型，可使用高速链路上的 expert parallelism。
```

来源：capture/gpu/summary/gb10.json（load.vllm）、capture/gpu/out-gb10/server-load-vllm.log，vLLM 0.31.0 文档（docs/serving/expert_parallel_deployment.md），vLLM 0.31.0 源码（vllm/config/parallel.py），v0.32.0 发布说明。
