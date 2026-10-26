# Model Runner V2 改了什么

> 本节解释新的 model runner，以及为什么异步调度需要它。

vLLM 0.31.0 有两种 model runner，实际使用哪种取决于启动参数。读完本节，你可以判断服务器使用哪种 runner，并解释为什么 speculative decoding 方法可能导致切换。

## Model runner 的工作 {#s-what-model-runner-v2-changed-what-a-model-runner-does}

Model runner 运行在每个 GPU worker 中。它接收调度器选出的 batch，构建输入张量，运行前向计算，并采样下一个 token。它还负责加载权重、运行启动时的 profile，以及捕获 CUDA graph。

V1 engine 的第一个 runner 增长到 7,500 多行。vLLM 团队的设计说明提到，初版存在设计错误和技术债。随后团队从第一性原理重建了 Model Runner V2。新 runner 的代码规模约为旧版的三分之一。

## 两个设计点 {#s-what-model-runner-v2-changed-two-ideas}

**固定的请求行表。** Model Runner V2 保留一个持久 batch，每个 `--max-num-seqs` 槽位占一行。我们的 GPU 上每个请求一行，共 256 行。请求从开始到结束始终使用同一行。被抢占的请求与已结束请求一样，会释放自己的行。Runner 每步只更新发生变化的内容，而不重新构建整个 batch。

**不让 CPU 等待。** Runner 在一条 CUDA stream 上安排工作，并避免让 CPU 必须等待 GPU 的同步点。这样 GPU 运行当前步骤时，调度器就可以规划下一步。这叫异步调度；多数生成模型默认开启。

## 哪些情况会使用旧 runner {#s-what-model-runner-v2-changed-when-you-get-the-old-runner}

CUDA 环境安装 Triton 时，Model Runner V2 默认开启。vLLM 0.31.0 在一些情况下仍会使用旧 runner，例如：

- n-gram、suffix、Medusa 或 MLP speculator 方法。
- Mamba cache 模式 `all`；该模式已在 0.32 版移除。
- 原生 torch.compile 模式，以及 sequence parallel 与 tensor parallel 组合等部分并行特性。

可以用 `VLLM_USE_V2_MODEL_RUNNER=0` 或 `=1` 固定选择。

Speculative decoding 最能体现这种差异。EAGLE3 保留新 runner 和异步调度；N-gram speculative decoding 会切换到旧 runner，并关闭异步调度。因此这两种方法的对比，也同时对比了两种 runner。

## 后续路线 {#s-what-model-runner-v2-changed-where-it-goes-next}

vLLM 路线图把 2026 年第四季度列为彻底移除旧 runner 的目标。自 0.30 版起，每个版本都把更多功能迁移到新 runner。若某个 flag 让你使用旧 runner，在依赖这组配置前应先检查下一个版本。

```takeaways
- Model Runner V2 为每个请求保留固定行，并避免 CPU 等待 GPU。
- CUDA 默认使用 V2；部分 speculative decoding 方法会切回旧 runner。
- 对比不同方法时，可用 VLLM_USE_V2_MODEL_RUNNER 固定 runner。
```

Sources: the vLLM source at v0.31.0 (vllm/config/vllm.py, vllm/v1/worker/gpu_model_runner.py, vllm/v1/worker/gpu/model_runner.py, vllm/envs.py), vLLM documentation at v0.31.0 (docs/design/model_runner_v2.md), the vLLM roadmap for Q4 2026 (issue 61024), the release notes for v0.30.0 and v0.32.0.
