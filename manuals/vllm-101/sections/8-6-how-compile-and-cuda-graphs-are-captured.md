# Compile 和 CUDA graph 如何捕获

> 本节解释 torch.compile、分段与完整 graph，以及捕获尺寸。

vLLM 每次启动的最后一段时间都会用于编译和捕获。读完本节，你可以说明每个优化级别启用了什么，以及完整 CUDA graph 为什么不能覆盖所有 batch。

## 两种不同的工具 {#s-how-compile-and-cuda-graphs-are-captured-two-separate-tools}

**torch.compile** 会追踪模型的 Python 代码，将其转换为 graph 并生成融合 kernel。融合会把多个小操作（例如 norm 与 quantize 步骤）合并进一个 kernel。编译结果缓存在 `~/.cache/vllm/torch_compile_cache`。相同设置下第二次启动会跳过大部分编译工作。服务器会在接收第一个请求之前完成所有编译。

**CUDA graph** 会记录一系列固定 shape 的 kernel 启动，再通过一次 CPU 调用重放。小 batch 的 decode 步骤可能会启动数百个短 kernel，graph 可以省去 CPU 逐个启动它们的开销。

## Graph 模式 {#s-how-compile-and-cuda-graphs-are-captured-the-graph-modes}

Graph 需要固定 shape，但 attention 的 shape 并不总是固定。一个 batch 可能混有不同长度的 prompt。vLLM 通过以下模式处理：

| 模式 | 捕获的内容 |
|---|---|
| `NONE` | 不捕获 |
| `PIECEWISE` | 捕获除 attention 以外的部分，并在每个 attention 调用前后分段 |
| `FULL_DECODE_ONLY` | 捕获完整步骤，但只用于单 token decode 的 batch |
| `FULL_AND_PIECEWISE` | attention backend 支持时捕获完整步骤，否则分段捕获 |

默认值是 `FULL_AND_PIECEWISE`。运行时 dispatcher 会根据 token 数、请求数，以及 batch 是否均匀，选择每个 batch 的模式。如果 attention backend 无法重放完整 graph，dispatcher 就会使用分段 graph。

L4 和 GB10 上的 FlashAttention 2 只会为均匀 batch 捕获完整 graph，例如纯 decode 步骤。含有新 prompt 的混合 batch 使用分段模式。

## 优化级别 {#s-how-compile-and-cuda-graphs-are-captured-the-optimization-levels}

`-O0` 到 `-O3` 会一并设置 compile 和 graph：

| 级别 | Compile | Graph | 融合 |
|---|---|---|---|
| `-O0` | 关闭 | 关闭 | 关闭 |
| `-O1` | 开启 | 分段 | norm 和 activation quantize |
| `-O2`，默认值 | 开启 | 完整和分段 | 更多操作，例如 all-reduce 与 norm |
| `-O3` | 在 0.31.0 中与 `-O2` 相同 | | |

手动设置的 flag 优先级更高。`--enforce-eager` 可一次关闭 compile 和 graph。自 0.31.0 起，它也会关闭启动时的 kernel warmup；`-O0` 则仍会 warmup。

## 捕获尺寸 {#s-how-compile-and-cuda-graphs-are-captured-capture-sizes}

vLLM 会为一组 batch size 捕获 graph。超过最大尺寸的 batch 会在没有完整 graph 的情况下运行。`--max-cudagraph-capture-size` 设置最大尺寸，`--cudagraph-capture-sizes` 设置具体列表。尺寸越多，启动时间越长、GPU 内存占用越大，也会挤占 KV pool。

`vllm bench startup` 会分别测量冷、热 compile cache 下的启动时间，帮助你比较不同配置的成本。

```takeaways
- torch.compile 融合 kernel；CUDA graph 减少 kernel 启动开销。两者是独立工具。
- 默认模式会在 attention backend 支持时捕获完整 graph，其余情况分段捕获。
- `-O2` 是默认值；0.31.0 中 `-O3` 等同 `-O2`；`--enforce-eager` 还会跳过 warmup。
```

Sources: the vLLM source at v0.31.0 (vllm/config/compilation.py, vllm/config/model.py, vllm/v1/attention/backends/flash_attn.py, vllm/benchmarks/startup.py), vLLM documentation at v0.31.0 (docs/design/optimization_levels.md, docs/design/torch_compile.md, docs/design/cuda_graphs.md), the release notes for v0.31.0.
