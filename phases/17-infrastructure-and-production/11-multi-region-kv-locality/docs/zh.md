# 多区域 LLM 服务与 KV Cache 局部性

> 对带缓存的 LLM 推理来说，轮询负载均衡是主动有害的。一个没落在持有它前缀的节点上的请求要付全额 prefill 成本 —— 长 prompt 上 P50 大约 800 ms，而缓存命中约 80 ms。2026 年的生产模式是一个缓存感知路由器（用 Rust 写的 vLLM Router、llm-d 路由器），它消费 KV-cache 事件，按前缀哈希匹配来路由。近期研究（GORGO）把跨区域网络延迟变成路由目标里一个显式的项。商用的"跨区域推理"产品（Bedrock cross-region inference、GKE 多集群网关）把推理当成不透明的 —— 它们管的是可用性，不是 TTFT。摩根大通和梅奥诊所在 2024 年 11 月跑了 us-east-1 故障转移，约 22 分钟。灾备的现实：32% 的 LLM 灾备失败是因为团队备份了权重，却忘了分词器文件或量化配置。

**类型：** Learn
**语言：** Python（标准库，一个玩具级前缀缓存感知路由器模拟器）
**前置要求：** 阶段 17 · 04（vLLM 服务）、阶段 17 · 06（SGLang RadixAttention）
**预计时间：** ~60 分钟

## 学习目标

- 解释为什么轮询负载均衡破坏带缓存的推理，并量化 TTFT 惩罚。
- 画出一个缓存感知路由器：输入（KV-cache 事件）、算法（前缀哈希匹配）、平局裁决（GPU 利用率）。
- 说出 LLM 的那个 32% 灾备失败成因（缺分词器文件 / 量化配置），并给出一份三文件灾备清单。
- 区分商用跨区域产品（Bedrock CRI、GKE Multi-Cluster Gateway）和 KV 感知路由。

## 问题背景

你的服务跑在 us-east-1、us-west-2 和 eu-west-1。你在前面摆了个 ALB 做轮询。生产里前缀缓存命中率掉到 8%。TTFT P50 翻了三倍。你的 vLLM 日志显示每个请求都在付全额 prefill 成本。

轮询对无状态服务是最优的。LLM 推理在设计上就是有状态的 —— KV cache 编码了模型看过的一切。盲目路由就是路由进了错误的缓存。

另一边，你的团队有一份灾备计划。你把模型权重跨区域备份到 S3。一次区域宕机来袭；你尝试故障转移；副本拒绝启动。你忘了 tokenizer.json、量化配置和 RoPE 缩放配置在另一个你没同步的 bucket 里。

多区域 LLM 服务是个缓存问题、路由问题和灾备卫生问题 —— 不是个负载均衡器问题。

## 核心概念

### 缓存感知路由

请求带着一个 prompt 到来。路由器哈希前缀（比如前 512 token）；它问每个副本"你缓存了这个前缀吗？"。副本在分配和驱逐 block 时，把 KV-cache 事件发布到一个 pub/sub 通道。路由器挑出匹配的那个副本，没人匹配就回落到基于 GPU 利用率的平局裁决。

**vLLM Router**（Rust，2026 production-stack）：订阅 `kv.cache.block_added` 事件，维护一个 前缀哈希 → 副本 的索引，以 O(1) 查找路由。没匹配时回落到最小队列深度。

**llm-d 路由器**：同样的模式，Kubernetes 原生。经由 ControlPlane API 发布事件。

**SGLang RadixAttention**（阶段 17 · 06）是副本内的对应物。跨副本路由严格在上游。

### 数字

2K token prompt、Llama 3.3 70B FP8、H100 上的 TTFT P50：
- 缓存命中（同一副本、前缀常驻）：~80 ms。
- 缓存未命中（冷 prefill）：~800 ms。

10 倍差距。如果你的路由器跨副本命中 60-80% 的前缀缓存，你就在 N 副本的容量上逼近了单副本的性能。如果它命中 10%，你就逼近了朴素扩容。

### 跨区域有个新约束 —— 网络延迟

跨区域 RTT：
- us-east-1 ↔ us-west-2：~65 ms。
- us-east-1 ↔ eu-west-1：~75 ms。
- us-east-1 ↔ ap-southeast-1：~220 ms。

如果路由把一个 us-east-1 的请求送去 ap-southeast-1 的一个热前缀，省下的 prefill（800 → 80 ms）被 440 ms 的往返淹没。GORGO（2026 研究）把这点显式化了 —— 联合最小化 `prefill_time + network_latency`，不是只 prefill。答案常常是保持区域内路由，除非在 prefill 主导的巨型多 MB 前缀上。

### 商用"跨区域推理"在这里帮不上忙

AWS Bedrock cross-region inference 在算力压力下自动把请求路由到其他区域。它优化的是可用性，不是 TTFT，并且把推理当成不透明的。GKE Multi-Cluster Gateway 也一样 —— 服务级故障转移，对 KV cache 无感知。

即使用了这些，你仍然需要一个应用层的缓存感知路由器。它们管"us-east-1 着火了"那种情况。缓存感知路由管的是 TTFT 那种情况。

### 灾备卫生 —— 那个 32% 缺文件问题

2026 年被广泛引用的统计：32% 的 LLM 灾备失败是因为团队备份了权重却忘了：

- `tokenizer.json` 或 `tokenizer.model`
- 量化配置（`quantize_config.json`、AWQ 缩放、GPTQ 零点）
- 模型特定配置（RoPE 缩放、注意力掩码、聊天模板）
- 引擎配置（`vllm_config.yaml`、采样默认值、LoRA adapter manifest）

修法是一份三文件最小灾备 manifest：

1. HF 模型仓库下的所有文件（权重 + 配置 + 分词器）。
2. 引擎特定的服务配置。
3. 部署 manifest（K8s YAML、Dockerfile、依赖锁）。

外加：每季度跑一次灾备演练。摩根大通的 us-east-1 演练在 2024 年 11 月达到 22 分钟恢复，只是因为操作手册排练过。

### 数据驻留是正交的

欧盟客户的 PHI 不能离开欧盟。如果你的缓存感知路由器为了前缀匹配把一个巴黎发起的请求送去 us-east-1，无论 TTFT 收益如何，你都违反了 GDPR。在为缓存优化之前，先按驻留边界划分路由器。

### 你该记住的数字

- 缓存命中 vs 未命中的 TTFT 差距：~10 倍（2K prompt 上 80 ms vs 800 ms）。
- 跨区域 RTT 美欧之间：~75 ms。
- 灾备失败：32% 缺分词器/量化配置。
- 摩根大通 us-east-1 故障转移 2024 年 11 月：22 分钟（30 分钟 SLA）。

```figure
cache-aware-router
```

## 实际使用

`code/main.py` 在一个多区域工作负载上模拟三种路由策略（轮询、缓存感知区域内、缓存感知全局）。报告缓存命中率、TTFT P50/P99 和跨区域账单。

## 拿去用

这一课产出 `outputs/skill-multi-region-router.md`。给定区域、驻留约束和 SLA，设计一份路由方案。

## 练习

1. 跑 `code/main.py`。给定 75 ms RTT，prompt 长到多少时跨区域路由胜过仅本地路由？
2. 你的缓存命中率从 70% 掉到 12%。诊断三个可能原因，以及能证实每个的可观测量。
3. 为一个用 vLLM 服务、带 5 个 LoRA adapter 的 70B AWQ 量化模型设计一份灾备 manifest。列出每个文件和配置。
4. 论证 Bedrock cross-region inference 对一个有严格 TTFT SLO 的金融科技公司是否"够用"。引用具体行为。
5. 一个巴黎发起的请求匹配上 us-east-1 的一个前缀。你路由它吗？写出策略。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 缓存感知路由 | "智能 LB" | 按前缀哈希匹配路由到持有 KV cache 的副本 |
| KV-cache 事件 | "缓存 pub-sub" | 副本发布 block 增/删；路由器建索引 |
| 前缀哈希 | "缓存键" | 前 N 个 token 的哈希，用作路由器查找 |
| GORGO | "跨区域路由研究" | arXiv 2602.11688；把网络延迟作为显式项 |
| 跨区域推理 | "Bedrock CRI" | AWS 产品；可用性故障转移，非 TTFT 感知 |
| 灾备 manifest | "备份清单" | 恢复所需的每个文件 —— 不只是权重 |
| 数据驻留 | "GDPR 边界" | 关于哪个区域能看到用户数据的法律约束 |
| RTT | "往返时间" | 网络延迟；美欧 75 ms，美亚太 220 ms |
| LLM 感知 LB | "缓存命中 LB" | 作为一个产品类别的缓存感知路由器 |

## 延伸阅读

- [BentoML — Multi-cloud and cross-region inference](https://bentoml.com/llm/infrastructure-and-operations/multi-cloud-and-cross-region-inference)
- [arXiv — GORGO (2602.11688)](https://arxiv.org/html/2602.11688v1) —— 带网络延迟项的跨区域 KV-cache 复用。
- [TianPan — Multi-Region LLM Serving Cache Locality](https://tianpan.co/blog/2026-04-17-multi-region-llm-serving-data-residency-routing)
- [AWS Bedrock Cross-Region Inference](https://docs.aws.amazon.com/bedrock/latest/userguide/cross-region-inference.html) —— 可用性故障转移文档。
- [vLLM Production Stack Router](https://github.com/vllm-project/production-stack) —— 缓存感知路由器源码。
