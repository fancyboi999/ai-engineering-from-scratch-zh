# 音频-语言模型：从 Whisper 到 Audio Flamingo 3 的弧线

> Whisper（Radford 等人，2022 年 12 月）了结了语音识别——68 万小时弱监督多语言语音、一个简单的编码器-解码器 transformer、一个让后续每个 ASR 发布都引用它的基准。但识别不是推理。问"这段录音里有什么乐器""说话人在表达什么情绪""第 3 分钟发生了什么"，需要的是音频理解，不是转录。Qwen-Audio、SALMONN、LTU 和 NVIDIA 的 Audio Flamingo 3（AF3，2025 年 7 月）层层搭起了这套栈：保留 Whisper 类编码器、外挂 Q-former、在音频-文本指令数据上训练、加入思维链推理。本节课走一遍这条弧线。

**类型：** Build
**语言：** Python（标准库，log-Mel 频谱图 + 音频 Q-former 骨架）
**前置要求：** Phase 6（语音与音频）、Phase 12 · 03（Q-Former）
**预计时间：** ~180 分钟

## 学习目标

- 从波形算出一个 log-Mel 频谱图：加窗、FFT、滤波器组、对数变换。
- 比较编码器选项：Whisper 编码器、BEATs、AF-Whisper 混合体。各自何时取胜。
- 搭一个音频 Q-former：N 个可学习 query 交叉关注频谱图 patch。
- 解释级联（先 Whisper 后 LLM）vs 端到端音频 LLM 训练：为什么端到端在推理上扩展得更好。

## 问题背景

语音识别被 Whisper 解决了。音频的 OCR 成了大路货。但"大路货"止步于转录。如果模型无法对它听到的东西推理——时序、说话人、情绪、音乐结构、环境声——光转录撑不起产品功能。

三条显然的路线：

1. 级联：Whisper 转录，LLM 对转录文本推理。对纯语音场景能用。对音乐、环境音频、多说话人重叠、情绪则失败。

2. 端到端音频 LLM：一个音频编码器把音频 token 直接喂进 LLM，跳过转录。保留声学信息（情绪、说话人、环境）。需要新的训练数据。

3. 混合：音频编码器 + 一个既能转录又能推理的文本解码器。Qwen-Audio 和 Audio Flamingo 选了这条路。

## 核心概念

### log-Mel 频谱图：输入特征

每个音频编码器都从同一个特征起步：一张 log-Mel 频谱图。

1. 重采样到 16 kHz。
2. 25ms 窗、10ms 跳的短时傅里叶变换。
3. 取 FFT 结果的幅度。
4. 应用 Mel 滤波器组（通常 80 个滤波器，在 0-8000 Hz 上对数间隔）扭曲到感知频率。
5. 对数压缩（log(1 + x)）以拉伸动态范围。

结果：一个形状为 (T, 80) 的二维数组，T 是时间帧数。对一段 30 秒、100 Hz 帧率的片段：(3000, 80)。

### Whisper 的编码器

Whisper 的编码器是一个 12 层 ViT 式 transformer，把 log-Mel 频谱图当作一串时间帧来处理。输出：每个时间帧一个隐藏状态向量。

对 ASR，Whisper 的解码器是一个交叉注意力 transformer，以编码器输出为条件生成文本 token。标准编码器-解码器。

对 ALM（音频 LLM），你想把编码器输出作为一个不同 LLM 的输入。模式是：Whisper 编码器冻结，Q-former 可训，LLM 冻结或微调。

### BEATs 与音频专用编码器

Whisper 是在以语音为主的数据上训的。它对音乐和环境音频更弱。

BEATs（Chen 等人，2022）是一个在 AudioSet 上训的自监督 transformer。在相同参数量下比 Whisper 更好地捕捉音乐和环境声。

AF-Whisper（Audio Flamingo 3 的混合体）：把 Whisper + BEATs 特征拼接作为音频输入。Whisper 携带语言信号，BEATs 携带声学信号。

### 音频 Q-former

与 BLIP-2 的视觉 Q-former 同样的模式。固定数量的可学习 query（常 32 或 64）交叉关注音频编码器的输出帧。query 成为 LLM 消费的音频 token。

训练对齐阶段：单独 Q-former，在音频-文本对（AudioCaps、Clotho）上做对比 + 看图说话损失。指令阶段：端到端，解冻 LLM，在指令数据上训练。

### 弧线—— SALMONN、Qwen-Audio、AF3

SALMONN（Tang 等人，2023）：Whisper + BEATs + Q-former + LLaMA。第一个有严肃推理能力的开放音频 LLM。在 MMAU 上的基准显示综合分约 0.55。

Qwen-Audio（Chu 等人，2023）：架构类似，在更丰富的数据集上训练，为多轮对话调过。MMAU 约 0.60。

LTU —— Listen, Think, Understand（Gong 等人，2023）：显式推理数据，专注于对音频片段的思维链。更小但更聚焦。

Audio Flamingo 3（Goel 等人，2025 年 7 月）：当前开放 SOTA。8B LLM 骨干（Qwen2 7B）、Whisper-large 编码器拼 BEATs、64-query Q-former、在 100 万+ 音频-文本指令对上训练。MMAU 0.72，在部分子任务上追平专有前沿。

AF3 还为音频引入了按需思维链：模型可以在最终答案之前可选地吐出思考 token（"我先识别一下乐器：……"）。开启思考时，复杂推理任务的准确率提升 3-5 分。

### 级联 vs 端到端

级联流水线：

1. Whisper 把音频转录 → 文本。
2. LLM 对文本推理。

对"总结这集播客"完美奏效。对以下则失败：
- "这首歌的情绪如何？"——情绪在声音里，不在词里。
- "在说话的是 Alice 还是 Bob？"——需要说话人识别。
- "爆炸在第几秒发生？"——时间 grounding 在文本里丢失了。
- "这是真实音频还是生成的？"——深度伪造检测需要声学特征。

端到端保留声学信号。Qwen-Audio 和 AF3 原生处理音乐、环境和情绪。

### 2026 年生产配方

为一个新音频理解产品：

- 级联，如果：转录是目标，无音乐，无情绪推断。
- AF3 / Qwen-Audio 家族，如果：有音乐、情绪、多说话人，或复杂音频推理。

级联更便宜更简单。端到端更有能力。

### MMAU —— 音频推理基准

MMAU（Massive Multimodal Audio Understanding）是 2024-2025 的音频推理基准：

- 横跨语音、音乐、环境声的 10,000 对音频-文本 QA。
- 涵盖分类、时间推理、因果推理、开放式 QA。
- 测试级联流水线系统性遗漏的东西。

开放 SOTA（AF3）在 0.72；专有前沿约 0.78（Gemini 2.5 Pro、Claude Opus 4.7）。这个差距比 VideoMME 的开放 vs 闭源差距更小，说明音频 LLM 正在成熟。

```figure
audio-text-ctc
```

## 实际使用

`code/main.py`：

- 用标准库实现 log-Mel 频谱图计算：加窗、朴素 DFT、Mel 滤波器组。
- 音频 Q-former 骨架：给定编码器输出帧，计算 Q、K、V、注意力，并吐出 N 个 token。
- 在一个玩具任务上做级联 vs 端到端的对比。

## 拿去用

本节课产出 `outputs/skill-audio-llm-pipeline-picker.md`。给定一个音频任务（转录、音乐标注、情绪推断、多说话人分离、环境分类），它挑选级联、端到端 AF3，还是混合。

## 练习

1. 算一下一段 30 秒、16kHz、25ms 窗、10ms 跳、80 个 Mel bin 片段的 log-Mel 频谱图维度。在 48kHz 下这会怎么变？

2. Whisper 为什么在音乐上表现欠佳？BEATs 捕捉到哪些 Whisper 没有的音频特征？

3. 64 query vs 32 query 的音频 Q-former：在什么任务复杂度下 64 才回本？32 为什么样的场景省算力？

4. 读 AF3 第 4 节关于按需思考的内容。提出三个思维链帮助最大的音频任务。

5. 用 AF3 的输出实现一个最小的说话人分离流水线。你怎么标示说话人切换？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| log-Mel 频谱图 | "Mel 特征" | 过 Mel 滤波器组后的二维 (时间, 频率) 对数幅度值数组 |
| 音频 Q-former | "音频 Perceiver" | 从音频编码器输出到定长 query、再喂给 LLM 的交叉注意力瓶颈 |
| 级联 | "先 ASR 后 LLM" | Whisper 转录、文本 LLM 推理的流水线；丢失声学信息 |
| 端到端 | "音频 LLM" | 音频特征经 Q-former 直接进 LLM；保留声学信号 |
| BEATs | "音频 AudioSet 编码器" | 在 AudioSet 上训的 SSL transformer；在音乐 + 环境声上强 |
| MMAU | "音频推理基准" | 横跨语音、音乐、环境的 1 万对 QA；2024 评测标准 |
| 按需思考 | "音频 CoT" | 模型可在最终答案前可选地吐出推理 token，提升准确率 3-5 分 |

## 延伸阅读

- [Radford et al. — Whisper (arXiv:2212.04356)](https://arxiv.org/abs/2212.04356)
- [Chu et al. — Qwen-Audio (arXiv:2311.07919)](https://arxiv.org/abs/2311.07919)
- [Goel et al. — Audio Flamingo 3 (arXiv:2507.08128)](https://arxiv.org/abs/2507.08128)
- [Tang et al. — SALMONN (arXiv:2310.13289)](https://arxiv.org/abs/2310.13289)
- [Gong et al. — LTU (arXiv:2305.10790)](https://arxiv.org/abs/2305.10790)
