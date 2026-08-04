# 分离式 Prefill/Decode —— NVIDIA Dynamo 与 llm-d

> Prefill 受计算限制；decode 受内存限制。把两者跑在同一块 GPU 上会浪费其中一种资源。分离（disaggregation）把它们拆到分开的池上，并经由 NIXL（RDMA/InfiniBand 或回退到 TCP）在两者之间传输 KV cache。NVIDIA Dynamo（GTC 2025 发布，1.0 GA）位于 vLLM/SGLang/TRT-LLM 之上 —— 它的 Planner Profiler + SLA Planner 自动按比例匹配 prefill:decode 的配比以满足 SLO。NVIDIA 公布的吞吐增益大致在这个区间 —— developer.nvidia.com（2025-06）显示 DeepSeek-R1 MoE 在 GB200 NVL72 + Dynamo 上、在中等延迟制度下约 6 倍的提升，而 Dynamo 产品页（developer.nvidia.com，无日期）宣传 GB300 NVL72 + Dynamo 相比 Hopper 最高 50 倍的 MoE 吞吐。那个"30x"的数字是跨全栈 Blackwell + Dynamo + DeepSeek-R1 报告的社区聚合；我们没找到一个准确说 30x 的单一一手来源，所以把它当方向性说法。llm-d（Red Hat + AWS）是 Kubernetes 原生的：prefill / decode / 路由器作为独立的 Service，按角色分别配 HPA。llm-d 0.5 加了分层 KV offloading、缓存感知 LoRA 路由、UCCL 网络、缩到零。经济性：对多个客户披露做内部汇总，提示在恒定 SLA 下从同机部署切到带 Dynamo 的分离式，能在 200 万美元级的推理开销上节省 30-40%（即每年 60-80 万美元）；那个具体的 $2M→$600-800K 数字是内部综合，不是单一已发布案例 —— 把它当数量级锚点，不是引用出处。短 prompt（<512 token、短输出）不值得那笔传输成本。

**类型：** Learn
**语言：** Python（标准库，一个玩具级分离式 vs 同机模拟器）
**前置要求：** 阶段 17 · 04（推理服务引擎内部机制）、阶段 17 · 08（推理指标）
**预计时间：** ~75 分钟

## 学习目标

- 解释为什么 prefill 和 decode 有不同的最优 GPU 分配，并量化同机下的浪费。
- 画出分离式架构：prefill 池、decode 池、经 NIXL 的 KV 传输、路由器。
- 说出分离不划算的条件（短 prompt、短输出）。
- 区分 NVIDIA Dynamo（栈之上）和 llm-d（Kubernetes 原生），并把每个对应到一个运维场景。

## 问题背景

你在 8 块 H100 上跑 Llama 3.3 70B。在混合工作负载下（长 prompt + 短输出），GPU 在 decode 期间闲着，因为大部分算力花在了 prefill 上。在另一种工作负载下（短 prompt + 长输出），反过来。同机的 prefill + decode 意味着你对两者都超配。

预算影响：20-40% 的 GPU 时间浪费在错误的资源上。你在买 H100 算力去跑内存受限的 decode，或者在买 H100 HBM 带宽去跑计算受限的 prefill。两者都是昂贵的浪费。

分离把 prefill 和 decode 拆到各按自己瓶颈配尺寸的分开池上。KV cache 经由高带宽互联从 prefill 池传到 decode 池。

## 核心概念

### 为什么瓶颈不同

**Prefill** —— 在一次 forward 里把 transformer 跑过整个输入 prompt。矩阵乘法主导；受计算限制。H100 FP8 给出约 2000 TFLOPS 的有用吞吐。批效率好 —— 一次 forward 处理很多 token。

**Decode** —— 一次生成一个 token，每次迭代读取整套权重。受内存带宽限制。HBM3 给出约 3 TB/s。批效率只在高并发时好 —— 读权重的开销跨批摊薄。

把它们同机：你买的 GPU 要同时优化两者。H100 两者都擅长，但哪种用法都一样贵。在规模上，你想要 prefill 池在 H100 / 计算重；decode 池在 H200 / 内存重，或者用激进量化。

### 架构

```
            ┌──────────────┐
  请求    → │    路由器     │ ───────────────────────┐
            └──────┬───────┘                        │
                   │                                │
                   ▼ (仅 prompt)                    │
            ┌──────────────┐    KV cache    ┌───────▼──────┐
            │  Prefill 池  │ ─── NIXL ────► │  Decode 池   │
            │   (计算)     │                │   (内存)     │
            └──────────────┘                └──────┬───────┘
                                                   │ token
                                                   ▼
                                                 客户端
```

NIXL 是 NVIDIA 的跨节点传输。可用时用 RDMA/InfiniBand，否则回退到 TCP。传输延迟是真实存在的 —— 对 70B FP8 上一个 4K token prompt 的 KV cache，通常 20-80 ms。这就是为什么短 prompt 不值得分离：传输税超过节省。

### Dynamo vs llm-d

**NVIDIA Dynamo**（GTC 2025 发布，1.0 GA）：
- 作为编排器位于 vLLM、SGLang、TRT-LLM 之上。
- Planner Profiler 测量工作负载，SLA Planner 自动配置 prefill:decode 配比。
- Rust 内核，Python 可扩展。
- 吞吐增益：NVIDIA 报告 DeepSeek-R1 MoE 在 GB200 NVL72 + Dynamo 上、中等延迟制度下 6 倍（developer.nvidia.com，2025-06）；关于全 Blackwell + Dynamo + DeepSeek-R1 栈"最高 30x"的社区报告缺乏单一一手来源，应当作方向性看待。
- GB300 NVL72 + Dynamo：据 Dynamo 产品页（developer.nvidia.com，无日期），相比 Hopper 最高 50x MoE 吞吐。

**llm-d**（Red Hat + AWS，Kubernetes 原生）：
- prefill / decode / 路由器作为独立的 Kubernetes Service。
- 按角色配 HPA，用队列深度（prefill）/ KV 利用率（decode）信号。
- `topologyConstraint packDomain: rack` 把 prefill+decode 小团打包到同一机架，做高带宽 KV 传输。
- llm-d 0.5（2026）：分层 KV offloading、缓存感知 LoRA 路由、UCCL 网络、缩到零。

想要一个托管的栈之上编排器就用 Dynamo。想要 Kubernetes 原生原语、并押注 CNCF 生态就用 llm-d。

### 经济性

内部综合（不是单一已发布案例 —— 数量级锚点）：

- 同机部署上每年 200 万美元推理开销。
- 切到带 Dynamo 的分离式。
- 相同请求量、相同 P99 延迟 SLA。
- 报告的节省：每年 60-80 万美元（降 30-40%）。
- 不加新硬件。

我们从多个客户披露综合出这个数字，而不是某个可引用的单一案例；最接近的已发布数据点是 Baseten 用 Dynamo KV 路由实现 2 倍更快 TTFT / 高 61% 吞吐（baseten.co，2025-10），以及 VAST + CoreWeave 在 40-60% KV 命中率下多出 60-130% token/$ 的预测（vastdata.com，2025-12）。节省来自给每个池正确定尺寸；prefill 重的工作负载（带 8K+ 前缀的 RAG）比均衡的受益更多。

### 何时别分离

- prompt < 512 token 且输出 < 200 token：传输税盖过收益。
- 小集群（< 4 GPU）：池子多样性不够。
- 团队无法运维带按角色扩缩的两个 GPU 池：Dynamo 有帮助但不是轻而易举。
- 没有 RDMA fabric：TCP 传输税更重。

### 路由器与阶段 17 · 11 集成

分离式路由器是 KV-cache 感知的（阶段 17 · 11）。一个请求落在持有它前缀的 decode 池上 —— 没匹配的话，它就流过 prefill → decode。命中率和分离相互叠加 —— 缓存感知路由器决定一次新的 prefill 到底是否需要。

### Blackwell 上的 MoE 才是真正数字所在

GB300 NVL72 + Dynamo 显示相比 Hopper 基线 50x 的 MoE 吞吐。MoE 专家路由在 prefill 上计算重、在 decode 上内存重（专家缓存），所以分离是双赢。2026 年的前沿模型服务以 MoE 为主导（DeepSeek-V3、未来的 GPT-5 变体）。

### 你该记住的数字

基准数字会漂移 —— NVIDIA 和推理栈每季度都发新结果。引用前重新核对。

- DeepSeek-R1 在 GB200 NVL72 + Dynamo 上：中等延迟制度下相比基线约 6x 吞吐（developer.nvidia.com，2025-06）；关于全 Blackwell + Dynamo 栈"最高 30x"的社区说法是没有单一一手来源的方向性聚合。
- GB300 NVL72 + Dynamo：相比 Hopper 最高 50x MoE 吞吐（developer.nvidia.com，无日期）。
- 节省锚点（内部综合，非单一案例）：在恒定 SLA 下从 200 万美元年开销里省 60-80 万美元/年。
- 分离阈值：prompt >512 token + 输出 >200 token。
- 经 NIXL 的 KV 传输：70B FP8 上 4K prompt 的 KV 为 20-80 ms。

```figure
prefill-decode-split
```

## 实际使用

`code/main.py` 模拟同机 vs 分离式服务。报告吞吐、单请求成本和 prompt 长度的交叉点。

## 拿去用

这一课产出 `outputs/skill-disaggregation-decider.md`。给定工作负载和集群，决定是否分离。

## 练习

1. 跑 `code/main.py`。prompt 长到多少时分离胜过同机？
2. 为一个 P99 前缀长度 8K、输出 300 的 RAG 服务设计 prefill 池和 decode 池。
3. Dynamo vs llm-d：为一个纯 Kubernetes、对 Python 运行时无偏好的团队挑一个。
4. 算 KV 传输成本：70B FP8 上 4K prefill = 约 500 MB KV。RDMA 100 GB/s 下，传输 = 5 ms。TCP 10 GB/s = 50 ms。哪个对你的 SLA 重要？
5. MoE 专家路由改变 KV 访问模式。对每个 token 激活不同专家的 MoE，分离表现如何？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 分离式服务 | "拆 prefill/decode" | 为每个阶段分开的 GPU 池 |
| NIXL | "NVIDIA 传输" | Dynamo 的跨节点 KV 传输（RDMA/TCP） |
| NVIDIA Dynamo | "编排器" | vLLM/SGLang/TRT-LLM 的栈之上协调器 |
| llm-d | "Kubernetes 原生" | Red Hat + AWS 的 K8s 分离式栈 |
| Planner Profiler | "Dynamo 自动配置" | 测量工作负载，配置池配比 |
| SLA Planner | "Dynamo 策略" | 自动按比例匹配 prefill:decode 以满足 SLO |
| `packDomain: rack` | "llm-d 拓扑" | 把 prefill+decode 打包到同机架做快速 KV |
| UCCL | "统一集合通信" | llm-d 0.5 用于缩到零的网络层 |
| MoE 专家路由 | "每 token 一个专家" | DeepSeek-V3 模式；分离有帮助 |

## 延伸阅读

- [NVIDIA — Introducing Dynamo](https://developer.nvidia.com/blog/introducing-nvidia-dynamo-a-low-latency-distributed-inference-framework-for-scaling-reasoning-ai-models/)
- [NVIDIA — Disaggregated LLM Inference on Kubernetes](https://developer.nvidia.com/blog/deploying-disaggregated-llm-inference-workloads-on-kubernetes/)
- [TensorRT-LLM Disaggregated Serving blog](https://nvidia.github.io/TensorRT-LLM/blogs/tech_blog/blog5_Disaggregated_Serving_in_TensorRT-LLM.html)
- [llm-d GitHub](https://github.com/llm-d/llm-d)
- [llm-d 0.5 release notes](https://github.com/llm-d/llm-d/releases)
