# 选择 tensor、pipeline 或 data parallelism

> Tensor parallelism 会拆分无法放进单块 GPU 的模型；data parallelism 会复制能放下的模型。

一块 GPU 不够用。读完本节，你可以根据简短的决策流程选择并行布局。

## 回答三个问题 {#s-choose-tensor-pipeline-or-data-parallelism-answer-three-questions}

| 问题 | 如果是 | 如果否 |
|---|---|---|
| 模型连同所需的 KV cache 能放进一块 GPU 吗？ | 使用 data parallelism：每块 GPU 放一份完整模型，设置 --data-parallel-size N。输出量会随副本数增长。 | 将模型拆分到多块 GPU。下一个问题决定如何拆分。 |
| 拆分后的模型能放进一台机器吗？ | 将拆分限制在同一台机器内。下一个问题选择具体布局。 | 按下表说明，在多台机器间使用 pipeline parallelism。 |
| GPU 是否有 NVLink，且 GPU 数量能整除模型结构？ | 使用 tensor parallelism，并设置 --tensor-parallel-size N。 | 在同一台机器内使用 pipeline parallelism，并设置 --pipeline-parallel-size N。 |

模型需要多台机器时：

- 将 --pipeline-parallel-size 设为机器数量，将 --tensor-parallel-size 设为每台机器的 GPU 数。
- Tensor-parallel size 必须能整除模型的 attention head 数。
- 如果每台机器的 GPU 数不能整除该数量，就设置 --tensor-parallel-size 1，并将 pipeline size 设为 GPU 总数。

```figure
id: fig-6-1
kind: decision
title: 三个问题
claim: 三个问题可以确定并行布局；在单机内，GPU 连接方式和拆分方式决定使用 tensor 还是 pipeline parallelism。
caption: 从顶部开始，按答案继续阅读。来源：vLLM 0.31.0 文档。
```

## 了解每种布局的成本 {#s-choose-tensor-pipeline-or-data-parallelism-know-what-each-layout-costs}

| 布局 | 拆分内容 | 通信方式 | 适用情况 |
|---|---|---|---|
| Tensor | 在多块 GPU 上拆分每一层 | 每层之后都要通信，因此需要 NVLink 等高速链路 | 模型无法放进一块 GPU，但能放进单机 |
| Pipeline | 将不同层分成多个 stage，放到不同 GPU | 每个 stage 边界通信一次 | 模型无法放进一台机器，或单机内的 GPU 没有 NVLink |
| Data | 不拆分，每块 GPU 都保存完整副本 | 副本之间不通信 | 模型能放进一块 GPU，且需要增加输出量 |
| Expert | 拆分 mixture-of-experts 模型中的 experts | 在 expert 层前后通信 | 大型 MoE 模型，详见[MoE 部署](#s-serve-moe-models-with-expert-parallelism) |

Tensor parallelism 还会拆分权重和 KV cache，因此每块 GPU 有更多空间用于缓存。当权重占满一块 GPU 时，两块 GPU 的 KV cache 容量可能是一块 GPU 的数倍。

## 检查 GPU 之间的链路 {#s-choose-tensor-pipeline-or-data-parallelism-check-the-link-between-gpus}

Tensor parallelism 每层之后都要传输数据。只有 PCIe 连接的 GPU（例如同一主机中的两块 L4）可能因通信成本太高而抵消拆分收益。vLLM 文档建议这类机器采用 pipeline parallelism，因为它只在 stage 边界传输数据。Pipeline parallelism 也支持 GPU 数量无法整除模型结构的情况。选择前，应在该机器上比较不同布局。

我们没有在自己的硬件上测量，也没有在两块 L4 上运行 tensor 或 data parallelism。

## 启动第二台机器 {#s-choose-tensor-pipeline-or-data-parallelism-start-a-second-machine}

vLLM 可使用默认的多机 Ray，或自身的多进程启动器，让多台机器共用一个服务器。我们没有运行过这两种部署方式。以下步骤来自 vLLM 0.31.0 文档，面向两台各有 8 块 GPU 的机器。

先检查 GPU 是否能互相通信。vLLM 故障排查指南提供了简短测试脚本，用于运行 NCCL 和 Gloo all-reduce。将它保存为每台机器上的 test.py。两台机器同时运行：第一台设置 NODE_RANK=0，第二台设置 NODE_RANK=1：

```bash
NCCL_DEBUG=TRACE torchrun --nnodes 2 --nproc-per-node 8 \
  --rdzv_backend=static --rdzv_endpoint=<head-ip>:29400 \
  --node-rank $NODE_RANK test.py
```

网络和驱动正常时，每个进程会打印四条成功信息，其中第一条是 PyTorch NCCL is successful!。指南正文提到的是另一行，因此应以脚本实际打印的信息为准。

**使用 Ray。** vLLM 仓库中的 run_cluster.sh 会在每台机器上启动 vLLM 镜像和一个 Ray node。每台机器应设置各自的 VLLM_HOST_IP，并使用私有网络。第一台机器上运行：

```bash
bash run_cluster.sh vllm/vllm-openai:v0.31.0 <head-ip> --head ~/.cache/huggingface -e VLLM_HOST_IP=<head-ip>
```

第二台机器上运行：

```bash
bash run_cluster.sh vllm/vllm-openai:v0.31.0 <head-ip> --worker ~/.cache/huggingface -e VLLM_HOST_IP=<worker-ip>
```

保持两个终端打开，否则集群会停止。然后在一个容器内运行以下命令，确认 Ray 能识别所有 node 和 GPU：

```bash
ray status
```

只需在其中一台机器上启动服务器，它会使用两台机器上的 GPU：

```bash
vllm serve Qwen/Qwen3-30B-A3B-Instruct-2507 \
  --tensor-parallel-size 8 --pipeline-parallel-size 2 \
  --distributed-executor-backend ray
```

**不使用 Ray。** 两台机器都运行 vllm serve，模型和并行规模设置相同。第一台机器增加 --nnodes 2 --node-rank 0 --master-addr <head-ip>。第二台机器增加 --nnodes 2 --node-rank 1 --master-addr <head-ip> --headless；它只运行 worker，不启动 API server。

机器间的流量没有加密，而且可能在对端执行代码。应限制在不受信任机器无法访问的私有网络中。

## 计算进程数量 {#s-choose-tensor-pipeline-or-data-parallelism-count-the-processes}

使用 data parallelism 时，vLLM 会为每个模型副本启动一个 engine core，并启动一个协调器来同步这些副本。使用 tensor parallelism 时，每块 GPU 会对应一个 worker，且这些 worker 共用一个 engine core。[进程结构](#s-why-vllm-runs-three-kinds-of-process)一节会列出具体数量。

## 使用 context parallelism 处理超长提示词 {#s-choose-tensor-pipeline-or-data-parallelism-use-context-parallelism-for-very-long-prompts}

对于数十万个 token 的提示词，vLLM 可在多块 GPU 间拆分单个序列，并使用 prefill 和 decode context parallelism。只有单个长请求造成问题时才使用它；不要用它处理大量短请求。

```takeaways
- 模型能放下时使用 data parallelism，放不下时使用 tensor parallelism。
- 跨机器扩展时加入 pipeline parallelism，并先运行 NCCL 测试。
- 单机内的 GPU 没有 NVLink 时，使用 pipeline parallelism。
- GPU 之间没有高速链路时，比较 tensor 和 data parallelism。
```

来源：vLLM 0.31.0 源码（vllm/config/parallel.py、vllm/engine/arg_utils.py、examples/ray_serving/run_cluster.sh），vLLM 0.31.0 文档（docs/serving/parallelism_scaling.md、docs/usage/troubleshooting.md、docs/serving/distributed_troubleshooting.md、docs/serving/data_parallel_deployment.md、docs/serving/context_parallel_deployment.md）。
