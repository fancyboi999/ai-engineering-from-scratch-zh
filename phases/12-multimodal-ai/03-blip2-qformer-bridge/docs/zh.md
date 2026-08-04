# 从 CLIP 到 BLIP-2 —— Q-Former 作为模态桥

> CLIP 对齐了图像和文本，但它生不出 caption、答不了问题、也没法对话。BLIP-2（Salesforce，2023）用一座小巧的可训练桥解决了这件事：32 个可学习的 query 向量通过交叉注意力去关注一个冻结 ViT 的特征，然后直接插进一个冻结 LLM 的输入流。1.88 亿参数的桥，把一个 11B 的 LLM 连到了一个 ViT-g/14 上。一直到 2026 年，每一个基于适配器的 VLM——MiniGPT-4、InstructBLIP、LLaVA 的那些表亲——都是它的后代。本节课通读 Q-Former 的架构，讲清它的两阶段训练，并搭一个玩具版，把视觉 token 喂进一个冻结的文本解码器。

**类型：** Build
**语言：** Python（标准库，交叉注意力 + 可学习 query 演示）
**前置要求：** Phase 12 · 02（CLIP）、Phase 7（Transformers）
**预计时间：** ~180 分钟

## 学习目标

- 解释为什么在冻结视觉编码器和冻结 LLM 之间放一个可训练瓶颈，在成本和稳定性上胜过端到端微调。
- 实现一个交叉注意力块，让一组固定的可学习 query 去关注外部图像特征。
- 走一遍 BLIP-2 的两阶段预训练：表示阶段（ITC + ITM + ITG）然后是生成阶段（用冻结解码器的 LM 损失）。
- 把 Q-Former 和 LLaVA 里更简单的 MLP 投影器作比较，论证各自在什么情况下取胜。

## 问题背景

你有一个冻结的 ViT，每张图产出 256 个维度 1408 的 patch token。你有一个冻结的 7B LLM，它期望维度 4096 的 token 嵌入。最显然的桥——一个从 1408 到 4096 的线性层——能用，但把全部 256 个 patch token 都喂进 LLM 的上下文，每张图要多花 256 个 token。32 张图一批下来，光视觉模态就吃掉了 8192 个 token。

BLIP-2 的问题是：你能把 256-token 的图像表示压缩成少得多的 token（比如 32 个），同时保留足够的信息让 LLM 去描述、回答、推理这张图吗？而且你能不碰冻结骨干就训出这座桥，把训练成本压到只剩桥自己的参数吗？

答案是：一个 Q-Former。32 个可学习的"query"向量交叉关注 ViT 的 patch token，产出一份 32-token 的视觉摘要供 LLM 消费。总共 1.88 亿参数。在碰 LLM 之前，先用对比、匹配、生成三种目标训好。

## 核心概念

### 可学习 query

Q-Former 的核心戏法：不是让 LLM 的文本 token 去关注图像 patch，而是引入一组新的 32 个可学习 query 向量 `Q`，让*它们*去关注图像 patch。这些 query 是模型的参数——它们在训练中学出来，所有图像都用同一组 32 个 query。

交叉注意力之后，每个 query 都持有图像的一份压缩摘要——"描述主体物体""描述背景""数物体个数"等等。query 不会真的去专门对应某个语义标签；它们学的是任何能让下游损失下降的编码。

### 架构

Q-Former 是一个小型 transformer（12 层，约 1 亿参数），有两条路径：

1. query 路径：32 个 query 向量先过自注意力（彼此之间），再对冻结 ViT 的 patch token 做交叉注意力，再过 FFN。
2. 文本路径：一个类 BERT 的文本编码器，与 query 路径共享自注意力和 FFN 权重。文本路径的交叉注意力被关掉。

训练时两条路径都跑。query 和文本通过共享的自注意力交互，这意味着在需要的任务里（ITM、ITG）query 能以文本为条件。推理时做 VLM 交接，只让 query 流过，产出 32 个视觉 token。

### 两阶段训练

BLIP-2 分两阶段预训练：

阶段 1：表示学习（无 LLM）。三个损失：
- ITC（图文对比）：在池化后的 query token 与文本 CLS token 之间做 CLIP 式对比。
- ITM（图文匹配）：二分类器——这个图文对是匹配的吗？做难负例挖掘。
- ITG（图像引导的文本生成）：在文本上接一个因果 LM 头，以 query 为条件。逼着 query 编码可生成文本的内容。

只训 Q-Former。ViT 冻结。不涉及 LLM。

阶段 2：生成学习。接上一个冻结的 LLM（OPT-2.7B 或 Flan-T5-XL 等）。用一个小线性层把 32 个 query 输出投影到 LLM 的嵌入维度。把它们拼在文本 prompt 前面。只在拼接好的 prompt + 图像 + caption 序列上，用 LM 损失训练那个线性投影和 Q-Former。

阶段 2 之后，Q-Former + 投影就是完整的视觉适配器。推理时：图像 → ViT → Q-Former → 线性投影 → 拼到文本前 → 冻结 LLM 吐出输出。

### 参数经济学

BLIP-2 配 ViT-g/14（1.1B，冻结）+ OPT-6.7B（6.7B，冻结）+ Q-Former（188M，可训）= 共 8B，可训 188M。光 Q-Former 就约占整栈参数的 2.4%。训练成本反映了这一点：几张 A100 上跑几天，而端到端要跑几周。

质量：BLIP-2 在零样本 VQA 上追平或胜过 Flamingo-80B，而体量小了 50 倍。这座桥成了。

### InstructBLIP 与指令感知的 Q-Former

InstructBLIP（2023）给 Q-Former 加了一个额外输入：指令文本本身。在交叉注意力时，query 现在同时能看到图像 patch 和指令。query 可以按指令做专门化（"数车""描述氛围"），而不再学一份固定不变的摘要。在留出任务上有基准提升。

### MiniGPT-4 与只训投影的做法

MiniGPT-4 保留了 Q-Former，但只训输出的线性投影，其余全冻。便宜，代价是质量——那些 query 是 BLIP-2 的，不是你的。适合快速迭代，不是最佳架构。

### LLaVA 为什么走了更简单的路

LLaVA（2023，第 12.05 课）用一个朴素的 2 层 MLP 换掉了 Q-Former，把每个 ViT patch token 投影到 LLM 空间——24x24 网格下每张图 576 个 token，全喂给 LLM。压缩更差，但让 LLM 能关注原始 patch。当时这有争议；到 2023 年底它占了主导，因为视觉指令数据（LLaVA-Instruct-150k）证明了 MLP 能被训得保留足够信号。取舍是：LLaVA 的上下文填得更快，但它天然能扩展到多图和视频。

到 2026 年，这个领域分裂了：在 token 预算要紧的地方（长视频、多图）Q-Former 存活；在以单 token 原始质量为先的地方 MLP 投影器占主导。

### 门控交叉注意力：祖先 Flamingo

Flamingo（第 12.04 课）早于 BLIP-2，用的是同样的交叉注意力想法，但放在冻结 LLM 的每一层，而不是作为单座桥。BLIP-2 证明了你可以只压缩到输入层、照样能用。Gemini 和 Idefics 把两者结合：交错的输入 token 加上可选的门控交叉注意力来做 in-context few-shot。

### 2026 年的后代

- Q-Former：BLIP-2、InstructBLIP、MiniGPT-4，以及出于 token 预算考虑的大多数视频-语言模型。
- Perceiver resampler：Flamingo 的变体（第 12.04 课）；Idefics 家族、Eagle、OmniMAE。
- MLP 投影器：LLaVA、LLaVA-NeXT、LLaVA-OneVision、Cambrian-1。
- 注意力池化：VILA、PaliGemma。

四种都成立。决定性的问题是：你受限于 token 预算，还是受限于单 token 的质量。

```figure
modality-projection
```

## 实际使用

`code/main.py` 用标准库搭了一个 Q-Former 式的交叉注意力：

1. 模拟 256 个图像 patch token（维度 128）。
2. 实例化 32 个可学习 query（维度 128）。
3. 跑缩放点积交叉注意力（Q 来自 query，K/V 来自 patch）。
4. 通过一个线性层投影到 LLM 维度（512）。
5. 输出 32 个可直接喂给 LLM 的视觉 token。

所有数学都用纯 Python（在向量上嵌套循环）。是玩具，但形状正确。注意力权重矩阵会打印出来，让你看到每个 query 从哪些 patch 里取了东西。

## 拿去用

本节课产出 `outputs/skill-modality-bridge-picker.md`。给定一个目标 VLM 配置（视觉编码器 token 数、LLM 上下文预算、部署约束、质量目标），它在 Q-Former、MLP、Perceiver resampler 之间给出推荐，附一段简短理由和每座桥的参数量估计。

## 练习

1. 用 PyTorch 实现这个交叉注意力块。验证：32 个 query、256 个 key/value 时，注意力权重矩阵是 32 x 256，且 softmax 后每行求和为 1。

2. BLIP-2 阶段 1 里 Q-Former 同时跑三个损失：ITC、ITM、ITG。用伪代码写出每个的 forward 签名。哪一个需要文本编码器路径处于激活状态？

3. 对比参数量：Q-Former（12 层，768 隐藏）vs 一个 2 层 MLP 投影器（1408 → 4096，两层）。在多大的 LLM 规模下，188M 的 Q-Former 成本能在训练效率上回本？

4. 读 BLIP-2 论文（arXiv:2301.12597）第 3.2 节关于 Q-Former 如何初始化的内容。解释为什么从 BERT-base 初始化（而非随机）能加速收敛。

5. 对一段 10 分钟、按 1 FPS 采到 60 帧的视频，分别算 (Q-Former → 32 token/帧) 与 (MLP 投影器 → 576 token/帧) 下每帧的 token 成本。哪个塞得进一个 128k-token 的 LLM 上下文窗口？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|----------------|------------------------|
| Q-Former | "Querying transformer" | 带 32 个可学习 query 向量的小型 transformer，交叉关注冻结的 ViT 特征 |
| 可学习 query | "视觉的软 prompt" | 一组固定参数，充当交叉注意力的 query 一侧；按模型学出，所有输入共享 |
| 交叉注意力 | "Q 来自这边，K/V 来自那边" | query、key、value 来自不同来源的注意力；query 就是这样从 ViT patch 里取东西的 |
| ITC | "图文对比" | 应用在 Q-Former 池化 query 与文本 CLS 之间的 CLIP 式损失 |
| ITM | "图文匹配" | 在难负例挖掘的对上做的二分类器；逼 query 去辨别细粒度的不匹配 |
| ITG | "图像引导的文本生成" | 以 query 为条件生成文本的因果 LM 损失；逼 query 编码可解码成文本的内容 |
| 两阶段预训练 | "先表示后生成" | 阶段 1 单独训 Q-Former（ITC/ITM/ITG）；阶段 2 接上冻结 LLM，只训投影 + Q-Former |
| 冻结骨干 | "不微调" | 视觉编码器和 LLM 权重固定；只训那座桥 |
| 投影头 | "线性到 LLM 维度" | 把 Q-Former 输出映射到 LLM 嵌入维度的最后那个线性层 |
| Perceiver resampler | "Flamingo 的版本" | 类似的可学习 query 交叉注意力，Flamingo 在每一层用它，而非作为单座桥 |

## 延伸阅读

- [Li et al. — BLIP-2 (arXiv:2301.12597)](https://arxiv.org/abs/2301.12597) —— 核心论文。
- [Li et al. — BLIP (arXiv:2201.12086)](https://arxiv.org/abs/2201.12086) —— 带 ITC/ITM/ITG 三件套的前身。
- [Li et al. — ALBEF (arXiv:2107.07651)](https://arxiv.org/abs/2107.07651) —— "align before fuse"——阶段 1 训练的概念祖先。
- [Dai et al. — InstructBLIP (arXiv:2305.06500)](https://arxiv.org/abs/2305.06500) —— 指令感知的 Q-Former。
- [Zhu et al. — MiniGPT-4 (arXiv:2304.10592)](https://arxiv.org/abs/2304.10592) —— 只训投影的做法。
- [Jaegle et al. — Perceiver IO (arXiv:2107.14795)](https://arxiv.org/abs/2107.14795) —— 可学习 query 交叉注意力的通用架构。
