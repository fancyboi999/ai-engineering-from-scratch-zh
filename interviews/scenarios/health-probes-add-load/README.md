---
id: health-probes-add-load
title: 在高负载下加剧雪崩的健康探测
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [health-check, readiness, liveness, kubernetes, probes, shutdown]
minutes: 15
lessons: [phases/17-infrastructure-and-production/23-sre-for-ai]
manuals: [sglang-101#s-check-that-the-server-is-healthy, sglang-101#s-operating-sglang, vllm-101#s-check-that-the-server-is-healthy, vllm-101#s-run-vllm-in-production]
practice: []
cheatsheet: [sre-for-ai]
related: [scenarios/load-knee-and-admission-cap]
updated: 2026-11-03
system:
  version: SGLang 0.5.22 against vLLM 0.31.0
  model: Qwen/Qwen3-8B
  hardware: one L4 with 24 GB of memory
source:
  - manuals/sglang-101/capture/gpu/out-l4/server-default.log
  - manuals/sglang-101/sections/7-1-operating-sglang.md
  - manuals/vllm-101/capture/gpu/out-l4/livecheck-2026-10-22.txt
  - manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md
---

## Situation

一个平台团队在 Kubernetes 上运行 SGLang Pod。其存活探针以极短的超时时间每隔数秒向 `/health` 发起一次检查，一旦探针失败便重启 Pod。在一次突发业务高峰期间，最繁忙的 Pod 陷入了无限重启循环。一个探针发生超时，导致 Pod 在正在生成用户答复的中途被强行杀死，其承载的用户流量随即转移到其他 Pod 上，导致下一个最繁忙的 Pod 随之探针超时。该服务直至高峰退去后才勉强恢复正常。

重启 Pod 的调度器日志记录下了探针本身的活动：在用户请求之间穿插着一个个单 token 的 prefill 批次。工单提出了两项改动提议：延长探针超时时间，并为 Pod 申请更高的内存上限。

## Evidence

- [我们 L4 服务器在就绪日志行前后的健康探测记录](evidence/probe-in-the-log.txt)
- [三个健康检查接口端点及其背后的两个关键配置项](evidence/three-endpoints.txt)
- [代码文档声明的预期行为与两起真实事故呈现的反差](evidence/the-docstring-and-the-incident.txt)
- [配置了 API 密钥的 vLLM 服务器在携带与未带密钥时的路由表现](evidence/the-other-engine.txt)
- [vLLM 服务器启动后的首次健康检查语义分析](evidence/vllm-health-semantics.txt)

## Questions

1. 阅读就绪行前后的日志。当探针询问健康状态时服务器执行了什么操作，在高负载下该行为会付出什么代价？
2. 列出三个健康端点以及各自所负责回答的核心问题。
3. 代码声称在服务器繁忙时探测是零额外开销的。为什么该说法在计算量上是正确的而在时间判定上是错误的？
4. 设计探针体系：就绪探针、存活探针与深度探测。给出具体端点、配置项、超时时间以及失败时的处置策略。
5. 另一个引擎在响应其健康检查接口时无需生成 token。这对其上的深度探测设计带来了什么变化？
6. 在响应请求的中途重启同样需要优雅停机机制。应向哪个进程发送何种信号，需等待多长时间？

## Walkthrough

1. **按顺序阅读八行关键日志。** 14:43:37 探针请求 `/health` 并收到 503，因为服务器仍在初始化。随后服务器向自身 `/generate` 发起了一次预热请求，冻结了垃圾回收器，并输出了就绪日志行。两秒后调度器记录了一个仅包含一个新 token 的 prefill 批次，紧接着探针收到了 200 响应。当时系统中没有运行任何其他任务。该单 token 批次正是探针本身引发的计算。默认情况下 `/health` 不仅做简单响应，还会将请求送入模型并等待生成结果。
2. **理清三个端点的职能边界。** `/ready` 在分词管理器就绪时返回 200，绝不向模型提交任何推理。 `/health` 与 `/health_generate` 共用同一底层处理程序：在启动或关机期间返回 503，在其他时间发送带有 `max_new_tokens` 为 1 的单 token 请求并等待反分词器输出任何结果。 `SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION` 默认值为 true，导致常规的 `/health` 同样会触发推理。等待超时时间由 `SGLANG_HEALTH_CHECK_TIMEOUT` 决定（默认为 20 s），超时后处理程序将服务器标记为不健康并返回 503。
3. **辨析代码说明与真实时延的偏差。** 代码文档在计算工作量层面是成立的：只要调度器产出任何输出即算作存活证明，繁忙的服务器无需完整计算完探针自身的 token。但在时间判定层面则是致命的。探针请求与普通用户请求排在同一个全局队列中；当任何用户的首字延迟超过探针超时阈值时，探针就会发生超时失败。两起真实事故证实了这一双重隐患：一份报告发现大模型在高并发下反分词器长达 20 秒无响应导致健康检查失败；另一份报告指出超时的探针请求残留在调度器内部，导致失败请求不断累积滚雪球。在流量高峰下，探针犹如一个在等待 20 s 后放弃并命令编排器处死服务器的用户。
4. **对比另一推理引擎的实现。** 另一引擎的 `/health`、`/ping` 与 `/load` 接口在未携带 API 密钥时即可直接返回 200，且启动后的首次健康检查直接返回模型列表，毫无 prefill 批次产生。手册指出原因：该引擎的健康检查接口在进程存活时即返回 200 且不生成任何 token，因此 200 并不证明请求能顺利完成端到端推理。在该引擎上，健康路由在设计上属于纯粹的存活探针，而深度探测需要发送独立的短文本请求。

## Resolution

探针配置本身正是引发故障的罪魁祸首。存活探针在每次调用时都生成 token、在用户队列中排队，在高峰时段超时并杀死了负载最重的 Pod，进而将其流量转移到下一个 Pod 引发连锁雪崩。

将 `/ready` 设为就绪探针，确保 Pod 仅在具备接收请求能力时才被挂载接入流量。针对存活探针，配置 `SGLANG_ENABLE_HEALTH_ENDPOINT_GENERATION=false`，使 `/health` 无需向调度器提交推理请求即可直接返回 200，并保留该轻量探针用于感知容器死锁。将 `/health_generate` 移出存活检查，改为低频的深度探测工具，在异常时仅触发告警呼叫而绝不重启 Pod。如此调整后探针超时在业务高峰下不再构成威胁，而内存上限从始至终都不是瓶颈。针对另一引擎，直接沿用原装 `/health` 作为存活检查，并通过独立的单次短文本请求执行深度探测。

随后补齐优雅停机链条。只有向主进程发送 SIGTERM 才能优雅排空正在运行的请求：在排空期间服务器在 `/health` 上返回 503，每 5 s 打印一次剩余请求计数，并在请求清空后退出。向整个进程组广播信号或强制终止会强行截断正在处理中的任务。设置大于输出上限下最长请求耗时的优雅停机超时，并在前置链路中配置严格的 `max_tokens` 上限，否则排空过程永远无法在超时内完成。

## Wrong turns

- "将探针超时时间延长至一分钟。" 探针依然与用户请求一同在队列中排队，且有报告指出超时请求会残留在调度器中。更长的超时只会推迟过载暴露的时间，随后依旧会将 Pod 杀死。
- "调高 Pod 的内存限制。" Pod 根本没有发生内存溢出。它们是被编排器在探针等待过久后主动执行的处决。
- "使用带有生成能力的端点作为存活检查，因为这能证明模型正常。" 在高负载下杀死最繁忙 Pod 的深度检查正是事故的起因。深度探测应当用于呼叫人员而非触发重启。
- "迅速杀死 Pod 以便让其他 Pod 接管。" 向进程组发送信号会优先杀死调度器子进程，导致所有运行中的请求直接报错断连。唯有向主进程发送 SIGTERM 才能优雅排空。

## Generalize

探针本质上是一个外部客户端，而与普通用户在同一个队列中排队的客户端必然会在用户遭遇排队时发生超时，而那恰恰是执行重启代价最高昂的危急时刻。解耦这几个不同的问题：进程能否接收网络请求、进程是否处于存活状态，以及模型能否正常产出 token。为每个问题分配专属的端点、独立的调度频率和差异化的失败惩罚，绝不允许耗时漫长的复杂检查触发容器重启。

## Taught in

SGLang 手册在[健康页面](../../../manuals/sglang-101/sections/1-2-check-that-the-server-is-healthy.md)中展示了日志中的探针记录，并在[运维页面](../../../manuals/sglang-101/sections/7-1-operating-sglang.md)中给出了探针参数、故障案例与排空机制，vLLM 手册在[健康检查页面](../../../manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md)解释了其路由机制并在[生产部署页面](../../../manuals/vllm-101/sections/7-2-run-vllm-in-production.md)规范了生产探针，而 [AI SRE 课程](../../../phases/17-infrastructure-and-production/23-sre-for-ai/docs/en.md)给出了此类级联循环的排障预案。
