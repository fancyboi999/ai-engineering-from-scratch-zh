# SGLang 与 RadixAttention 应对 prefix 重的工作负载

> SGLang 把 KV cache 当成一个一等的、可复用的资源，存在一棵 radix 树里。vLLM 按 FCFS（先到先服务）调度请求，而 SGLang 的缓存感知调度器优先服务共享前缀更长的请求 —— 本质上是一次深度优先的 radix 遍历，让热分支常驻在 HBM 里。在 Llama 3.1 8B 上跑 ShareGPT 式的 1K prompt，SGLang 跑到约 16,200 tok/s，vLLM 约 12,500，约 29% 的优势。在 prefix 重的 RAG 工作负载上，优势达到 6.4 倍。在语音克隆形态的工作负载上，缓存命中率越过了 86%。2026 年部署在 xAI、LinkedIn、Cursor、Oracle、GCP、Azure、AWS 的 400,000+ 块 GPU 上。坑在于：当前缀顺序不一致时，那个 6.4 倍的数字会蒸发 —— 顺序是工程师手里的杠杆。

**类型：** Learn
**语言：** Python（标准库，一个玩具级 radix 树缓存 + 缓存感知调度器）
**前置要求：** 阶段 17 · 04（vLLM 服务内部机制）、阶段 14（Agentic RAG）
**预计时间：** ~75 分钟

## 学习目标

- 画出 RadixAttention：前缀怎么存在一棵 radix 树里，KV block 怎么在挂在同一分支下的序列之间共享。
- 解释缓存感知调度，以及为什么 FCFS 对 prefix 重的流量是错的。
- 给定前缀缓存命中率和 prompt 长度分布，算出一个工作负载的预期加速比。
- 说出让那个 6.4 倍数字成真、而不是白白错失的 prompt 排序纪律。

## 问题背景

经典服务把每个请求的 prompt 当成不透明的。哪怕 5,000 个 RAG 请求全都以相同的 2,000 token 系统 prompt 加相同的检索前言开头，vLLM 也会把那 2,000 token 的前缀 prefill 5,000 次。GPU 一遍又一遍做着同样的活儿。

观察到的现象是：agentic 和 RAG 工作负载里的 prompt 几乎总是共享长前缀。系统 prompt、工具 schema、few-shot 示例、检索头、对话历史 —— 都在请求间重复。如果你把那个前缀的 KV cache 存一次再复用，你就不用再 prefill 它了。

RadixAttention 正是这么做的。token 被索引进一棵 radix 树；每个节点拥有它从根到该节点这条路径上 token 序列的 KV block。新请求走这棵树：任何 token 匹配的节点都复用该节点的 KV block。prefill 成本变得正比于"新"的后缀，而不是整个 prompt。

挑战在调度。如果两个请求共享一个 2,000 token 的前缀，第三个只共享该前缀的 200 token，你想把那两个长共享的请求放在一起服务，好让长前缀留在 HBM 里。FCFS 干的是反的 —— 它服务先到的那个，可能在下一个长前缀请求到来之前就把热分支驱逐掉。

## 核心概念

### radix 树作为 KV 索引

一棵 radix 树（紧凑 trie）存 token 序列。每个节点拥有一个 token 区间和为该区间算出的 KV block。子节点把序列延长一个或多个 token。

```
root
 |- "You are a helpful assistant..."  (2,000 个 token, 124 个 KV block)
      |- "Context: <doc A>..."        (500 个 token, 31 个 block)
           |- "Question: Alice..."    (80 个 token, 5 个 block)
           |- "Question: Bob..."      (95 个 token, 6 个 block)
      |- "Context: <doc B>..."        (520 个 token, 33 个 block)
```

一个新请求带着 系统 prompt + "Context: <doc A>" + "Question: Carol" 进来。调度器走树：系统前缀匹配（复用 124 个 block），doc-A 分支匹配（复用 31 个 block），然后只为 "Question: Carol" 分配新 block（4 个 block）。prefill 成本：4 个 block 的新 token。没有树时：160 个 block。prefill 上约 40 倍的节省。

### 缓存感知调度

如果缓存来回翻搅，radix 树支撑的复用就毫无意义。两条关键策略：

1. **深度优先分派**。从队列挑下一个请求时，偏好挂在当前运行集合同一分支下的请求。这把热分支钉住。
2. **分支级 LRU，不是 block 级**。驱逐整条分支（从使用时间最短的叶子开始）而不是单个 block，让缓存形状匹配 radix 形状。

FCFS 两条都违反。一个共享 2,000 token 的请求排在一个只共享 50 token 的请求后面，然后那条 2,000 token 的分支被驱逐去接纳那个 50 token 的。

### 你该背下来的基准数字

- Llama 3.1 8B、H100、ShareGPT 1K prompt：SGLang ~16,200 tok/s vs vLLM ~12,500（~29% 优势）。
- prefix 重的 RAG（相同系统 + 相同文档、问题不同）：SGLang 上最高 6.4 倍。
- 语音克隆工作负载：86.4% 前缀缓存命中率。
- SGLang 客户中的生产命中率：取决于 prompt 纪律，50-99%。
- 2026 年部署在 400,000+ 块 GPU 上。

### 排序的坑

那个 6.4 倍的数字依赖一致的 prompt 模板排序。如果你的客户端在某些请求里把 prompt 拼成 `[system, tools, context, history, question]`，在另一些里拼成 `[system, context, tools, history, question]`，树就找不到共享前缀。在人看来是共享前缀的东西，对 radix 树来说是两个不同的序列。

工程师手里的杠杆：你的 prompt 模板就是一个缓存键。固定顺序。把所有不变的东西（system、tools、schema）放最前。把检索上下文放其次。把用户问题放最后。别把动态内容穿插进前缀。

研究里的真实案例：把动态内容移出可缓存的前缀，让一个部署在一次改动里从 7% 提到 74% 的缓存命中率。

### RadixAttention 哪里赢、哪里输

赢：
- RAG（相同检索前言、问题不同）。
- Agent（相同工具 schema、查询不同）。
- 带长系统 prompt 的聊天。
- 带重复前言的语音/视觉工作负载。

输（退回 vLLM 级吞吐）：
- 带唯一 prompt 的单次生成（代码补全、没有系统 prompt 的开放式聊天）。
- 每个请求都把唯一内容穿插进前缀的动态 prompt。

### 为什么这是调度问题，不只是 kernel 问题

你可以把 KV 复用实现成一个 kernel 技巧。SGLang 的洞见是：只有调度器把热分支留住，复用才划算。一个朴素的"有就复用"策略会在混合负载下把缓存搅来搅去。radix 树索引的调度器，才是把 kernel 技巧变成 29% 生产优势的东西。

### 与 vLLM 的相互作用

这两套系统不是严格的竞品。2026 年 vLLM 加了前缀缓存（`--enable-prefix-caching`）和一个缓存感知路由器（用 Rust 写的 vLLM Router）。差距收窄了，但没完全消失 —— SGLang 整个栈是 radix 优先的；vLLM 是后来嫁接上去的。对前缀复用主导的工作负载，SGLang 仍是默认。对没有强前缀模式的通用服务，vLLM 仍持平或更好。

```figure
roofline
```

## 实际使用

`code/main.py` 实现一个玩具级 radix 树 KV cache 加一个带两种策略的调度器：FCFS 和缓存感知。把同一个工作负载跑两遍，报告前缀缓存命中率和吞吐差值。然后跑一个"打乱顺序"的工作负载，展示 6.4 倍是怎么崩掉的。

## 拿去用

这一课产出 `outputs/skill-radix-scheduler-advisor.md`。给定一段工作负载描述（prompt 模板形状、检索模式、并发租户数），它产出一份 prompt 排序处方和一个是否采用 SGLang 的 go/no-go。

## 练习

1. 跑 `code/main.py`。在同一个工作负载上对比 FCFS 和缓存感知。差值从哪来 —— prefill 节省、decode 节省，还是队列延迟？
2. 改造工作负载，让 prompt 随机排列 `[system, tools, context]`。重跑。命中率怎么样了？为什么？
3. 算一算在 Llama 3.1 8B 上把一个 2,000 token 系统 prompt 当一条 radix 分支常驻的 HBM 成本。和一个没有前缀复用的 16 序列批次的成本对比。
4. 读 SGLang RadixAttention 论文。用三句话解释为什么在 prefix 重的负载下，树形 LRU 驱逐胜过 block 形 LRU。
5. 一个客户报告只有 8% 缓存命中率。说出三个可能原因，以及你会为每个原因跑的诊断。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| RadixAttention | "SGLang 那玩意" | 把 KV cache 索引成 radix 树，让共享前缀复用 block |
| Radix 树 | "紧凑 trie" | 每个节点拥有一个 token 区间及其 KV block 的树 |
| 缓存感知调度器 | "热分支优先" | 偏好共享常驻分支的请求的调度器 |
| 前缀缓存命中率 | "你的 prompt 有多少是免费的" | 由复用 KV block 服务的 prompt token 比例 |
| FCFS | "先到先服务" | 破坏前缀局部性的默认调度 |
| 分支级 LRU | "驱逐叶子" | 匹配 radix 形状的驱逐策略 |
| prompt 模板排序 | "缓存键" | prompt 各部分的顺序决定树能共享什么 |
| 系统 prompt 钉住 | "常驻前缀" | 把不变的系统部分钉住，避免驱逐抖动 |

## 延伸阅读

- [SGLang GitHub](https://github.com/sgl-project/sglang) —— 源码和文档。
- [SGLang documentation](https://sgl-project.github.io/) —— RadixAttention 和调度细节。
- [SGLang paper — Efficiently Programming Large Language Models (arXiv:2312.07104)](https://arxiv.org/abs/2312.07104) —— 设计参考。
- [LMSYS blog — SGLang with RadixAttention](https://www.lmsys.org/blog/2024-01-17-sglang/) —— 基准数字和调度器理由。
- [vLLM — Prefix Caching](https://docs.vllm.ai/en/latest/features/prefix_caching.html) —— vLLM 自家类 radix 实现，用于对比。
