# vLLM 为什么要运行三类进程

> 本节解释 API server、engine core 和 worker 分别负责什么，以及它们为什么要拆成独立进程。

一张 GPU 的 `vllm serve` 会启动三个进程；每增加一张 GPU，进程数也会增加。读完本节，你可以说出每个进程负责什么，并估算并行部署需要多少进程。

## 三项工作争用一个 CPU {#s-why-vllm-runs-three-kinds-of-process-three-jobs-that-compete-for-one-cpu}

Serving engine 要做三类工作：处理 HTTP 请求并在文本与 token 之间转换；决定下一步调度哪些请求；在 GPU 上运行模型。

如果这些工作都在一个 Python 进程里，它们会轮流使用同一个解释器锁。服务器分词一个长 prompt 时，调度器只能等待，GPU 也只能等调度器。在一块快速 GPU 上，decode 一步只需几毫秒。每步之间哪怕多花几毫秒做 Python 处理，也会让 GPU 大部分时间闲置。

vLLM 为每项工作安排独立进程：

| 进程 | 负责的工作 | 数量 |
|---|---|---|
| API server | HTTP、OpenAI 路由、分词、多模态输入，以及向客户端发送输出流 | 默认一个；data parallel 时每个 rank 一个 |
| Engine core | 调度器、KV cache 管理器，以及向 worker 发送工作的循环 | data parallel 时每个 rank 一个 |
| GPU worker | 权重，以及一块 GPU 上的前向计算 | 每块 GPU 一个；每个 engine core 对应 tensor parallel 数乘 pipeline parallel 数 |

API server 和 engine core 通过 ZeroMQ socket 交换消息。Engine core 与 worker 通过共享内存队列通信。Data parallel 还会增加一个协调进程，负责让各 rank 保持同步。

## 计算进程数 {#s-why-vllm-runs-three-kinds-of-process-count-the-processes}

vLLM 设计文档给出了进程数的算法：API server 数量，加上 data-parallel engine core 和 GPU worker 数量；使用 data parallel 时再加一个协调进程。一个 `-tp 4` 的服务器运行一个 API server、一个 engine core 和四个 worker，总共六个进程。

出故障时，进程归属能帮你定位日志。Worker 崩溃会反映在 engine core 日志中。Tokenizer 变慢时，首 token 时间会变长，而 GPU 可能处于空闲状态。读日志时，先确认每行日志由哪个进程写入。

```figure
id: fig-8-1
kind: tree
title: 四块 GPU 对应六个进程
claim: tensor parallel size 为 4 的服务器运行六个进程：一个 API server、一个 engine core 和四个 GPU worker。
caption: 从上往下读。每个 worker 负责一块 GPU。来源：vLLM v0.31.0 设计文档。
```

## 为什么不用线程 {#s-why-vllm-runs-three-kinds-of-process-why-not-threads}

同一个 Python 进程里的线程共享解释器锁，因此无法消除等待。独立进程也让 vLLM 可以重启或替换其中一个部分。仓库还提供一个用 Rust 编写的实验性前端。它替代 Python API server，仍通过相同的 socket 与 engine core 通信。

独立进程也有代价：每个请求和输出都要跨进程边界复制。与一次模型计算相比，复制开销很小，因此这个设计接受了它。设置环境变量 `VLLM_ENABLE_V1_MULTIPROCESSING=0`，可以让 engine core 与 API server 在同一进程运行。可复现性指南在离线运行时会使用此设置，因为单进程能让调度顺序保持稳定。

```takeaways
- API server、engine core 和 worker 各自运行在独立进程中。
- 进程数等于 API server、engine core 与 GPU worker 的数量之和；启用 data parallel 时再加一个协调进程。
- 读日志前，先确认写出该日志的进程。
```

Sources: the vLLM source at v0.31.0 (vllm/v1/engine/core.py, vllm/v1/engine/core_client.py, vllm/v1/executor/multiproc_executor.py, vllm/envs.py, rust/README.md), vLLM documentation at v0.31.0 (docs/design/arch_overview.md, docs/usage/reproducibility.md).
