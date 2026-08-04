# 语音反欺骗与音频水印 —— ASVspoof 5、AudioSeal、WaveVerify

> 语音克隆比防御跑得快。2026 年的生产语音系统需要两样东西：一个检测器（AASIST、RawNet2）来分类真假语音，一个水印（AudioSeal）能扛住压缩和编辑。两个都上，否则别上语音克隆。

**类型：** Build
**语言：** Python
**前置要求：** 阶段 6 · 06（说话人识别）、阶段 6 · 08（语音克隆）
**预计时间：** ~75 分钟

## 问题背景

三种相关的防御：

1. **反欺骗 / 深伪检测。** 给一段音频，它是合成的还是真实的？ASVspoof 基准（ASVspoof 2019 → 2021 → 5）是黄金标准。
2. **音频水印。** 在生成的音频里嵌入一个不可感知的信号，检测器之后能把它提取出来。AudioSeal（Meta）和 WavMark 是开源选项。
3. **可认证溯源。** 对音频文件 + 元数据做密码学签名。C2PA / 内容真实性倡议。

检测应对不配合的对手。水印应对合规——AI 生成的音频应当能被识别出是 AI 生成的。2026 年两者都是必需的。

## 核心概念

![反欺骗 vs 水印 vs 溯源 —— 三层防御](../assets/spoofing-watermark.svg)

### ASVspoof 5 —— 2024-2025 的基准

与前几届相比最大的变化：

- **众包数据**（不是录音棚干净录音）—— 真实条件。
- **约 2000 个说话人**（之前约 100 个）。
- **32 种攻击算法。** TTS + 语音转换 + 对抗扰动。
- **两条赛道。** 对抗措施（CM）独立检测；抗欺骗 ASV（SASV）用于生物识别系统。

ASVspoof 5 上的当时最优：约 7.23% EER。在更老的 ASVspoof 2019 LA 上：0.42% EER。真实世界部署：在野外音频上预期 5-10% EER。

### AASIST 和 RawNet2 —— 检测模型家族

**AASIST**（2021，更新到 2026）。在频谱特征上做图注意力。当前 ASVspoof 5 对抗措施任务的 SOTA。

**RawNet2。** 原始波形上的卷积前端 + TDNN 骨干。更简单的基线；微调后仍有竞争力。

**NeXt-TDNN + SSL 特征。** 2025 年变体：ECAPA 风格 + WavLM 特征 + focal loss。在 ASVspoof 2019 LA 上达到 0.42% EER。

### AudioSeal —— 2024 年的水印默认

Meta 的 **AudioSeal**（2024 年 1 月，v0.2 2024 年 12 月）。关键设计：

- **局部化。** 在 16 kHz 采样分辨率（1/16000 s）下逐帧检测水印。
- **生成器 + 检测器联合训练。** 生成器学会嵌入不可闻信号；检测器学会穿过各种增强找到它。
- **鲁棒。** 扛住 MP3 / AAC 压缩、EQ、变速 ±10%、噪声混合 +10 dB SNR。
- **快。** 检测器以 485 倍实时运行；比 WavMark 快 1000 倍。
- **容量。** 16 比特负载（可编码模型 ID、生成时间戳、用户 ID），可嵌入每段语音。

### WavMark

AudioSeal 之前的开源基线。可逆神经网络，32 比特/秒。问题：

- 同步靠暴力搜索，慢。
- 能被高斯噪声或 MP3 压缩去掉。
- 不适合实时。

### WaveVerify（2025 年 7 月）

针对 AudioSeal 的弱点——特别是时间操纵（倒放、变速）。用基于 FiLM 的生成器 + 专家混合检测器。在标准攻击上与 AudioSeal 旗鼓相当；能处理时间编辑。

### 对手利用的那道缝

来自 AudioMarkBench：「在变调下，所有水印的比特恢复准确率都低于 0.6，意味着近乎完全去除。」**变调是通用攻击。** 2026 年没有任何水印对激进的变调修改完全鲁棒。这正是你需要在水印之外再上检测（AASIST）的原因。

### C2PA / 内容真实性倡议

不是 ML 技术——是一种清单格式。音频文件携带关于创作工具、作者、日期的密码学签名元数据。Audiobox / Seamless 用它。对溯源有好处；坏人重新编码并剥离元数据后它就什么都做不了。

```figure
v4-audio-watermark
```

## 动手构建

### 第 1 步：一个简单的频谱特征检测器（玩具）

```python
def spectral_rolloff(spec, percentile=0.85):
    cum = 0
    total = sum(spec)
    if total == 0:
        return 0
    threshold = total * percentile
    for k, v in enumerate(spec):
        cum += v
        if cum >= threshold:
            return k
    return len(spec) - 1

def is_suspicious(audio):
    spec = magnitude_spectrum(audio)
    rolloff = spectral_rolloff(spec)
    return rolloff / len(spec) > 0.92
```

合成语音常有异常平坦的高频能量。生产检测器用 AASIST，不是这个。但直觉是成立的。

### 第 2 步：AudioSeal 嵌入 + 检测

```python
from audioseal import AudioSeal
import torch

generator = AudioSeal.load_generator("audioseal_wm_16bits")
detector = AudioSeal.load_detector("audioseal_detector_16bits")

audio = load_wav("generated.wav", sr=16000)[None, None, :]
payload = torch.tensor([[1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0]])
watermark = generator.get_watermark(audio, sample_rate=16000, message=payload)
watermarked = audio + watermark

result, decoded_payload = detector.detect_watermark(watermarked, sample_rate=16000)
# result: float in [0, 1] — probability of watermark presence
# decoded_payload: 16 bits; match against embedded payload
```

### 第 3 步：评估 —— EER

```python
def eer(real_scores, fake_scores):
    thresholds = sorted(set(real_scores + fake_scores))
    best = (1.0, 0.0)
    for t in thresholds:
        far = sum(1 for s in fake_scores if s >= t) / len(fake_scores)
        frr = sum(1 for s in real_scores if s < t) / len(real_scores)
        if abs(far - frr) < best[0]:
            best = (abs(far - frr), (far + frr) / 2)
    return best[1]
```

### 第 4 步：生产集成

```python
def safe_tts(text, voice, clone_reference=None):
    if clone_reference is not None:
        verify_consent(user_id, clone_reference)
    audio = tts_model.synthesize(text, voice)
    audio_with_wm = audioseal_embed(audio, payload=build_payload(user_id, model_id))
    manifest = c2pa_sign(audio_with_wm, user_id, timestamp=now())
    return audio_with_wm, manifest
```

每次生成都交付：(1) 水印，(2) 签名清单，(3) 符合保留策略的审计日志。

## 实际使用

| 用例 | 防御 |
|----------|---------|
| 上线 TTS / 语音克隆 | 每个输出都嵌 AudioSeal（没得商量） |
| 生物识别语音解锁 | AASIST + ECAPA 集成；活体挑战 |
| 呼叫中心欺诈检测 | 对 20% 的来电样本跑 AASIST |
| 播客真实性 | 上传时做 C2PA 签名，AI 生成的就加 AudioSeal |
| 研究 / 训练检测器 | ASVspoof 5 训练/开发/评估集 |

## 坑

- **有水印却从不跑检测器。** 没意义。把检测器放进你的 CI。
- **检测没校准。** 在 ASVspoof LA 上训的 AASIST 会过拟合；真实世界准确率会掉。在你的领域上校准。
- **变调那道缝。** 激进的变调能去掉大多数水印。准备一个检测兜底。
- **剥元数据再转托管。** C2PA 重新编码就轻易绕过。永远把密码学 + 感知（水印）防御一起上。
- **把活体当检测。** 让用户念一句随机短语。防得住回放攻击，防不住实时克隆。

## 拿去用

存为 `outputs/skill-spoof-defender.md`。为一次语音生成部署挑选检测模型、水印、溯源清单和运维手册。

## 练习

1. **简单。** 跑 `code/main.py`。在合成音频上做玩具检测器 + 玩具水印嵌入/检测。
2. **中等。** 装上 `audioseal`，在一个 TTS 输出里嵌入一个 16 比特负载，再解码。用噪声破坏音频并测量比特恢复准确率。
3. **困难。** 在 ASVspoof 2019 LA 上微调一个 RawNet2 或 AASIST。测量 EER。在一组留出的 F5-TTS 生成片段上测试——看分布外检测怎么退化。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际指什么 |
|------|-----------------|-----------------------|
| ASVspoof | 那个基准 | 两年一届的挑战赛；2024 = ASVspoof 5。 |
| CM（对抗措施） | 检测器 | 分类器：真实语音 vs 合成 / 转换。 |
| SASV | 说话人验证 + CM | 集成的生物识别 + 欺骗检测。 |
| AudioSeal | Meta 水印 | 局部化，16 比特负载，比 WavMark 快 485 倍。 |
| 比特恢复准确率 | 水印存活率 | 攻击后恢复出的负载比特占比。 |
| C2PA | 溯源清单 | 关于创作 / 作者的密码学元数据。 |
| AASIST | 检测器家族 | 基于图注意力的反欺骗 SOTA。 |

## 延伸阅读

- [Todisco et al. (2024). ASVspoof 5](https://dl.acm.org/doi/10.1016/j.csl.2025.101825) —— 当前的基准。
- [Defossez et al. (2024). AudioSeal](https://arxiv.org/abs/2401.17264) —— 水印默认。
- [Chen et al. (2025). WaveVerify](https://arxiv.org/abs/2507.21150) —— 对付时间攻击的 MoE 检测器。
- [Jung et al. (2022). AASIST](https://arxiv.org/abs/2110.01200) —— SOTA 检测骨干。
- [AudioMarkBench (2024)](https://proceedings.neurips.cc/paper_files/paper/2024/file/5d9b7775296a641a1913ab6b4425d5e8-Paper-Datasets_and_Benchmarks_Track.pdf) —— 鲁棒性评估。
- [C2PA specification](https://c2pa.org/specifications/specifications/) —— 溯源清单格式。
