# vLLM 服务内部机制：PagedAttention、Continuous Batching、Chunked Prefill

> vLLM 在 2026 年的统治地位靠的是三个叠加生效的默认项，不是某一个单点技巧。PagedAttention 永远开着。Continuous batching 在 decode 迭代之间把新请求注入活跃批次。Chunked prefill 把长 prompt 切片，让 decode token 永不挨饿。三个全开，一块 H100 SXM5 上的 Llama 3.3 70B FP8 在 128 并发下能跑到 2,200-2,400 tok/s —— 大约比 vLLM 自己的默认高 25%，是朴素 PyTorch 循环的 3-4 倍。这一课把调度器和注意力 kernel 读到你能画出图来的程度，并以 `code/main.py` 里一个玩具级 continuous batcher 收尾 —— 它像 vLLM 那样调度 prefill 和 decode。

**类型：** Learn
**语言：** Python（标准库，一个玩具级 continuous batching 调度器）
**前置要求：** 阶段 17 · 01（模型服务）、阶段 11（LLM 工程）
**预计时间：** ~75 分钟

## 学习目标

- 把 PagedAttention 解释成一个 KV cache 分配器：block、block table，以及为什么生产负载下碎片率维持在 4% 以下。
- 在迭代层面画出 continuous batching：完成的序列怎么离开批次、新序列怎么不必排空就加入。
- 用一句话描述 chunked prefill，并说出它保护的是哪个延迟指标（提示：是 TTFT 尾部，不是平均吞吐）。
- 说出 2026 年 vLLM v0.18.0 那个坑 —— 一次把所有优化全打开的团队会被它咬到。

## 问题背景

一个朴素的 PyTorch 服务循环一次只处理一个请求：分词、prefill、decode 到 EOS、返回。一个用户时没问题。一百个用户时，它就是一队有耐心的人在排着。显而易见的修法 —— 静态批处理 —— 把每个请求填充到窗口里最长的 prompt，把每次 decode 填充到最长的预期输出，然后整批被最慢的序列拖死。你为根本用不上的填充付费，快请求等慢请求。

vLLM 一次解决三个问题。PagedAttention 阻止 KV cache 碎片像经典连续分配那样吃掉 60-80% 的 GPU 内存。Continuous batching 让请求在每次 decode 迭代之间加入和离开批次，于是批次里永远塞满真活儿。Chunked prefill 把一个 32k token 的 prompt 拆成约 512 token 的切片，和 decode 交错跑，于是一个长 prompt 不会把 GPU 上每个 decode token 都冻住。

2026 年的生产默认是三个全开。你得理解每一个干什么，因为故障模式全在调度器上，不在模型上。

## 核心概念

### 把 PagedAttention 看成一套虚拟内存系统

每个序列的 KV cache 是 `num_layers × 2 × num_heads × head_dim × seq_len × bytes_per_element`。对 8192 token 的 Llama 3.3 70B，BF16 下每个序列大约 1.25 GB。如果你给每个请求都预留 8192 个槽位，但平均请求只用 1500 token，你就浪费了约 82% 预留的 HBM。经典批处理在为这份浪费买单。

PagedAttention 借了操作系统虚拟内存的思路。KV cache 不再按序列连续。它按固定大小的 block 分配（默认 16 token）。每个序列有一张 block table，把它的逻辑 token 位置映射到物理 block ID。当一个序列长到超出已分配的 block 时，再加一个 block。它完成时，block 归还到池子里。

碎片率从 60-80%（经典）降到 4% 以下（PagedAttention）。你不用某个 flag 来启用 PagedAttention —— 它是 vLLM 唯一发布的分配器。旋钮是 `--gpu-memory-utilization`（默认 0.9），它告诉 vLLM 在加载权重和激活之后，留多少 HBM 给 KV block。

### 迭代层面的 continuous batching

老的"动态批处理"会等一个窗口（比如 10 ms）把批次填满，然后跑 prefill + decode + decode + decode，直到每个序列都完成。快序列早早离开、闲坐着，等 GPU 把慢的跑完。

Continuous batching 在每个 decode 步之间运作。把正在跑的序列集合叫 `RUNNING` 列表。在每次迭代：

1. `RUNNING` 里任何刚命中 EOS 或 max_tokens 的序列被移除。
2. 调度器看等待队列。如果有空闲的 KV block，它接纳新序列（prefill 或恢复）。
3. forward pass 在此刻 `RUNNING` 里的内容上跑，每个序列吐出一个新 token。

批大小从不被填充到一个固定数字。处在各自输出不同位置的序列共享一次融合的 forward。在 2026 年的 vLLM 里这叫 `V1 scheduler`。关键不变量：调度器每次 decode 迭代跑一次，不是每个请求跑一次。

### Chunked prefill 保护 TTFT 尾部

Prefill 是计算受限的。Llama 3.3 70B 上一个 32k token 的 prompt，在一块 H100 上纯 prefill 要约 800 ms。prefill 在跑的时候，批次里其他每个序列的 decode token 都在等。在一个服务循环里，一个长 prompt 的首 token 延迟（TTFT）变成了几十个其他用户的 token 间延迟（ITL）抖动。

Chunked prefill 把 prefill 拆成固定大小的 chunk（默认 512 token），把每个 chunk 当一个单元来调度。chunk 之间，调度器可以让 decode 序列前进一个 token。你用一点绝对 prefill 延迟代价（每个 chunk 几毫秒）换来低得多的 decode 时抖动。在已发布的基准里，混合负载下 P99 ITL 从约 50 ms 降到约 15 ms。

### 三个默认项相互作用

这三个特性彼此为前提。PagedAttention 给调度器一份细粒度的 KV 资源去权衡。Continuous batching 需要这份细粒度资源，于是接纳一个新序列不会逼出一次全局重排。Chunked prefill 是调度器在同一个 `RUNNING` 列表上做的决策 —— 它是多一条调度策略，不是另一套系统。

你不用知道每个 flag。你要知道调度器优化什么：在 KV block 预算下的 goodput，且受 chunked prefill 切片约束。

### 2026 年 v0.18.0 那个坑

在 vLLM v0.18.0 里，你不能把 `--enable-chunked-prefill` 和草稿模型 speculative decoding（`--speculative-model`）组合在一起。有文档记录的例外是 V1 scheduler 里的 N-gram GPU speculative decoding。不读 release notes 就把所有 flag 全打开的团队，在启动时拿到的是运行时错误，不是悄无声息的回退。如果你的 speculative 收益值得为它开 chunked prefill，重新想想这个选择 —— 2026 年正确的答案常常是用 EAGLE-3 而不开 chunked prefill，而不是一个编译不过的"草稿模型 + chunked prefill"。

### 你该记住的数字

- Llama 3.3 70B FP8、H100 SXM5、128 并发、三个全开：2,200-2,400 tok/s。
- 同模型、默认 vLLM（无 chunked prefill）：~1,800 tok/s。
- 同模型、朴素 PyTorch forward 循环：~600 tok/s。
- 生产负载下 PagedAttention 的 KV 碎片浪费：<4%。
- 混合负载下 P99 ITL：开 chunked prefill ~15 ms，不开 ~50 ms。

### 调度器长什么样

```
while True:
    finished = [s for s in RUNNING if s.is_done()]
    for s in finished: release_blocks(s); RUNNING.remove(s)

    while WAITING and have_free_blocks_for(WAITING[0]):
        s = WAITING.pop(0)
        allocate_initial_blocks(s)
        RUNNING.append(s)

    # 在一个批次里调度 prefill chunk + decode
    batch = []
    for s in RUNNING:
        if s.in_prefill:
            batch.append(next_prefill_chunk(s))   # 例如 512 个 token
        else:
            batch.append(decode_one_token(s))     # 1 个 token

    run_forward(batch)                            # 一次融合的 GPU 调用
```

`code/main.py` 就是用标准库 Python 写的这个循环，带假的 token 计数和假的 forward 延迟。跑一下能看到 chunked prefill 怎么在一次长 prefill 期间让 decode 序列保持存活。

```figure
tensor-parallel
```

## 实际使用

`code/main.py` 模拟一个 vLLM 风格的调度器，特性可开关。跑一下能看到：

- `NAIVE` 模式：一次一个请求，不批处理。
- `STATIC` 模式：填充并等待，经典批处理。
- `CONTINUOUS` 模式：迭代层面的接纳与释放。
- `CONTINUOUS + CHUNKED` 模式：prefill 切片与 decode 交错。

输出展示总吞吐（每虚拟秒的 token）、TTFT 均值和 P99 ITL。`CONTINUOUS + CHUNKED` 这一行在混合流量上应该碾压其他。

## 拿去用

这一课产出 `outputs/skill-vllm-scheduler-reader.md`。给定一份服务配置（批大小、KV 内存利用率、chunked prefill 大小、speculative 配置），它产出一份调度器诊断 —— 指出三个默认项里哪个在卡瓶颈、该调什么。

## 练习

1. 跑 `code/main.py`。在一个长短请求混合的工作负载上对比 `STATIC` 和 `CONTINUOUS`。吞吐差距从哪来 —— prefill 效率、decode 效率，还是尾延迟？
2. 改造这个玩具调度器，加上 `--max-num-batched-tokens`。对一块跑 Llama 3.3 70B FP8 的 H100，正确的值是多少？（提示：它是 KV block 大小和空闲 block 数的函数，不是裸 HBM。）
3. 重读 vLLM v0.18.0 的 release notes。哪些 flag 组合是互斥的？列出来。
4. 对一条 1,000 个请求、平均 1,500 输出 token、标准差 600 token 的 trace，算出 KV cache 碎片浪费，分别在 (a) 按请求连续分配、最大 8192，(b) 16 token block 的 PagedAttention 下。
5. 用一段话解释为什么 chunked prefill 孤立来看帮的是 P99 ITL 而不是吞吐。实践中吞吐的提升从哪来？

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| PagedAttention | "KV 那个把戏" | KV cache 的固定大小 block 分配器；碎片 <4% |
| Block table | "页表" | 每序列的逻辑 token 位置到物理 KV block 的映射 |
| Continuous batching | "动态批处理，但做对了" | 每次 decode 迭代做接纳/释放决策 |
| Chunked prefill | "prefill 切分" | 把长 prefill 拆成 512 token 切片，与 decode 交错 |
| TTFT | "首 token 时间" | prefill + 队列 + 网络；长 prompt 下由 prefill 主导 |
| ITL | "token 间延迟" | 相邻 decode token 之间的时间；由批大小主导 |
| Goodput | "满足 SLO 的吞吐" | 每秒 token 数，且每个请求仍命中 TTFT 和 ITL 目标 |
| V1 scheduler | "新调度器" | vLLM 的 2026 调度器；N-gram spec decode 是与 chunked prefill 兼容的路径 |
| `--gpu-memory-utilization` | "内存旋钮" | 加载权重和激活后留给 KV block 的 HBM 比例 |

## 延伸阅读

- [vLLM documentation — Speculative Decoding](https://docs.vllm.ai/en/latest/features/spec_decode/) —— chunked prefill 与 speculative decoding 兼容性的官方来源。
- [vLLM Release Notes (NVIDIA)](https://docs.nvidia.com/deeplearning/frameworks/vllm-release-notes/index.html) —— 2026 发布节奏与版本特定行为。
- [vLLM Blog — PagedAttention](https://blog.vllm.ai/2023/06/20/vllm.html) —— 至今仍定义了该如何思考分配器的原始文章。
- [PagedAttention paper (arXiv:2309.06180)](https://arxiv.org/abs/2309.06180) —— 碎片分析与调度器设计。
- [Aleksa Gordic — Inside vLLM](https://www.aleksagordic.com/blog/vllm) —— 带火焰图的 V1 scheduler 详解。
