# 带 LMCache KV Offloading 的 vLLM Production Stack

> vLLM 的 production-stack 是参考的 Kubernetes 部署 —— 路由器、引擎和可观测性接在一起。LMCache 是 KV-offloading 层，把 KV cache 从 GPU 内存里抽出来，跨查询和引擎复用（CPU DRAM，然后磁盘/Ceph）。vLLM 0.11.0 的 KV Offloading Connector（2026 年 1 月）经由 Connector API（v0.9.0+）让这件事异步、可插拔。Offload 延迟对用户不可见。即使没有共享前缀 LMCache 也有价值 —— 当一块 GPU 的 KV 槽用尽时，被抢占的请求可以从 CPU 恢复，而不必重算 prefill。在 16 块 H100（80GB HBM）、横跨 4 个 a3-highgpu-4g 上的已发布基准：当 KV cache 超过 HBM 时，原生 CPU offload 和 LMCache 都显著提升吞吐；在低 KV 占用时，所有配置都与基线持平，开销很小。

**类型：** Learn
**语言：** Python（标准库，一个玩具级 KV 溢出模拟器）
**前置要求：** 阶段 17 · 04（vLLM 服务内部机制）、阶段 17 · 06（SGLang/RadixAttention）
**预计时间：** ~60 分钟

## 学习目标

- 画出 vLLM production-stack 各层：路由器、引擎、KV offload、可观测性。
- 解释 KV Offloading Connector API（v0.9.0+），以及 0.11.0 的异步路径如何隐藏 offload 延迟。
- 量化 LMCache CPU-DRAM 何时有帮助（KV > HBM）vs 何时增加开销（KV 小到能装进 HBM）。
- 在给定部署约束下，在原生 vLLM CPU offload 和 LMCache connector 之间挑选。

## 问题背景

你的 vLLM 服务显示 GPU 的 HBM 在 100%，并且并发一爬升就出现抢占事件。请求被驱逐、重新入队，你在一分钟里把同一个 2K token prompt 重 prefill 了四次。GPU 算力花在了冗余的 prefill 上；goodput 远低于裸吞吐。

加更多 GPU 是线性成本。加更多 HBM 不可能。但 CPU DRAM 便宜 —— 一个插槽有 512 GB+，延迟比 HBM 差好几个数量级，但对"暂时温热"的 KV cache 来说够用。

LMCache 把 KV cache 抽到 CPU DRAM，让被抢占的请求快速恢复，并让跨引擎重复的前缀共享缓存，不必每个引擎都重 prefill。

## 核心概念

### vLLM production-stack

`github.com/vllm-project/production-stack` 是参考的 Kubernetes 部署：

- **路由器** —— 缓存感知（阶段 17 · 11）。消费 KV 事件。
- **引擎** —— vLLM worker。每块 GPU 一个，或每个 TP/PP 组一个。
- **KV cache offload** —— LMCache 部署或原生 connector。
- **可观测性** —— Prometheus 抓取、Grafana 仪表盘、OTel trace。
- **控制面** —— 服务发现、配置、滚动更新。

以 Helm chart + operator 形式发布。

### KV Offloading Connector API（v0.9.0+）

vLLM 0.9.0 引入了一个 Connector API，用于可插拔的 KV cache 后端。你的引擎把 block offload 到 connector；connector 把它们存起来（RAM、磁盘、对象存储、LMCache）。请求需要一个 block 时，connector 把它加载回来。

vLLM 0.11.0（2026 年 1 月）加了一条异步 offload 路径 —— offload 可以在后台发生，于是引擎在常见情况下不会因此阻塞。端到端延迟和吞吐仍取决于工作负载形态、KV cache 命中率和系统压力；vLLM 自己的说明指出，在低命中率时定制 kernel offload 可能降低吞吐，且异步调度与 speculative decoding 有已知的相互作用问题。

### 原生 CPU offload vs LMCache

**原生 vLLM CPU offload**：引擎本地。把 KV block 存在主机 RAM。实现快、零网络跳。不跨引擎。

**LMCache connector**：集群规模。把 block 存在一个共享的 LMCache 服务里（CPU DRAM + Ceph/S3 层）。block 对任何引擎都可访问。已发布 16 块 H100 的基准。

单个引擎有 HBM 压力时挑原生。多个引擎共享前缀时挑 LMCache（带共同系统 prompt 的 RAG、带共享模板的多租户）。

### 基准行为

16 块 H100（80 GB HBM）横跨 4 个 a3-highgpu-4g 的测试：

- 低 KV 占用（短 prompt、低并发）：所有配置都与基线持平，LMCache 加约 3-5% 开销。
- 中等占用：LMCache 开始在跨引擎前缀复用上有帮助。
- KV 超过 HBM：原生 CPU offload 和 LMCache 都显著提升吞吐；LMCache 增益更大，因为有跨引擎共享。

### LMCache 何时是决定性的

- 系统 prompt 跨租户共享的多租户服务。
- 文档片段跨查询重复的 RAG。
- 同一基座上的微调变体（LoRA），基座模型的 KV 复用减少冗余工作。
- 抢占重的工作负载：从 CPU 恢复比重 prefill 便宜。

### 何时别启用

- HBM 压力小 —— 你付了开销却没收益。
- 短上下文（<1K token）—— 传输时间 > 重 prefill。
- 单租户单 prompt 工作负载 —— 没有可捕获的复用。

### 与分离式服务集成

阶段 17 · 17 的分离式服务 + LMCache 相互叠加：从 prefill 池传到 decode 池的 KV 如果没用上就落进 LMCache；后续查询从 LMCache 拉取。阶段 17 · 11 的缓存感知路由器可以路由到本地缓存或 LMCache 共享缓存匹配的那个引擎。

### 你该记住的数字

- vLLM 0.9.0：Connector API 发布。
- vLLM 0.11.0（2026 年 1 月）：异步 offload 路径；端到端延迟影响取决于工作负载、KV 命中率和系统压力（不是绝对保证）。
- 16 块 H100 基准：KV 占用超过 HBM 时 LMCache 有帮助。
- HBM 压力小：3-5% 开销而无收益。

```figure
zero-sharding
```

## 实际使用

`code/main.py` 模拟一个带和不带 LMCache 的抢占重工作负载。报告避免的重 prefill 次数、吞吐增益和盈亏平衡的 HBM 利用率。

## 拿去用

这一课产出 `outputs/skill-vllm-stack-decider.md`。给定工作负载形态和 vLLM 部署，决定 原生 vs LMCache vs 都不要。

## 练习

1. 跑 `code/main.py`。HBM 利用率到多少时 LMCache 开始划算？
2. 一个租户在每小时 200 次查询间共享一个 6K token 系统 prompt。算每租户预期的 LMCache 节省。
3. LMCache 服务是个单点故障。设计高可用策略（副本、回退到原生）。
4. LMCache 存到机械盘上的 Ceph。对 70B FP8 上一个 4K token 的 KV（500 MB），读取时间 vs 重 prefill 是多少？
5. 论证 vLLM 0.11.0 的异步路径是否"免费" —— 开销藏在哪？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| Production-stack | "参考部署" | vLLM 的 Kubernetes Helm chart + operator |
| Connector API | "KV 后端接口" | vLLM 0.9.0+ 的可插拔 KV 存储接口 |
| 原生 CPU offload | "引擎本地溢出" | 把 KV 存在同引擎的主机 RAM |
| LMCache | "集群 KV cache" | CPU DRAM + 磁盘上的跨引擎 KV cache 服务 |
| 0.11.0 异步 | "非阻塞 offload" | offload 藏在引擎流后面 |
| 抢占 | "驱逐腾地方" | HBM 满时的 KV cache 倒腾 |
| 前缀复用 | "相同系统 prompt" | 多个查询共享开头；缓存命中 |
| Ceph 层 | "磁盘层" | 缓存层级里 DRAM 之下的持久化存储 |

## 延伸阅读

- [vLLM Blog — KV Offloading Connector (Jan 2026)](https://blog.vllm.ai/2026/01/08/kv-offloading-connector.html)
- [vLLM Production Stack GitHub](https://github.com/vllm-project/production-stack) —— Helm chart + operator。
- [LMCache for Enterprise-Scale LLM Inference (arXiv:2510.09665)](https://arxiv.org/html/2510.09665v2)
- [LMCache GitHub](https://github.com/LMCache/LMCache) —— Connector 实现。
- [vLLM 0.11.0 release notes](https://github.com/vllm-project/vllm/releases) —— 异步路径细节。
