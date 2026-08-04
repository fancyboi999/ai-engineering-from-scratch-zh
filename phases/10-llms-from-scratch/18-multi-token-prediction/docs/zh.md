# 多 token 预测（MTP）

> 从 GPT-2 到 Llama 3，每个自回归 LLM 每个位置训练一个损失：预测下一个 token。DeepSeek-V3 每个位置加了第二个损失：预测再下一个 token。那额外的 14B 参数（在一个 671B 模型上）通过梯度流被蒸馏回主模型，训练好的 MTP 头在推理时被改用作推测解码的起草器，接受率 80%+。1.8 倍生成吞吐白送。本节课构建 DeepSeek 技术报告里的顺序 MTP 模块，计算损失和共享头的参数布局，并解释为什么 MTP 保住了因果链，而 Gloeckle et al. 最初的并行 MTP 打断了它。

**类型：** Build
**语言：** Python（stdlib）
**前置要求：** 阶段 10 · 04（预训练一个 mini GPT），阶段 10 · 15（推测解码）
**预计时间：** ~60 分钟

## 学习目标

- 陈述 MTP 训练目标，并推导跨预测深度的联合损失。
- 解释 Gloeckle et al. 的并行 MTP 头（2024）和 DeepSeek-V3 的顺序 MTP 模块之间的区别，以及为什么顺序设计保住了因果链。
- 计算给一次预训练运行加 MTP 模块的参数和内存开销。
- 从零实现一个 MTP 模块：共享 embedding、按深度的 transformer 块、投影和共享输出头。

## 问题背景

下一个 token 预测是标准 LLM 训练目标。每个隐藏状态都被监督去预测恰好一件事：紧随其后的 token。那是个出奇地弱的信号。序列里大多数信息延伸超过一个 token——结构、连贯、事实性、算术流。模型不得不靠在万亿 token 上累积许多一个 token 的信号来学这些。

MTP 问：要是每个隐藏状态都被监督去一次预测多个未来 token 呢？Gloeckle et al.（Meta，2024）表明这有帮助。他们的实现在主干上放几个独立输出头，每个预测一个不同偏移。并行、简单，但这些头看到相同的隐藏状态、没有任何层次精炼——而且预测之间不因果链接，所以它们不能用于推测解码。

DeepSeek-V3（2024 年 12 月）把 MTP 重新设计成顺序模块，在每个预测深度保住因果链。模型从 `h_i^(0)` 预测 `t+1`，然后从一个把 `h_i^(0)` 和 `E(t+1)` embedding 结合的新隐藏状态 `h_i^(1)` 预测 `t+2`，依此类推。每个深度是它自己的一个小 transformer 块。共享 embedding 和共享输出头让参数开销适中。在 DeepSeek-V3 的规模上，671B 主模型权重之上跨 MTP 模块的 14B 额外参数。那 2% 的开销买来了更密的训练信号 *和* 一个推理时现成的推测解码 draft。

本节课从零构建单个 MTP 模块和 D 深度损失。数学很干净。实现 150 行。

## 核心概念

### 顺序 MTP 配方

DeepSeek-V3 在主模型之上加 `D` 个 MTP 模块。每个模块 `k`（`k = 1..D`）预测深度 `k` 的 token——也就是给定到位置 `i` 的前缀时的 `t_{i+k}`。

模块 `k` 由以下组成：

- 一个 transformer 块 `T_k`，有它自己的注意力和 MLP。
- 一个投影矩阵 `M_k`，把上一深度的隐藏状态和下一深度真值 token 的 embedding 结合。
- 共享 embedding `E`（和主模型相同）。
- 共享输出头 `Out`（和主模型相同）。

训练时，对到位置 `i` 的前缀，按深度的隐藏状态是：

```
h_i^(0) = main model backbone at position i
h_i^(k) = T_k( M_k * concat(RMSNorm(h_i^(k-1)), RMSNorm(E(t_{i+k}))) )   for k >= 1
```

按深度的预测是：

```
logits_{i+k} = Out(h_i^(k-1))   for k = 1..D
```

按深度的损失是对真值 `t_{i+k}` 的交叉熵：

```
L_k = CE(logits_{i+k}, t_{i+k})
```

跨深度的联合损失：

```
L_MTP = (lambda / D) * sum_{k=1..D} L_k
```

`lambda` 是一个小加权因子——DeepSeek-V3 在训练前 10% 用 0.3，之后用 0.1。总训练损失是 `L_main + L_MTP`。

### 为什么顺序，而非并行

Gloeckle 最初的并行 MTP 有 D 个输出头，每个直接应用在 `h_i^(0)` 上。每个头从同一个主干隐藏状态预测 `t_{i+k}`。那训练没问题，但预测彼此不以对方为条件。你没法用 `head_1` 的输出来帮 `head_2`——这些头并行发射。

DeepSeek-V3 的顺序设计从 `h_i^(k-1)` 加上实际的下一个 token embedding `E(t_{i+k})` 构建 `h_i^(k)`。那保住了因果链：要预测 `t_{i+k+1}`，深度 `k+1` 的模块看到的是 `t_{i+k}` 处的东西。这在结构上和一个自回归解码器消费自己的输出一模一样——使 MTP 模块能直接用作推测解码的起草器。

推理时：把 `h_i^(k-1)` 和起草的 `t_{i+k}` 喂进模块 `k+1`，得到 `t_{i+k+1}` 的预测。重复。那正是一个 EAGLE 风格的 draft，用训练好的 MTP 模块作为 draft 网络。DeepSeek-V3 报告第一个 MTP 模块上 80%+ 的接受率和约 1.8 倍加速。

### 参数核算

对一个 hidden 为 `h`、词表为 `V` 的模型：

- 主模型：数十亿参数，加一个大小为 `V * h` 的输出头。
- 共享输出头：复用主模型的头。无额外参数。
- 共享 embedding：复用主模型的 embedding。无额外参数。
- 每个 MTP 模块：
  - 投影 `M_k`：`(2h) * h = 2h^2`。
  - transformer 块 `T_k`：注意力（MHA 的 `4h^2`）加 MLP（SwiGLU 比率 8/3 时通常 `8h^2`）。每块约 `12h^2`。

每模块总额外：`~14h^2`。对 DeepSeek-V3 的 `h = 7168`、D = 1 个模块：纸面上 `~14 * 7168^2 = ~720M` 参数。DeepSeek-V3 报告 14B——差异主要是 MTP 模块里的专家层也是 MoE。

### 推测解码的回报

预训练时，MTP 模块让训练慢约 10%（更多前向计算、额外损失）。回报有两方面：

1. 更密的训练信号。每个隐藏状态看到 D+1 个监督目标。在 MMLU、GSM8K、MATH、HumanEval 上的实测效果：在 DeepSeek-V3 的消融里一致的几个百分点提升。

2. 推理时免费的推测解码 draft。MTP 模块已经训练成预测接下来几个 token。改用作 draft 网络，它交付 80%+ 的接受率。在那个水平上，N=3 或 N=5 的 spec decoding 给 1.8 倍吞吐。10% 的训练时成本在你第一次跑推理时就回本了。

### 和 EAGLE 的关系

EAGLE 在预训练 *之后* 单独训练一个小 draft 模型。MTP 把 draft 烤进预训练。两种方法收敛到相似的接受率，但经由不同的流水线：

| 维度 | EAGLE-3 | MTP（DeepSeek-V3） |
|-----------|---------|------------------|
| 何时训练 | 预训练之后 | 预训练期间 |
| 和现有权重向后兼容 | 是 | 否（需要重训） |
| Draft 参数 | 1-2 个 transformer 层 | 1 个 transformer 块 + 投影 |
| 接受率 | 0.88-0.92 | 深度 1 处 0.80+ |
| 加速之外的收益 | 仅推测解码 | 更密的训练信号 + 加速 |

```figure
multi-token-predict
```

## 动手构建

`code/main.py` 端到端构建单个 MTP 模块：共享 embedding、投影、transformer 块、共享输出头。然后它在一个短合成序列上计算按深度的交叉熵损失，并按组件打印参数量。一个 32 token 的玩具词表让数字可读。

### 第 1 步：共享 embedding 表

一张 `vocab_size x hidden` 的表被主模型 *和* 每个 MTP 模块在每个深度使用。不是第二份拷贝——字面上是同一个张量。

### 第 2 步：按深度的组合

```python
def combine(prev_hidden, next_token_embed, M_k):
    # concat along feature dim, then project down to hidden
    concat = rms_norm(prev_hidden) + rms_norm(next_token_embed)  # 向量加法替身
    projected = matvec(M_k, concat)
    return projected
```

真实 DeepSeek-V3 把两个 RMSNorm 后的向量拼接成 `[2h]`，用一个 `h x 2h` 矩阵投影。玩具为 stdlib 简洁用向量加法。

### 第 3 步：深度 k 处的 transformer 块

自注意力加 MLP。玩具里，一个一层线性注意力块和一个 SwiGLU MLP 让结构可见而不用 numpy。

### 第 4 步：共享输出头

复用主模型的输出投影。词表上的 logits。

### 第 5 步：按深度损失

softmax(logits) 对偏移 `k` 处真值 token 的交叉熵。用 `lambda / D` 缩放因子跨深度聚合。

### 第 6 步：参数核算

打印总参数量、共享（embedding、头）数量和每模块额外数量。展示 MTP 额外对主模型大小的比率。

## 实际使用

MTP 集成在 DeepSeek-V3（2024 年 12 月）和 DeepSeek-R1 系列里。推理时：

- DeepSeek 自己的服务栈开箱即把 MTP 模块当作推测解码器消费。
- 截至 2026 年 4 月，vLLM 和 SGLang 有 DeepSeek-V3 MTP 的集成路径。
- AMD 的 ROCm SGLang 教程展示了一个具体的 MTP 推测解码配置，在 V3 checkpoint 上实测 1.8 倍加速。

什么时候在新预训练运行里用 MTP：

- 你控制完整的预训练流水线，想攒下更密的训练信号。
- 你知道你会大规模服务这个模型，想要免费的推测解码。
- 你的 hidden size 至少 4096。在 1B 规模上开销带来的伤害大于增益带来的帮助。

什么时候不用：

- 微调一个现有的预训练稠密模型。MTP 模块没被训练。
- 你想要一个干净基线来对比的研究模型。MTP 改变了架构。

## 拿去用

本节课产出 `outputs/skill-mtp-planner.md`。给定一份预训练运行规格（模型大小、数据、算力），它返回一份集成 MTP 的计划：深度数 D、`lambda` 调度、内存开销和推理时的推测解码接线。

## 练习

1. 跑 `code/main.py`。展示随合成信号增强，按深度损失单调下降。改合成用一个固定模式，验证深度 1 和深度 2 的损失都收敛。

2. 为一个稠密 70B 模型（hidden 8192，80 层）配 D=1 MTP 模块计算参数开销。和 DeepSeek-V3 报告的 14B 开销对比。解释为什么 DeepSeek 的数字更高：MTP transformer 块继承了相同的 MoE 结构，膨胀了每模块参数量。

3. 在玩具里实现 D=2：加第二个 MTP 模块，接收 h^(1) 并预测 `t_{i+2}`。验证联合损失和参数核算匹配 DeepSeek 论文的方程 19-21。

4. 把玩具切换成并行 MTP（Gloeckle 风格）：在主隐藏状态之上加 D 个输出头，每个预测一个不同偏移。测量按深度损失在同一合成信号上和顺序版本如何比较。顺序版本对 k > 1 应该产出更低的深度 k 损失，因为它以中间预测为条件。

5. 把训练好的 MTP 模块用作 EAGLE 风格的 draft：推理时调用模块 k 来提议 `t_{i+k}`。在一个留出序列上测量这些 draft token 对主模型预测的接受率。如果你在玩具上打到 50%+，你就复现了 MTP-作-draft 的经验性质。

## 关键术语

| 术语 | 人们怎么说 | 它实际是什么 |
|------|----------------|------------------------|
| MTP 模块 | "额外损失块" | 一个小 transformer 块加投影，预测主模型之前 `k` 个位置的一个 token |
| 预测深度 | "哪个偏移" | 整数 `k`，使模块 `k` 从到位置 `i` 的前缀预测 `t_{i+k}` |
| 并行 MTP | "Gloeckle 风格" | 同一主干隐藏状态上的 D 个独立头，无条件链 |
| 顺序 MTP | "DeepSeek-V3 风格" | 每个模块以上一深度的隐藏状态加下一个 token 的 embedding 为条件；保住因果链 |
| 共享输出头 | "复用主头" | MTP 模块调用主模型的 LM 头，不是单独的输出投影 |
| 共享 embedding | "复用主表" | 到处用同一张词表 embedding 表；无重复参数 |
| 投影矩阵 M_k | "结合隐藏 + 下一个 token" | 一个 `h x 2h` 线性层，把上一隐藏状态和目标 token embedding 折进下一深度的输入 |
| 联合损失 L_MTP | "平均后的额外损失" | 按深度交叉熵损失的算术平均，按 `lambda` 缩放 |
| 深度 1 处的接受率 | "MTP draft 多常对" | D=1 MTP 模块的 top-1 预测等于主模型 top-1 预测的比率；DeepSeek-V3 上 80%+ |
| Lambda 加权 | "额外损失的重要性" | 按深度的缩放因子；DeepSeek-V3 上训练开始 0.3，之后 0.1 |

## 延伸阅读

- [DeepSeek-AI — DeepSeek-V3 Technical Report (arXiv:2412.19437)](https://arxiv.org/abs/2412.19437) — 完整的顺序 MTP 描述（第 2.2 节），含联合损失方程和推理时 1.8 倍加速
- [Gloeckle et al. — Better & Faster Large Language Models via Multi-token Prediction (arXiv:2404.19737)](https://arxiv.org/abs/2404.19737) — DeepSeek 设计改进的并行 MTP 基线
- [DeepSeek-V3 model card on Hugging Face](https://huggingface.co/deepseek-ai/DeepSeek-V3) — 总共 685B（671B 主 + 14B MTP），部署说明
- [Leviathan et al. — Fast Inference from Transformers via Speculative Decoding (arXiv:2211.17192)](https://arxiv.org/abs/2211.17192) — MTP 嵌入其中的推测解码框架
- [Li et al. — EAGLE-3 (arXiv:2503.01840)](https://arxiv.org/abs/2503.01840) — EAGLE 的 2025 draft 架构，MTP 竞争的对手
