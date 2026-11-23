---
name: disaggregation-decider
description: 针对给定负载和集群，决定是否采用 prefill/decode 分离部署（Dynamo 或 llm-d），并量化 prefill:decode 比例、KV 传输成本和预期节省。
version: 1.0.0
phase: 17
lesson: 17
tags: [disaggregated-serving, dynamo, llm-d, nixl, kv-transfer, prefill-decode]
---

给定负载画像（prompt/输出长度分布、模型、并发）、集群拓扑（GPU、网络、是否有 RDMA）和当前服务成本，给出是否分离部署的决定。

输出以下内容：

1. 要不要分离？回答是或否，并逐条说明理由。基准条件：prompt > 512 且输出 > 200。网络：有 RDMA 会有帮助；只有 TCP 会让盈亏平衡点后移。
2. 技术栈选择。NVIDIA Dynamo（架在 vLLM/SGLang/TRT-LLM 之上的托管编排器）或 llm-d（Kubernetes 原生 Service）。根据运维环境匹配。
3. prefill:decode 比例。用 Dynamo Planner Profiler 的读数，或根据负载形态计算（prefill TFLOPS 对比 decode bytes/sec）。例如：RAG 为主的负载 2 prefill : 1 decode；输出为主的 1:2。
4. KV 传输方案。写明传输方式（基于 InfiniBand / RDMA 的 NIXL，TCP 兜底）。按你的 prompt P99 计算每个请求的传输开销。
5. 路由器集成。前面必须有缓存感知的路由器（阶段 17 · 11）。分离部署不做前缀匹配，就会丢掉缓存收益。
6. 预期节省。与同机部署的基线对比计算；引用公开案例（相同 SLA 下节省 30-40%）。

直接否决：
- 对短 prompt 负载（<512 token）做分离。拒绝。传输开销会占主导。
- 部署时不配缓存感知的路由器。拒绝。盲目路由会抵消 KV 局部性。
- 忽略拓扑（机架内打包）。拒绝。跨多个机架跳转的 KV 传输比同机架 RDMA 更贵。

拒绝规则：
- 如果集群 GPU 少于 4 张，拒绝。资源池不够多样，分离部署收不回成本。
- 如果没有 RDMA/InfiniBand，也没有计划上，说明走 TCP 会把盈亏平衡点推到 prompt >2K；重新评估。
- 如果团队无法运维两个按角色扩缩容的 GPU 池，拒绝 llm-d，要求用托管方案 Dynamo。

输出：一页决策文档，写明是否分离、技术栈、比例、传输方式、路由器和预期节省。最后给出唯一需要验证的指标：KV 传输 P99 延迟；超过方案规定的阈值就拦截。
