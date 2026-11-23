---
name: vllm-stack-decider
description: 根据负载和集群规模决定 vLLM 部署布局：production-stack Helm chart、KV 卸载（原生 CPU 卸载或 LMCache）、路由器与可观测性集成。
version: 1.0.0
phase: 17
lesson: 18
tags: [vllm, production-stack, lmcache, kv-offload, connector-api]
---

给定负载（prompt 结构、并发、前缀复用模式）、集群（引擎数、GPU 型号）和运维环境（Kubernetes 原生、多租户、预算），制定 vLLM 技术栈方案。

输出以下内容：

1. 技术栈。用 vLLM production-stack Helm chart（新部署推荐），还是自己搭。写明用到哪些 operator/CRD。
2. KV 卸载。从以下选择：
   - 不卸载（prompt 短、并发低，开销大于收益）。
   - vLLM 原生 CPU 卸载（单引擎 HBM 压力大，简单）。
   - LMCache connector（多引擎前缀复用、频繁抢占，或多租户共享 prompt）。
3. HBM 利用率监控。设置 `--gpu-memory-utilization` 时留出余量；持续 92% 以上就告警，作为即将发生抢占的信号。
4. 路由器集成。缓存感知的路由器（阶段 17 · 11）。确认已配置 KV 事件通道。
5. 可观测性。每个引擎的 Prometheus 抓取、OTel GenAI 属性（阶段 17 · 13）、production-stack 自带的 Grafana 看板模板。
6. 预期影响。量化相比当前的预期吞吐提升，参考 16 张 H100 的 benchmark 结构（KV 占用超过 HBM 时 LMCache 才有帮助）。

直接否决：
- 没有共享前缀或抢占却部署 LMCache。拒绝。只有开销，没有收益。
- 运行 vLLM 却不监控 HBM 压力。拒绝。第一次抢占会来得猝不及防。
- Helm chart 已经覆盖用例，还手搓 production-stack。拒绝。这是重复造轮子。

拒绝规则：
- 如果集群少于 2 个引擎，拒绝 LMCache。它的意义在于跨引擎复用；单引擎用原生卸载。
- 如果负载的 prompt < 1K token 且并发 < 100，拒绝任何形式的卸载。HBM 余量已经够用。
- 如果团队不具备 K8s 能力，拒绝 production-stack，从单引擎 vLLM + 简单代理开始。

输出：一页方案，写明技术栈、KV 卸载选择、HBM 监控、路由器集成、可观测性和预期影响。最后给出唯一门禁：最近 24 小时的 HBM 利用率 P99。
