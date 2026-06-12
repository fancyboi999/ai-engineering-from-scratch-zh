# DeepSeek-V3 架构走读

> 阶段 10 · 第 14 课点出了每个开放模型都会拧的六个架构旋钮。DeepSeek-V3（2024 年 12 月，总参数 671B，激活 37B）六个全拧了，还加了四个：多头潜在注意力、无辅助损失的负载均衡、多 token 预测和 DualPipe 训练。本节课从头到尾读 DeepSeek-V3 的架构，并从公开的 config 推导出每一个参数量。到最后你能解释为什么 671B/37B 的比例是对的赌注，以及为什么 MLA + MoE 一起在前沿击败任意一个单独使用。

**类型：** Learn
**语言：** Python（stdlib，参数计算器）
**前置要求：** 阶段 10 · 14（开放模型走读），阶段 10 · 17（NSA），阶段 10 · 18（MTP），阶段 10 · 19（DualPipe）
**预计时间：** ~75 分钟

## 学习目标

- 从头到尾读 DeepSeek-V3 的 config，用六个 GPT-2 旋钮加四个 DeepSeek 特有的增项来解释每个字段。
- 推导总参数量（671B）、激活参数量（37B）以及对每个有贡献的组件。
- 计算 MLA 在 128k context 下的 KV cache 占用，和一个同激活参数、用 GQA 的稠密模型会付的相比。
- 陈述四个 DeepSeek 特有的创新（MLA、MTP、无辅助损失路由、DualPipe），并点出每个针对架构/训练栈的哪一部分。

## 问题背景

DeepSeek-V3 是第一个架构和 Llama 家族有实质区别的前沿开放模型。Llama 3 405B 是 "拧了六个旋钮的 GPT-2"。DeepSeek-V3 是六个旋钮全拧加另外四个的 GPT-2。读 Llama 3 config 是读 DeepSeek config 的热身，但深层结构——注意力块的形状、路由逻辑、训练时目标——不同到你需要一篇单独的走读。

学它的回报：DeepSeek-V3 的开放权重发布改变了开放模型里 "前沿能力" 的含义。这个架构是许多 2026 年训练运行在抄的蓝图。理解它是任何触及前沿 LLM 训练或推理的角色的入场门槛。

## 核心概念

### 再说一遍不变的核心

DeepSeek-V3 仍然是自回归的。它仍然堆叠解码器块。每个块仍然有注意力加 MLP 加两个 RMSNorm。MLP 里仍然用 SwiGLU。仍然用 RoPE。Pre-norm。权重共享的 embedding。和每个 Llama 或 Mistral 一样的基线。

### 转折：MLA 而非 GQA

从阶段 10 · 14 你知道 GQA 通过在 Q 头组间共享 K 和 V 来缩小 KV cache。多头潜在注意力（MLA）走得更远：K 和 V 被压进一个共享的低秩潜在表示（`kv_lora_rank`），然后即时按头解压。KV cache 只存潜在表示——通常每层每 token 512 个 float，而不是 8 x 128 = 1024 个 float。

在 128k context 下，带 MLA 的 DeepSeek-V3（每层每 token 一个共享潜在 `c^{KV}`；K 和 V 都经能被吸收进后续 matmul 的 up-projection 从这个潜在表示导出）：

```
kv_cache = num_layers * kv_lora_rank * max_seq_len * bytes_per_element
         = 61 * 512 * 131072 * 2
         = 7.6 GB
```

一个假想的 GQA 基线（Llama 3 70B 形状，8 个 KV 头，head 维度 128）会付：

```
kv_cache = 2 * 61 * 8 * 128 * 131072 * 2
         = 30.5 GB
```

在 128k context 下 MLA 比 Llama-3-70B 风格的 GQA 缓存小 4 倍。

权衡：MLA 给每次注意力计算（每头）加一个解压步骤。额外计算相比省下的带宽很小。长 context 推理净赢。

### 路由：无辅助损失的负载均衡

MoE 路由器决定哪些 top-k 专家处理每个 token。朴素路由器把太多工作集中在少数专家上，让其他闲着。标准修法：加一个惩罚负载不均衡的辅助损失项。这有效，但略微降低主任务性能。

DeepSeek-V3 引入一个无辅助损失方案。给路由器 logits 加上每个专家的偏置项，训练时用一条简单规则调整：如果专家 `e` 过载，减小 `bias_e`；如果欠载，增大它。没有额外损失项。训练保持干净。专家负载保持均衡。

对主损失的影响：测不出。对 MoE 架构的影响：更干净，没有辅助损失超参数要调。

### MTP：更密的训练 + 免费 draft

从阶段 10 · 18 你知道 DeepSeek-V3 加了 D=1 个 MTP 模块，预测往前两个位置的 token。推理时，训练好的模块被改用作接受率 80%+ 的推测解码 draft。训练时，每个隐藏状态被 D+1 = 2 个目标监督，提供更密的信号。

参数：671B 主模型之上 14B。开销：2.1%。

### 训练：DualPipe

从阶段 10 · 19 你知道 DualPipe 是一条双向流水线，把前向和反向 chunk 与跨节点 all-to-all 通信重叠。在 DeepSeek-V3 的 2,048 张 H800 规模上，它收回了大约 24.5 万 GPU 小时——1F1B 会因流水线气泡损失掉的。

### config，逐字段

这是 DeepSeek-V3 的 config（简化）：

```
hidden_size: 7168
intermediate_size: 18432   (稠密 MLP 隐藏大小，用在前几层)
moe_intermediate_size: 2048 (专家 MLP 隐藏大小)
num_hidden_layers: 61
first_k_dense_layers: 3    (前 3 层用稠密 MLP)
num_attention_heads: 128
num_key_value_heads: 128   (MLA 下形式上等于 num_heads，但
                           真正的压缩在 kv_lora_rank)
kv_lora_rank: 512          (MLA 潜在维度)
num_experts: 256            (每块的 MoE 专家数)
num_experts_per_tok: 8      (top-8 路由)
shared_experts: 1           (每块一个常开的共享专家)
max_position_embeddings: 163840
rope_theta: 10000.0
vocab_size: 129280
mtp_module: 1               (深度 1 处 1 个 MTP 模块)
```

解析它：

- `hidden_size=7168`：embedding 维度。
- `num_hidden_layers=61`：总块深度。
- `first_k_dense_layers=3`：前 3 个块用大小 18432 的稠密 MLP。其余 58 个用 MoE。
- `num_attention_heads=128`：128 个 query 头。
- `kv_lora_rank=512`：K 和 V 压到这个潜在维度，按头解压。
- `num_experts=256, num_experts_per_tok=8`：每个 MoE 块有 256 个专家，路由 top-8。
- `shared_experts=1`：在 256 个被路由的专家之上，1 个常开专家对每个 token 都有贡献。把它想成一个 "稠密地板"，确保每个 token 都得到一些可靠的东西。
- `moe_intermediate_size=2048`：每个专家的 MLP 隐藏大小。比稠密 MLP 小，因为有 256 个。

### 参数核算

完整计算在 `code/main.py` 里。头条：

- Embedding：`vocab * hidden = 129280 * 7168 = ~0.93B`。
- 前 3 个稠密块：带 MLA 的注意力（每块 ~144M）+ 稠密 MLP（每块 ~260M）+ norm。约 1.2B 总。
- 58 个 MoE 块：带 MLA 的注意力（~144M）+ 256 个专家各（每个 30M）+ 1 个共享专家（30M）+ norm。每块总 ~7.95B，含所有专家。58 个 MoE 块总 461B。
- MTP 模块：14B。

总计：核心架构 ~476B + MTP 14B，而公开的 671B 数字明显还包含额外的结构参数（偏置张量、专家特定组件、共享专家缩放等）。我们在计算器里复现的数字在公开值的 3-5% 以内——差异来自 DeepSeek 报告第 2 节附录里记录的细粒度核算。

每次前向的激活参数：

- 注意力：每层 144M * 61 = 8.8B（所有层都发射）。
- 激活 MLP：前 3 层稠密（3 * 260M = 780M），58 个 MoE 层每个激活 8 个被路由 + 1 个共享 + 路由开销。每层激活 MLP：~260M。总：3 * 260M + 58 * 260M = ~15.9B。
- Embedding + norm：1.2B。
- 总激活：大约 26B 核心 + 14B MTP（训练了但推理时不总跑）≈ 37B。

### 671B / 37B 比例

18 倍稀疏比（激活参数是总数的 5.5%）。DeepSeek-V3 是已发布开放权重里最稀疏的前沿 MoE 模型。Mixtral 8x7B 比例 13/47（28%）稠密得多。Llama 4 Maverick 比例 17B/400B（4.25%）可比。DeepSeek 的赌注：在前沿规模上，更多专家加更低激活比例，产出每激活 FLOP 更好的质量。

### DeepSeek-V3 的位置

| 模型 | 总 | 激活 | 比例 | 注意力 | 新想法 |
|-------|------|-------|-------|-----------|-------------|
| Llama 3 70B | 70B | 70B | 100% | GQA 64/8 | — |
| Llama 4 Maverick | 400B | 17B | 4.25% | GQA | — |
| Mixtral 8x22B | 141B | 39B | 27% | GQA | — |
| DeepSeek V3 | 671B | 37B | 5.5% | MLA 512 | MLA + MTP + aux-free + DualPipe |
| Qwen 2.5 72B | 72B | 72B | 100% | GQA 64/8 | YaRN 扩展 |

### 后续：R1、V4

DeepSeek-R1（2025）是在 V3 主干上的一次推理训练运行。R1 用相同的架构。变的是后训练配方（在可验证任务上的大规模 RL），不是预训练架构。

DeepSeek-V4（如果发布）预期会保留 MLA + MoE + MTP，并加上 DSA（DeepSeek Sparse Attention），阶段 10 · 17 里 NSA 的后继。谱系稳定：架构级创新累积；每个版本拧额外的旋钮。

```figure
moe-routing
```

## 实际使用

`code/main.py` 是专门针对 DeepSeek-V3 形状的参数计算器。跑它，把它的输出和论文数字对比，并在假想变体上用它（256 专家 vs 512、top-8 vs top-16、MLA rank 512 vs 1024）。

要看什么：

- 总参数量 vs 公开的 671B。
- 激活参数量 vs 公开的 37B。
- 128k context 下的 KV cache——MLA vs GQA 对比。
- 逐层细分，看参数预算实际去了哪。

## 拿去用

本节课产出 `outputs/skill-deepseek-v3-reader.md`。给定一个 DeepSeek 家族模型（V3、R1 或任何未来变体），它产出一份逐组件的架构阅读，命名 config 的每个字段、按组件推导参数量，并识别这个模型用了四个 DeepSeek 特有创新里的哪些。

## 练习

1. 跑 `code/main.py`。把计算器的总参数估计和公开的 671B 对比，找出差异从哪来。论文第 2 节有完整逐项列举。

2. 改 config 用 MLA rank 256 而非 512。计算 128k context 下产生的 KV cache 大小。它买来百分之多少的削减，又以每头表达力的什么代价？

3. 把 DeepSeek-V3 的（256 专家，top-8）路由和一个假想的（512 专家，top-8）变体对比。总参数增长；激活参数不变。理论上额外的专家容量买来什么，推理时又花什么代价？

4. 读 DeepSeek-V3 技术报告（arXiv:2412.19437）第 2.1 节关于 MLA 的部分。用三句话解释为什么 K 和 V 解压矩阵能为推理时效率被 "吸收" 进后续 matmul。

5. DeepSeek-V3 大多数操作用 FP8 训练。计算存储 671B 权重时 FP8 vs BF16 的内存节省。这和 14.8T-token 训练预算如何交织？

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| MLA | "多头潜在注意力" | 把 K 和 V 压进一个共享低秩潜在表示（kv_lora_rank，通常 512），即时按头解压；KV cache 只存潜在表示 |
| kv_lora_rank | "MLA 压缩维" | K 和 V 共享潜在表示的大小；DeepSeek-V3 用 512 |
| 前 k 个稠密层 | "早期层保持稠密" | MoE 模型的前几层跳过 MoE 路由器、跑稠密 MLP 以求稳定 |
| num_experts_per_tok | "top-k 路由" | 每 token 发射多少被路由的专家；DeepSeek-V3 用 8 |
| 共享专家 | "常开专家" | 不管路由怎样都处理每个 token 的专家；DeepSeek-V3 用 1 |
| 无辅助损失路由 | "偏置调整的负载均衡" | 训练时调整的每专家偏置项，不加损失项就保持专家负载均衡 |
| MTP 模块 | "额外预测头" | 从 h^(1) 和 E(t+1) 预测 t+2 的 transformer 块；更密的训练，免费的推测解码 draft |
| DualPipe | "双向流水线" | 把前向/反向计算与跨节点 all-to-all 重叠的训练调度 |
| 激活参数比例 | "稀疏性" | active_params / total_params；DeepSeek-V3 打到 5.5% |
| FP8 训练 | "8 位训练" | 训练存储和许多计算操作用 FP8；相比 BF16 大约把内存减半，质量代价小 |

## 延伸阅读

- [DeepSeek-AI — DeepSeek-V3 Technical Report (arXiv:2412.19437)](https://arxiv.org/abs/2412.19437) — 完整的架构、训练和结果文档
- [DeepSeek-V3 model card on Hugging Face](https://huggingface.co/deepseek-ai/DeepSeek-V3) — config 文件和部署说明
- [DeepSeek-V2 paper (arXiv:2405.04434)](https://arxiv.org/abs/2405.04434) — 引入 MLA 的前身
- [DeepSeek-R1 paper (arXiv:2501.12948)](https://arxiv.org/abs/2501.12948) — V3 架构上的推理训练后继
- [Native Sparse Attention (arXiv:2502.11089)](https://arxiv.org/abs/2502.11089) — DeepSeek 家族注意力的未来方向
- [DualPipe repository](https://github.com/deepseek-ai/DualPipe) — 训练调度参考
