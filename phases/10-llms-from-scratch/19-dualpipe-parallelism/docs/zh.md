# DualPipe 并行

> DeepSeek-V3 在 2,048 张 H800 GPU 上训练，MoE 专家散布在各节点。跨节点专家 all-to-all 通信，每 1 GPU 小时计算就配 1 GPU 小时通信。GPU 一半时间闲着。DualPipe（DeepSeek，2024 年 12 月）是一条双向流水线，把前向和反向计算与它们触发的 all-to-all 通信重叠起来。气泡下降，吞吐攀升，而保留两份模型参数拷贝（给它命名的那个 "dual"）在专家并行本来就已经把专家散到各 rank 上之后是廉价的。本节课是一篇 Learn 型走读，讲 DualPipe 究竟做什么，以及为什么 Sea AI Lab 的 DualPipeV 改进以略微更紧的气泡为代价去掉了 2 倍参数成本。

**类型：** Learn
**语言：** Python（stdlib，调度模拟器）
**前置要求：** 阶段 10 · 05（分布式训练、FSDP、DeepSpeed），阶段 10 · 14（开放模型架构和 MoE）
**预计时间：** ~60 分钟

## 学习目标

- 说出一个 DualPipe 前向-反向 chunk 的四个组件，以及为什么每个都有自己的重叠窗口。
- 解释规模上的流水线气泡问题，以及实践中 vs 营销话术中 "无气泡" 是什么意思。
- 为 8 个 PP rank 和 16 个微批次手工追踪一个 DualPipe 调度，确认前向流和反向流填满彼此的空闲槽位。
- 陈述 DualPipeV（Sea AI Lab，2025）做的权衡：去掉 2 倍参数复制，代价是专家并行不活跃时气泡略大。

## 问题背景

在 2k 张 H800 GPU 上训练一个 671B MoE 模型撞上三个复合瓶颈：

1. **内存压力。** 每张 GPU 持有模型的一个切片。序列 8k、61 层、128 头下的激活内存巨大。
2. **流水线气泡。** 传统流水线并行（GPipe、1F1B）让 GPU 在等它阶段的输入或梯度时闲着。8 个阶段时，即使用 1F1B 调度，大约 12% 的 GPU 时间也可能是气泡。
3. **跨节点 all-to-all。** 带专家并行的 MoE 把专家散到各节点。每次前向触发一次 all-to-all 把 token 分派给它们的专家，再来一次去合并。在 2k 张 GPU 上这轻易变成 1:1 的计算对通信比。

这些各有单独的解：内存用梯度检查点，流水线气泡用 Zero Bubble（Sea AI Lab，2023），all-to-all 用专家并行通信核。DualPipe 做的是让它们协同。这套调度在单个前向-反向 chunk 内重叠计算和通信，从流水线两端同时注入微批次，并用得到的调度把 all-to-all 藏进计算窗口里。

报告结果：流水线气泡近乎消除，DeepSeek-V3 14.8T-token 训练运行中 GPU 利用率超过 95%。

## 核心概念

### 流水线并行回顾

把一个 N 层模型切到 P 个设备上。设备 `i` 持有层 `i * N/P .. (i+1) * N/P - 1`。一个微批次前向流过设备 0 到 P-1，然后从 P-1 反向到 0。每个设备只有在前一个设备发来它的输出时才能开始前向阶段，只有下游设备发来上游梯度时才能开始反向。

GPipe（Huang et al., 2019）一次调度一个微批次，浪费了大部分 GPU 时间。1F1B（Narayanan et al., 2021）为多个微批次交错前向和反向传播。Zero Bubble（Qi et al., 2023）把反向传播切成两部分——对输入的反向（B）和对权重的反向（W）——并调度它们去填气泡。Zero Bubble 之后，流水线几乎紧凑了。

DualPipe 是下一步。它在之上加了两个想法：

### 想法 1：chunk 分解

每个前向 chunk 被切成四个组件：

- **注意力。** Q/K/V 投影、注意力、输出投影。
- **All-to-all 分派。** 把 token 发给它们专家的跨节点通信。
- **MLP。** MoE 专家计算。
- **All-to-all 合并。** 把专家输出带回来的跨节点通信。

一个反向 chunk 给这些每个加上梯度版本。DualPipe 调度它们，使 all-to-all 分派和下一个 chunk 的注意力计算并行发生，all-to-all 合并和再下一个 chunk 的 MLP 计算并行发生。

### 想法 2：双向调度

大多数流水线调度从阶段 0 注入微批次、流向阶段 P-1。DualPipe 从 *两端* 注入微批次。阶段 0 看到源于它的前向微批次；阶段 P-1 也看到源于它的前向微批次。两股流在中间相遇。

要让这工作，设备 `i` 必须 *同时* 持有早期流水线层 `i` *和* 晚期流水线层 `P - 1 - i`。那就是 DualPipe 里 "dual" 的部分：每个设备保留它需要服务的模型层的两份拷贝（每个方向一份）。在 DeepSeek-V3 的规模上，这是 2 倍参数复制成本。它负担得起，因为专家并行已经把 MoE 专家摊得那么薄，把非专家层复制两次只是小菜。

关键的是，一个方向的前向流和另一个方向的反向流，恰好在单方向调度里会出现气泡的地方重叠。气泡消失了。

### 手工追踪的调度

考虑 P = 4 个 rank、8 个微批次，分 4 前向 / 4 反向。时间从左到右移动；行是设备 rank。

```
           Time →
rank 0:  F1 F2 F3 F4  F5R F6R F7R F8R  B1 B2 B3 B4  ...
rank 1:     F1 F2 F3  F4/F5R F6R F7R   B1 B2 ...
rank 2:        F1 F2  F3/F5R F4/F6R    B1 ...
rank 3:           F1  F2/F5R F3/F6R    ...
```

读 "F4/F5R" 这个记法：rank 1 在同一个时间槽里同时跑微批次 4 的前向（在流水线里从左到右走）*和* 微批次 5 的前向（从右到左走）。这就是 "双向" 在操作上的意思。

在 rank 2，交叉流更早重叠；在 rank 0 和 P-1，它们最晚重叠。在调度的稳定中段，每个 rank 都跑某方向的前向、和另一方向的反向重叠。计算忙着。前向的 all-to-all 分派藏进反向计算里。all-to-all 合并藏进前向计算里。气泡被挤出去了。

### 气泡核算

标准 1F1B 流水线气泡（每 rank 浪费的时间）：

```
bubble_1F1B = (P - 1) * forward_chunk_time
```

Zero Bubble 改进把它降下来但不到零。DualPipe 在稳定阶段，如果微批次数能被 2 倍流水线深度整除，就有零气泡。稳定阶段之外（预热和冷却），有一些气泡，但它不随微批次数增长——论文强调的一个关键性质。

营销话术里："无气泡"。技术话术里：气泡不随微批次数增长。Sea AI Lab 的后续分析（DualPipeV / Cut-in-half）表明，只有当专家并行不是瓶颈时才有完全的零气泡；有 EP 驱动的 all-to-all 时，总有一些调度妥协。

### DualPipeV —— 改进

Sea AI Lab（2025）观察到，当 EP 通信重叠不是重点时，2 倍参数复制是浪费的。他们的 DualPipeV 调度把双向注入折成一个 "V 形" 调度，在单份参数拷贝上运行。气泡比 DualPipe 的略大，但内存节省可观。DeepSeek 在他们开源的 DualPipe 实现里把 DualPipeV 采纳为一个 EP-off 模式。

权衡：

| 特性 | DualPipe | DualPipeV | 1F1B | Zero Bubble |
|---------|---------|-----------|------|------------|
| 每设备参数拷贝 | 2 | 1 | 1 | 1 |
| 气泡 vs 微批次 | 恒定 | 小幅增长 | 增长 | 增长 |
| 计算-通信重叠 | 完全 | 部分 | 极少 | 部分 |
| 何时用 | EP 重的 MoE | 稠密或 EP 轻 | 基线 | 任何流水线 |

### 它对一次 14.8T-token 运行意味着什么

DeepSeek-V3 的预训练在 2,048 张 H800 GPU 上消耗 14.8T token，约 280 万 GPU 小时。用朴素 1F1B，他们会因流水线气泡损失其中 12-15%——34 万到 42 万 GPU 小时，够训练一个完整的 70B 模型。DualPipe 收回了其中大部分。没有内部日志很难直接量化贡献，但论文里的说法是训练全程平均 GPU 利用率超过 95%。

对更小的运行（1k 张 GPU 以下），DualPipe 是杀鸡用牛刀——流水线气泡相对总成本更小，稠密模型训练很少撞上 all-to-all 瓶颈。对多千张 GPU 规模的前沿 MoE 训练，它实际上是必需的。

### 它在栈里的位置

- 和 **FSDP**（阶段 10 · 05）互补。FSDP 把模型参数分片到各 rank；DualPipe 把计算调度到各 rank。它们结合。
- 和 **ZeRO-3** 梯度分片兼容。两拷贝复制的记账需要和 ZeRO 的分片梯度协作。
- 需要为具体集群拓扑调过的 **自定义 all-to-all 核**。DeepSeek 的开源核是参考实现。

```figure
expert-capacity
```

## 实际使用

`code/main.py` 是一个流水线调度模拟器。它接收 `(P, n_micro_batches, schedule)`，为 1F1B、Zero Bubble、DualPipe 和 DualPipeV 各打印稳定阶段利用率。它是个教学工具——数字匹配论文里的定性说法，不是对生产实测加速的断言。

模拟器的价值：用不同的 P 和微批次数跑它，看气泡占比对 1F1B 增长而对 DualPipe 不增长。

真实训练运行的集成考量：

- 选一个能干净整除你微批次数的流水线并行深度。
- 确保你的专家并行 mesh 支持双向 all-to-all。DeepSeek 的核是参考。
- 第一次预期在调度本身上烧掉一周调试时间。记账很麻烦。
- 监控每 rank 的 GPU 利用率，不只是聚合。DualPipe 的收益来自收紧那些拖后腿的。

## 拿去用

本节课产出 `outputs/skill-dualpipe-planner.md`。给定一份训练集群规格（GPU 数、拓扑、互联、模型形状），它推荐一个流水线并行策略、要用的调度算法和目标规模上的预期气泡占比。

## 练习

1. 在 `(P=8, micro_batches=16, schedule=dualpipe)` 和 `(P=8, micro_batches=16, schedule=1f1b)` 上跑 `code/main.py`。计算 GPU 利用率差，并把它表达为每百万 token 训练收回的 GPU 小时。

2. 手工画出 `(P=4, micro_batches=8, schedule=dualpipe)` 的调度表。给每个时间槽标上微批次 ID 和方向。找出第一个气泡消失的时间槽。

3. 读 DeepSeek-V3 技术报告（arXiv:2412.19437）的图 5。识别一个 DualPipe 前向 chunk 内 all-to-all 分派的重叠窗口。解释计算调度如何把它藏起来。

4. 为一个 P=8 流水线阶段的 70B 稠密模型和一个 P=16 流水线阶段的 671B MoE 模型计算 DualPipe 的 2 倍参数开销。展示为什么 MoE 情况的开销按比例更小（大多数参数是专家，被分片到一个大的 EP 组上）。

5. 把 DualPipe 和 Chimera（2021 年的一个竞争双向调度器）对比。用论文第 3.4 节作参考，识别 DualPipe 加的、Chimera 没有的两个具体性质。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| 流水线气泡 | "每 rank 的空闲时间" | 因为一个流水线阶段在等它的输入或梯度而浪费的 GPU 周期 |
| 1F1B | "默认流水线调度" | 一前向 / 一反向交错的调度；DualPipe 击败的基线 |
| Zero Bubble | "Sea AI Lab 2023" | 把反向切成 B（输入梯度）和 W（权重梯度）；几乎完全收紧流水线 |
| DualPipe | "DeepSeek-V3 调度" | 双向流水线 + 计算-通信重叠；气泡不随微批次数增长 |
| DualPipeV | "Cut-in-half" | V 形改进，以气泡略大为代价去掉 2 倍参数复制 |
| Chunk | "流水线工作单元" | 一个微批次经一个流水线阶段的一次前向或反向传播 |
| All-to-all 分派 | "把 token 发给专家" | 把 token 路由到它们指定的 MoE 专家的跨节点通信 |
| All-to-all 合并 | "把专家输出带回来" | MLP 之后收集专家输出的跨节点通信 |
| 专家并行（EP） | "专家跨 GPU" | 把 MoE 专家分片到各 rank，让不同 GPU 持有不同专家 |
| 流水线并行（PP） | "层跨 GPU" | 把模型层分片到各 rank；DualPipe 调度的那个维度 |
| 气泡占比 | "浪费的 GPU 时间" | (bubble_time / total_time)；DualPipe 驱向零的那个占比 |

## 延伸阅读

- [DeepSeek-AI — DeepSeek-V3 Technical Report (arXiv:2412.19437), Section 3.3.2 and Figure 5](https://arxiv.org/abs/2412.19437) — 主要的 DualPipe 参考
- [DeepSeek — DualPipe GitHub repository](https://github.com/deepseek-ai/DualPipe) — 开源参考实现，含 DualPipeV（Cut-in-half）模式
- [Qi et al. — Zero Bubble Pipeline Parallelism (arXiv:2401.10241, Sea AI Lab 2023)](https://arxiv.org/abs/2401.10241) — Zero Bubble 前身
- [Sea AI Lab — DualPipe could be better without the Dual](https://sail.sea.com/blog/articles/63) — 启发 DeepSeek EP-off 模式的 DualPipeV 分析
- [Narayanan et al. — PipeDream / 1F1B (arXiv:1806.03377, 2018-2021)](https://arxiv.org/abs/1806.03377) — DualPipe 对比的 1F1B 调度
- [Huang et al. — GPipe (arXiv:1811.06965, 2018)](https://arxiv.org/abs/1811.06965) — 最初的流水线并行论文和气泡问题
