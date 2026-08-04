# Omni 模型：Qwen2.5-Omni 与 Thinker-Talker 拆分

> GPT-4o 在 2024 年 5 月的产品演示之所以颠覆，不是因为底层模型，而是因为产品形态——一个语音界面，你说话，模型看到摄像头看到的东西，并在 250ms 内说回。开放生态在 2024 和 2025 年余下的时间里都在赛跑去够到那个产品形态。Qwen2.5-Omni（2025 年 3 月）是参考性的开放设计：一个 Thinker（大型文本生成 transformer）加一个 Talker（并行的语音生成 transformer），由流式语音 token 连接。Mini-Omni 把它简化了，Moshi 追平了它的延迟，GLM-4-Voice 把它扩展到中文。本节课通读 Thinker-Talker 架构，以及那个让流式实时对话奏效的延迟预算。

**类型：** Build
**语言：** Python（标准库，流式流水线延迟模拟器 + VAD 循环）
**前置要求：** Phase 12 · 19（音频 LLM）、Phase 12 · 16（任意到任意）
**预计时间：** ~180 分钟

## 学习目标

- 把推理流水线拆成 Thinker（文本推理）和 Talker（语音合成），解释为什么并行流式能work。
- 逐组件算出一次对话交互的首字节音频时延（TTFAB）预算。
- 描述 TMRoPE 在 Thinker 内部跨视觉、音频、文本的时间对齐位置编码。
- 说出三种实时对话模式：半双工、轮流、全双工。

## 问题背景

一个实时语音助手得做很多事，还得快：

1. 听用户。实时语音分词、语音活动检测（VAD）以知道他们什么时候说完。
2. 可选地看。摄像头输入按 2-4 FPS，与音频一起流入 Thinker。
3. 思考。以对话历史为条件组织一个回应。
4. 说话。合成音频 token，解码成波形，流到用户的音箱。

每一步都加延迟。对话感要求总往返 < 500ms——低于这个值，用户就不再注意到卡顿了。GPT-4o 宣称约 250ms。Moshi 约 160ms。Qwen2.5-Omni 约 350-500ms。

每个组件都得流式。任何环节都不能"先批处理一切再解码"。

## 核心概念

### Thinker 和 Talker

Qwen2.5-Omni 的分解：

- Thinker：一个 7B-80B 文本生成 transformer。消费交错的文本 + 图像 + 音频 token。输出代表要说什么的文本 token。
- Talker：一个更小的语音生成 transformer（200M-1B）。消费 Thinker 的文本输出 token 加近期语音上下文 token。输出离散语音 token（残差-VQ 索引）。
- 语音解码器：一个流式波形解码器（SNAC、MoVQGAN 家族），实时把语音 token 转成音频采样。

这个分离很要紧。Thinker 要大才能有好的推理。Talker 可以小，因为它的活是局部的——把文本转成语音 token。更大的 Talker 不会更有表现力；只会更慢。

两者并行运行：

1. Thinker 吐出文本 token t_i。
2. Talker（经流式）消费 t_i 并吐出语音 token s_i, s_{i+1}, ..., s_{i+k}。
3. 语音解码器在语音 token 到来时消费它们并吐出音频采样。
4. 等 Thinker 走到文本 token t_{i+3} 时，Talker 已经为 t_0..t_{i+2} 流出了音频。

### TMRoPE —— 时间对齐的多模态位置

Thinker 需要整合图像帧（比如按 4 FPS 到达）、音频帧（按 50 帧/秒到达）和来自对话历史的文本。朴素的序列顺序（先所有图像、再所有音频、再文本）会丢失时间对齐。

TMRoPE 给每个 token 赋一个绝对时间戳。视觉 token 在 t=2.3s。音频 token 在 t=2.32s。用户说"stop"的文本 token 在 t=2.35s。RoPE 按时间戳旋转注意力；模型把它们看成时间上同时发生的。

这是让"他一边挥手一边说你好"奏效的基础设施——模型在同一个概念性时刻看到视频帧和音频。

### 流式语音合成

语音 token 必须流式。Mini-Omni（Xie & Wu，2024）引入了"语言模型能在流式中边思考边听、边说"：Thinker 输出 token 和 Talker 输出 token 在同一序列里交错。Talker 一旦 Thinker 提交下一个文本 token 就开火。无批边界。

Moshi（Défossez 等人，2024 年 10 月）是最快的开放实现。单张 A100 上 160ms TTFAB。架构：单个 7B transformer 在交替位置上吐文本和语音 token，配一个把思考流与说话流分开的"内心独白"。这本质上是把 Thinker + Talker 经精心训练融进了一个模型。

### VAD 与轮流

语音活动检测跑在输入侧。两种模式：

- 半双工：用户说，模型听。模型说，用户听。通过 VAD 静音检测（约 200ms）清晰交接。
- 全双工：两者能同时说。模型能搭话（"嗯哼"）或打断。难得多。Moshi 支持这个。

Qwen2.5-Omni 默认支持半双工，靠静音阈值轮流。全双工需要应用层处理。

### Qwen3-Omni（2025 年 11 月）

继任者。Qwen3-80B Thinker、更大的 Talker、改进的 TMRoPE-v2。延迟逼近 GPT-4o 的 250ms。开放权重。在 OmniBench 上的基准与 Gemini 2.0 Live 有竞争力。

### 生产延迟预算

对一次典型流式交互：

- 麦克风 -> 音频 token：40-80ms。
- 预填（prompt + 历史）：7B 下 100-200ms，70B 下要多得多。
- 第一个 Thinker 文本 token：40ms。
- Talker 处理第一个文本 token：20ms。
- 第一批语音 token 提交：40ms。
- 残差-VQ 解码：30ms。
- 语音波形解码：50-80ms。

总 TTFAB：7B 下 320-510ms，70B 下 600-900ms。前沿质量通常意味着 70B+；这就是前沿的延迟差距所在。

### token 速率的数学

在 16kHz 语音、50 Hz 基础语音 token 下，每秒输出你需要 50 个语音 token。Talker 必须吐出 ≥50 tok/s 才跟得上。在 H100 上典型 LLM 吞吐 30-80 tok/s 的情况下，一个小（200-300M）Talker 够快；一个 7B Talker 会跟不上。

这就是为什么存在小型专用 Talker 模型，而不是"直接用主模型"。

```figure
l5-thinker-talker
```

## 实际使用

`code/main.py`：

- 用模拟的 token 吐出速率模拟一个 Thinker-Talker 流水线。
- 为可配置的模型大小和麦克风采样率算 TTFAB。
- 用 VAD 静音阈值演示半双工轮流。

## 拿去用

本节课产出 `outputs/skill-omni-streaming-budget.md`。给定一个实时语音产品的目标 TTFAB 和功能集（视觉输入、双语、全双工），它挑选 Qwen2.5-Omni、Qwen3-Omni、Moshi 或 Mini-Omni，并为 Thinker/Talker 定规格。

## 练习

1. 你的目标 TTFAB 是 300ms。在一个 7B Thinker 和 300M Talker 上，写出每个组件的延迟。

2. Qwen2.5-Omni 用 TMRoPE。描述对一个用户在 t=1s 开始说话、摄像头在 t=1.2s 捕捉到一个手势的 prompt，模型看到的是什么。

3. 全双工支持要求模型边听边吐音频。提出一种教会这件事的训练数据格式。

4. 读 Moshi 论文第 4 节。描述"内心独白"分离，以及它为什么避开了 Thinker-Talker 拆分。

5. 算吞吐预算：在 16kHz 语音、50 个基础层 token/秒下，Talker 必须多快吐 token 才跟得上？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| Thinker | "推理大脑" | 产出要说什么的大型文本生成 transformer |
| Talker | "生成语音的嘴" | 从 Thinker 的文本产出离散语音 token 的小型 transformer |
| TTFAB | "延迟预算" | 首字节音频时延：从用户语音结束到第一段音频采样输出 |
| TMRoPE | "时间对齐 RoPE" | 跨视觉、音频、文本用绝对时间戳的位置编码 |
| 半双工 | "轮流" | 用户和模型交替；VAD 静音检测用户说完 |
| 全双工 | "同时" | 模型能同时说和听；可搭话 |
| 内心独白 | "Moshi 分离" | 思考流和说话流交错的单模型设计 |

## 延伸阅读

- [Xu et al. — Qwen2.5-Omni (arXiv:2503.20215)](https://arxiv.org/abs/2503.20215)
- [Qwen Team — Qwen3-Omni (arXiv:2509.17765)](https://arxiv.org/html/2509.17765v1)
- [Xie & Wu — Mini-Omni (arXiv:2408.16725)](https://arxiv.org/abs/2408.16725)
- [Défossez et al. — Moshi (arXiv:2410.00037)](https://arxiv.org/abs/2410.00037)
- [Zeng et al. — GLM-4-Voice (arXiv:2412.02612)](https://arxiv.org/abs/2412.02612)
