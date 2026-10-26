# KV connector 如何迁移 cache

> 本节解释 connector 接口和数据传输层。

有些部署需要把请求的 KV cache 移到计算它的 GPU 之外。读完本节，你可以列出 KV connector 的工作，也能说明 disaggregated prefill 有什么收益、没有什么收益。

## 为什么要移动 cache {#s-how-kv-connectors-move-the-cache-why-move-the-cache}

三种部署会用到它：

- **Disaggregated prefill。** 一台服务器计算 prompt，另一台服务器生成答案。KV cache 必须从前者传到后者。
- **Offloading。** GPU 放不下的 block 移到 CPU 内存或存储。之后的请求需要相同前缀时，再把它们取回来。
- **共享 cache。** 多台服务器从一个存储读取前缀，让一次计算出的前缀可被所有服务器复用。

## 一个接口，多种传输方式 {#s-how-kv-connectors-move-the-cache-one-interface-many-transports}

vLLM 把这些工作封装在一个接口后面：KV connector。调度器会询问 connector，可以从外部加载该请求的哪些 block，然后像处理 prefix-cache hit 一样，把这些 token 计为已计算。每次前向计算前后，worker 会请求 connector 加载或保存 block。

在 0.31.0 中，仓库支持多种传输 connector：

| Connector | 传输方式 |
|---|---|
| NIXL | NVIDIA transfer library，可通过 RDMA 或网络传输 |
| Mooncake | Mooncake transfer engine |
| LMCache | LMCache library，可使用 CPU、磁盘和共享存储 |
| Offloading | 原生 CPU 内存卸载 |
| MultiConnector | 组合两个或更多 connector |

用 `--kv-transfer-config` 设置 connector，包括 connector 名称、服务器角色和传输选项。Role 用来说明服务器负责生成 cache、消费 cache，还是两者都做。

## Disaggregated prefill 带来什么 {#s-how-kv-connectors-move-the-cache-what-disaggregation-buys}

vLLM 文档指出，disaggregated prefill 不会提升吞吐量。它有两个其他用途：分别在不同服务器上调节首 token 时间和输出流；避免长 prompt 阻塞其他用户的输出流，从而控制 inter-token latency 的尾部。

代价是每个请求都要传输数据，还要运行更多机器。请求失败时，默认策略是直接失败。也可以选择 recompute 策略。

## 后续发展 {#s-how-kv-connectors-move-the-cache-where-it-goes}

KV connector 接口是代码中变化最频繁的部分之一。2026 年 10 月，公开工作包括三项：不依赖 tensor-parallel size 的 KV offloading；为传输中的 block 增加压缩层；修复 NIXL connector 远程读取时释放 block 的问题。基于 connector 构建时要固定版本，并先检查尚未关闭的 issue。

```takeaways
- KV connector 让 vLLM 能在计算发生的 GPU 之外加载或保存 cache block。
- Disaggregated prefill 可以分别控制首 token 和输出流，但不会提升吞吐量。
- 基于 connector 构建前，固定版本并检查未关闭的 issue。
```

Sources: the vLLM source at v0.31.0 (vllm/distributed/kv_transfer/, vllm/config/kv_transfer.py), vLLM documentation at v0.31.0 (docs/features/disagg_prefill.md, docs/features/nixl_connector_usage.md), vLLM issues 61886, 59538, and 61229.
