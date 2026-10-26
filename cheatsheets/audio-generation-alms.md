---
id: audio-generation-alms
title: 音乐生成与音频语言模型
code: MG
subtitle: 编解码器 token、MusicGen、音频编码器与投影器、Thinker 与 Talker、TTFAB 预算及音频常见坑。
hue: 285
sources: phases/06-speech-and-audio/09-music-generation, phases/06-speech-and-audio/10-audio-language-models, phases/08-generative-ai/11-audio-generation, phases/12-multimodal-ai/19-audio-language-whisper-to-af3, phases/12-multimodal-ai/20-omni-models-thinker-talker
source_hash: ef5304a4b8c70acf
---

## 将音频转换为编解码器 token
type: architecture
from: phases/08-generative-ai/11-audio-generation/docs/zh.md

```arch
node | wave | 1,1 | 波形 | 16-48 kHz | client
node | enc | 2,1 | 卷积编码器 | 每个时间步一个向量 | process
node | rvq | 3,1 | RVQ | 8 个码本，75 Hz | store
node | gen | 3,2 | 生成器 | token 自回归或扩散 | model
node | dec | 2,2 | 编解码器的解码器 | token 转音频 | process
node | out | 1,2 | 音频输出 | |
edge | wave | enc |
edge | enc | rvq | 向量
edge | rvq | gen | 索引
edge | gen | dec | 新 token
edge | dec | out |
```

## 关键数值
type: concepts
from: phases/08-generative-ai/11-audio-generation/docs/zh.md, phases/06-speech-and-audio/09-music-generation/docs/zh.md, phases/12-multimodal-ai/19-audio-language-whisper-to-af3/docs/zh.md, phases/12-multimodal-ai/20-omni-models-thinker-talker/docs/zh.md

- **编解码器速率**：8 个 RVQ 码本以 75 Hz 工作，对应 600 tokens/sec。
- **流式下限**：75 tokens/second 时，每位用户需要生成 ≥75 tokens/sec。
- **Talker 下限**：50 Hz 语音 token 要求 Talker 达到 ≥50 tok/s。
- **码本**：通常包含 1024 或 2048 个条目。
- **MusicGen 编解码器**：32 kHz 的 EnCodec，使用 4 个码本。
- **Log-Mel 形状**：30 s 音频、100 Hz 帧率对应 (3000, 80)。
- **往返延迟**：低于 500ms 时，用户不再察觉卡顿。

## 两类生成器
type: concepts
from: phases/08-generative-ai/11-audio-generation/docs/zh.md, phases/06-speech-and-audio/09-music-generation/docs/zh.md

- **Token 自回归**：仅解码器的 transformer 处理展平后的 RVQ token。
- **延迟并行**：MusicGen 输出 K 条码本流，各流使用不同偏移。
- **VALL-E**：根据文本 prompt 和 3 秒声音样本生成语音 token。
- **潜空间扩散**：Stable Audio Open 在压缩音频上工作，适合循环片段。
- **流匹配**：Stable Audio 2.5 将其用于连续音频潜变量。
- **趋势**：流匹配在音乐上占优，token 自回归主导语音。

## MusicGen、旋律与 FAD
type: annotated-code
lang: python
from: phases/06-speech-and-audio/09-music-generation/docs/zh.md

```python
from audiocraft.models import MusicGen
model = MusicGen.get_pretrained("facebook/musicgen-small")  # 300M，速度快
model.set_generation_params(duration=10)  # 音频秒数
wav = model.generate(["upbeat synthwave with driving drums, 128 BPM"])
torchaudio.save("out.wav", wav[0].cpu(), 32000)  # 32 kHz 输出
melody, sr = torchaudio.load("humming.wav")
wav = model.generate_with_chroma(  # 保留旋律，替换音色
    ["jazz piano cover"], melody.squeeze(), sr)
from frechet_audio_distance import FrechetAudioDistance
fad = FrechetAudioDistance()  # VGGish 嵌入距离
fad.get_fad_score("generated_folder/", "reference_folder/")  # 越低越好
```

## 音频语言模型模板
type: flow
from: phases/06-speech-and-audio/10-audio-language-models/docs/zh.md

1. **音频编码器**：Whisper 编码器、BEATs、CLAP 或 WavLM 提取特征。
2. **投影器**：线性层或 MLP 将特征映射到 LLM 嵌入空间。
3. **LLM**：解码器读取交错排列的文本和音频 token，输出文本。
4. **阶段 1**：冻结编码器和 LLM。使用 ASR 或音频描述数据训练投影器。
5. **阶段 2**：在指令音频任务上做全量微调或 LoRA 微调。
6. **阶段 3**：可选。添加语音解码器，实现语音输入与输出。

## 投影器与音频 Q-former
type: annotated-code
lang: python
from: phases/06-speech-and-audio/10-audio-language-models/docs/zh.md, phases/12-multimodal-ai/19-audio-language-whisper-to-af3/code/main.py

```python
class AudioProjector(nn.Module):
    def __init__(self, audio_dim=1280, llm_dim=4096):
        super().__init__()
        self.down = nn.Linear(audio_dim, llm_dim)  # 从音频维度映射到 LLM 宽度
        self.act = nn.GELU()
        self.up = nn.Linear(llm_dim, llm_dim)
    def forward(self, audio_features):
        return self.up(self.act(self.down(audio_features)))
qf = QFormer(n_queries=8, hidden=20)  # N=8 个查询
tokens = qf.forward(frames)  # 输入 99 帧，输出 8 个 token
```

## Log-Mel 与编码器设置
type: defaults
from: phases/12-multimodal-ai/19-audio-language-whisper-to-af3/docs/zh.md, phases/12-multimodal-ai/19-audio-language-whisper-to-af3/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| 采样率 | 16 kHz | 先重采样 |
| 窗长 | 25ms | `win_ms: int = 25` |
| 帧移 | 10ms | `hop_ms: int = 10` |
| Mel 滤波器 | 80 | 0-8000 Hz |
| 对数压缩 | `math.log(1 + x)` | 动态范围 |
| Q-former 查询数 | 32 或 64 | AF3 使用 64 |
| Whisper 编码器 | 12 层 | 在 ALM 模式中冻结 |

## Thinker 与 Talker
type: architecture
from: phases/12-multimodal-ai/20-omni-models-thinker-talker/docs/zh.md

```arch
node | mic | 1,1 | 麦克风与 VAD | 语音 token | client
node | think | 2,1 | Thinker | 7B-80B, TMRoPE | model
node | talk | 3,1 | Talker | 200M-1B | model
node | dec | 3,2 | 语音解码器 | SNAC, MoVQGAN | process
node | spk | 2,2 | 扬声器 | 音频采样 | client
edge | mic | think | 音频 token
edge | think | talk | 文本 token
edge | talk | dec | RVQ 索引
edge | dec | spk | 流式传输
```

## 7B 模型的 TTFAB 预算
type: defaults
from: phases/12-multimodal-ai/20-omni-models-thinker-talker/docs/zh.md, phases/12-multimodal-ai/20-omni-models-thinker-talker/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| 麦克风到音频 token | 40-80ms | 流式处理 |
| 预填充 | 100-200ms | 70B 时显著增加 |
| Thinker 首个文本 token | 40ms | 随 Thinker 规模增长 |
| Talker 处理首个文本 token | 20ms | 课程模型中至少为 15ms |
| 首批语音 token 提交 | 40ms | 位于残差 VQ 解码之前 |
| 残差 VQ 解码 | 30ms | `rvq_decode = 30` |
| 语音波形解码 | 50-80ms | `wave_decode = 70` |
| TTFAB 总计 | 320-490ms | 70B 时为 600-900ms |

## 故障排查
type: troubleshooting
from: phases/06-speech-and-audio/09-music-generation/docs/zh.md, phases/06-speech-and-audio/10-audio-language-models/docs/zh.md, phases/08-generative-ai/11-audio-generation/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 超过 30 s 后音乐开始循环 | 自回归模型会循环 | 交叉淡化，或使用 ACE-Step |
| 节奏偏离 BPM | 模型发生漂移 | 使用 BPM 标签和 librosa `beat_track` |
| 演唱歌词含糊 | 开放模型不擅长歌词 | 使用商业 API 或微调 |
| 静音时产生幻觉 | Whisper 编码器问题 | 用 VAD 作为门控 |
| 超过 10 分钟后混淆说话人 | 长音频性能退化 | 先做说话人分离，再总结 |
| 多音频任务接近 25% | 达到随机猜测水平 | 不要信任“哪个片段”类任务 |
| RVQ 第 1 层错误扩散 | RVQ 错误累积 | 较高层的温度设为 0 |
| 片段接缝处有伪影 | 交叉淡化边界问题 | 谨慎使用重叠相加 |

## 代码任务
type: task-table
span: 2
from: phases/06-speech-and-audio/10-audio-language-models/docs/zh.md, phases/06-speech-and-audio/10-audio-language-models/code/main.py, phases/12-multimodal-ai/19-audio-language-whisper-to-af3/code/main.py, phases/12-multimodal-ai/20-omni-models-thinker-talker/code/main.py, phases/08-generative-ai/11-audio-generation/code/main.py, phases/08-generative-ai/11-audio-generation/docs/zh.md

| 任务 | 代码 |
|---|---|
| 加载 ALM 处理器 | `AutoProcessor.from_pretrained("Qwen/Qwen2.5-Omni-7B")` |
| 生成答案 | `model.generate(**inputs, max_new_tokens=200)` |
| 加载 MMAU-Pro | `load_dataset("gamma-lab-umd/MMAU-Pro", split="test")` |
| 按官方方式评测 MMAU-Pro | `evaluate_mmau_pro_comprehensive.py` |
| 将音频切帧 | `window_frames(wave, 16000, 25, 10)` |
| 列出 TTFAB 组成 | `ttfab(cfg)` |
| 采样编解码器 token | `generate(counts, style, start, length, rng, temperature=1.0)` |

## 问答
type: qa
from: phases/12-multimodal-ai/19-audio-language-whisper-to-af3/docs/zh.md, phases/12-multimodal-ai/20-omni-models-thinker-talker/docs/zh.md

- **何时级联系统就够用？** 目标是转录，不涉及音乐或情绪。
- **何时需要端到端？** 涉及音乐、情绪、多说话人或复杂音频推理时。
- **级联系统会丢掉什么？** 情绪、说话人身份、时序和深度伪造线索。
- **为何使用小型 Talker？** 7B Talker 达不到 50 tok/s 的下限。
- **为何使用 TMRoPE？** 它为每个 token 提供绝对时间戳，使视觉、音频和文本对齐。
- **半双工还是全双工？** Qwen2.5-Omni 默认半双工。Moshi 支持全双工。

## 提示
type: tips
from: phases/06-speech-and-audio/09-music-generation/docs/zh.md, phases/06-speech-and-audio/10-audio-language-models/docs/zh.md, phases/08-generative-ai/11-audio-generation/docs/zh.md

- 为安全交付，只生成器乐。
- 为每次生成添加水印与元数据。
- 分别报告每个 MMAU-Pro `category`。
- 先检查编解码器，它决定输出质量上限。DAC 是当前最好的开放选项。
- 做声音克隆时，加入滥用检测和退出名单。
