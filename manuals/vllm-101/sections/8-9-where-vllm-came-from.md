# vLLM 的发展历程

> 本节介绍 Berkeley 项目起点、V0 到 V1 的变化，以及项目当前的治理方式。

如今安装的 vLLM 是同一个项目名下的第二代 engine。读完本节，你可以说出项目从哪里起步、为什么重写 engine，以及现在由谁决定发展方向。

## 源自 Berkeley 项目的一项想法 {#s-where-vllm-came-from-a-berkeley-project-with-one-idea}

该仓库于 2023-02-09 在加州大学 Berkeley 分校启动，最初的提交来自 Woosuk Kwon。第一个公开版本 v0.1.0 于 2023-06-20 发布，同时发布了一篇介绍 PagedAttention 的博客。同一想法的论文后来发表于 SOSP 2023。

这个想法是把 KV cache 存入固定大小的 block，就像操作系统用 page 管理内存。这样一台 GPU 可容纳更多请求，而且请求之间也能共享 block。早期用户把它用于 LMSYS 团队的 Chatbot Arena 和 Vicuna demo。

## 第一代 engine 加入的功能 {#s-where-vllm-came-from-features-in-the-first-engine}

2023 到 2025 年间，第一代 engine 加入了本手册介绍的大部分功能：

| Release | 日期 | 新增功能 |
|---|---|---|
| v0.3.0 | 2024-01-31 | experimental multi-LoRA、experimental prefix caching 和 FP8 KV cache |
| v0.4.0 | 2024-03-30 | automatic prefix caching，以及早期的 chunked prefill 和 speculative decoding |
| v0.6.0 | 2024-09-04 | 默认设置下吞吐量约为 v0.5.3 的两倍、异步 output processor，以及可选 multi-step scheduler |

我们的理解是：每个功能都加进了最初没有为它预留结构的 engine，代码因此越来越难修改。

## 重写 engine {#s-where-vllm-came-from-the-rewrite}

团队构建了第二代 engine，命名为 V1。目标是简洁、模块化的代码库，几乎没有 CPU 开销，并默认开启主要优化。V1 于 2025-01-27 在 v0.7.0 开放测试，默认启用 torch.compile。v0.8.0 于 2025-03-18 将 V1 设为默认 engine。v0.11.0 于 2025-10-02 移除了旧 engine。

第 8 部分其他章节介绍的想法，都来自这次重写。一个 token 预算取代 prefill 和 decode 两条路径。Chunked prefill 和 prefix caching 成为默认功能。进程拆分把调度器放进独立进程。后来团队又重建 model runner，因为他们认为旧实现存在设计问题。

## 当前发布节奏 {#s-where-vllm-came-from-releases-now}

到 v0.11 版为止，新次版本的间隔为 1 到 5 个月。自 2025 年 12 月发布 v0.12.0 起，新次版本大约每两周发布一次。到 2026-10-18，项目已在 GitHub 发布 108 个版本。每个版本都可能修改默认值或移除弃用 flag，因此几个月前的配置可能已经不适用。本手册固定使用 0.31.0。

## 谁在运营项目 {#s-where-vllm-came-from-who-runs-it}

项目于 2024 年 7 月加入 LF AI & Data Foundation 孵化流程。2025-05-07，它成为 PyTorch Foundation 托管项目。五位 lead maintainer 和 55 位活跃 committer 负责审查改动。多家公司向项目派驻工程师。Red Hat 于 2025 年 1 月收购 Neural Magic 后，也将其团队带入项目。

项目也公开讨论高速发展带来的代价。2026 年 9 月和 10 月发布的两份 RFC 指出，审查能力跟不上 pull request 的增长速度。一份建议设立 reviewer 角色；另一份建议贡献者在自己的 GPU 上运行 eval 和 benchmark，让 pull request 附上验证证据。

```takeaways
- vLLM 于 2023 年从 Berkeley 起步，核心想法是分页管理 KV cache 的 PagedAttention。
- V1 engine 在 v0.7.0 到 v0.11.0 之间取代了第一代 engine。
- 新次版本约每两周发布一次，因此应固定所用版本。
```

Sources: the GitHub release list of vllm-project/vllm (fetched 2026-10-22), the commit history of vllm-project/vllm (2023-02-09), the vLLM launch blog post vLLM: Easy, Fast, and Cheap LLM Serving with PagedAttention (2023-06-20), the PagedAttention paper Efficient Memory Management for Large Language Model Serving with PagedAttention (arXiv 2309.06180, SOSP 2023), the release notes for v0.1.0, v0.3.0, v0.4.0, v0.6.0, v0.7.0, v0.8.0, v0.11.0, and v0.12.0, the vLLM blog post vLLM V1: A Major Upgrade to vLLM's Core Architecture (2025-01-27), the vLLM blog post vLLM's Open Governance and Performance Roadmap (2024-07-25), the PyTorch Foundation post PyTorch Foundation Welcomes vLLM as a Hosted Project (2025-05-07), the Red Hat press release Red Hat Completes Acquisition of Neural Magic to Fuel Optimized Generative AI Innovation Across the Hybrid Cloud (2025-01-13), vLLM documentation at v0.31.0 (docs/governance/process.md, docs/governance/committers.md, docs/design/model_runner_v2.md), vLLM issues 58253 and 61698.
