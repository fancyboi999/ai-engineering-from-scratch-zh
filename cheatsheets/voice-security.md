---
id: voice-security
title: 说话人验证、伪造检测与水印
code: SV
subtitle: 注册说话人、评分并设阈值，检测伪造音频，为每次生成添加水印与 C2PA 标记。
hue: 0
sources: phases/06-speech-and-audio/06-speaker-recognition-verification, phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa
source_hash: fe5c3e7ad4455670
---

## 验证与标记
type: architecture
from: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md, phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md

```arch
node | test | 1,1 | 测试语音 | 至少 3 秒 | client
node | cm | 2,1 | 反伪造措施 | AASIST 或 RawNet2 | model
node | emb | 3,1 | 说话人编码器 | ECAPA-TDNN，192 维 | model
node | score | 4,1 | 余弦分数 | 用开发集设阈值 | process
node | gen | 1,2 | TTS 输出 | 每次生成 | model
node | wm | 2,2 | AudioSeal | 16 位载荷 | process
node | c2pa | 3,2 | C2PA 清单 | 签名元数据 | store
node | enr | 4,2 | 注册 | 3 至 5 段干净音频，取均值 | store
edge | test | cm | 真实或伪造
edge | cm | emb | 真实
edge | emb | score |
edge | enr | score | 锚点
edge | gen | wm |
edge | wm | c2pa | 签名
```

## 代码任务
type: task-table
from: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md, phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/code/main.py
span: 2

| 任务 | 代码 |
|---|---|
| 验证说话人 | `verify(enroll, test, threshold=0.75)` |
| EER 及其阈值 | `eer(same_scores, diff_scores)` |
| 会议说话人分离 | `Pipeline.from_pretrained("pyannote/speaker-diarization-3.1")` |
| 加载水印生成器 | `AudioSeal.load_generator("audioseal_wm_16bits")` |
| 检测水印 | `detector.detect_watermark(watermarked, sample_rate=16000)` |
| 简化伪造特征 | `spectral_rolloff(spec, percentile=0.85)` |
| 简化文本水印 | `watermarked_sample(n, seed_prefix, bias=0.9)` |
| 绿色 token z 分数 | `detect(tokens)` |

## 使用 ECAPA 验证
type: annotated-code
lang: python
from: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md

```python
from speechbrain.pretrained import EncoderClassifier
clf = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb")
enroll = torch.stack([clf.encode_batch(load(x))           # 3-5 个干净样本
                      for x in enrollment_clips]).mean(0)  # 取平均
score = clf.similarity(enroll, clf.encode_batch(load("test.wav"))).item()
verdict = score > 0.25                                     # 用自己的数据调优
```

## 嵌入与检测 AudioSeal
type: annotated-code
lang: python
from: phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md

```python
generator = AudioSeal.load_generator("audioseal_wm_16bits")
detector = AudioSeal.load_detector("audioseal_detector_16bits")
audio = load_wav("generated.wav", sr=16000)[None, None, :]
payload = torch.tensor([[1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1, 1, 0]])
watermark = generator.get_watermark(audio, sample_rate=16000, message=payload)
watermarked = audio + watermark
result, decoded_payload = detector.detect_watermark(watermarked, sample_rate=16000)
```

## 交付一次生成
type: flow
from: phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md

1. **同意**：使用克隆参考时，先调用 `verify_consent(user_id, clone_reference)`。
2. **合成**：`tts_model.synthesize(text, voice)`。
3. **水印**：`audioseal_embed(audio, payload=build_payload(user_id, model_id))`。
4. **签名**：`c2pa_sign(audio_with_wm, user_id, timestamp=now())` 生成清单。
5. **日志**：保留符合保留政策的审计日志。
6. **检查**：在 CI 中运行检测器。

## 公式
type: concepts
from: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/docs/zh.md, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/code/main.py, phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md

- **EER**：错误接受率等于错误拒绝率时的阈值。
- **AAM-softmax**：正确类别使用 $\cos(\theta + m)$。典型值 $m = 0.2$、$s = 30$。
- **验证**：1:1。辨识：1:N。开放集：测试集包含未注册说话人。
- **绿名单**：哈希前 K 个 token，给绿色 logit 加 $\delta$。
- **z 分数**：(绿色计数 - 期望计数) / $\sqrt{n p (1 - p)}$，$p = 0.5$。
- **比特恢复准确率**：攻击后恢复的载荷比特比例。

## 水印家族
type: concepts
from: phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/docs/zh.md

- **AudioSeal**：逐帧局部定位。可抵抗 MP3、AAC、EQ、±10% 变速、+10 dB SNR 噪声。
- **WavMark**：32 位/秒。高斯噪声或 MP3 压缩可移除它。
- **WaveVerify**：FiLM 生成器、混合专家检测器。可处理倒放与变速。
- **Stable Signature**：微调图像解码器实现。微调解码器可移除它。
- **SynthID-text**：有偏的下一 token 采样。改写会破坏它。
- **音高变换**：所有水印的比特恢复准确率都低于 0.6。

## 数值
type: defaults
from: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md, phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| ECAPA 嵌入 | 192 维 | WavLM-large 为 256 维 |
| ECAPA 阈值 | 0.25 | SpeechBrain 典型值，需要调优 |
| 注册样本 | 3-5 | 干净样本，取平均 |
| ECAPA 在 VoxCeleb1-O 上 | 0.87% | EER，15 M 参数 |
| ASVspoof 5 最佳水平 | 约 7.23% | EER；真实环境预计 5-10% |
| AudioSeal 载荷 | 16 位 | 16 kHz 下逐帧嵌入 |
| AudioSeal 检测器 | 实时速度的 485 倍 | 比 WavMark 快 1000 倍 |
| 文本水印 z | 4 | z >= 4 是很强的证据 |

## 缩写
type: glossary
from: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md, phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/docs/zh.md

- **ECAPA-TDNN**：一维卷积、压缩激励、注意力池化为 192 维。
- **PLDA**：概率 LDA。在余弦基础上做似然比评分。
- **AS-norm**：以冒名者群组归一化每个分数。
- **CM**：反伪造措施。区分真实语音与合成语音。
- **SASV**：将说话人验证与 CM 合为一个生物识别系统。
- **AASIST**：对频谱特征做图注意力，达到反伪造最佳水平。
- **C2PA**：经密码学签名、可检测篡改的来源元数据。
- **SynthID**：用于文本、图像、音频和视频的水印。

## 故障排查
type: troubleshooting
from: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md, phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 电话语音 EER 升高 | 在 VoxCeleb 网页视频上训练 | 在目标通道评估 |
| EER 显著恶化 | 测试音频少于 3 秒 | 获取更长测试音频 |
| 某说话人的锚点失效 | 注册样本只有一段且有噪声 | 对至少 3 个干净样本取平均 |
| 幅度主导分数 | 嵌入未归一化 | 先做 L2 归一化 |
| 检测器在真实环境失效 | AASIST 对 ASVspoof LA 过拟合 | 在自己的领域校准 |
| 编辑后水印消失 | 激进音高变换 | 保留备用检测手段 |
| 重新托管后清单丢失 | 元数据剥离与重编码 | 同时添加水印 |
| 文本水印消失 | 改写 | 不要仅依赖它 |

## 按场景选择
type: tips
from: phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md, phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md

- 边缘端封闭集 1:1：ECAPA-TDNN 加余弦阈值。
- 云端开放集：WavLM-SV 加 AS-norm。
- 会议与播客：`pyannote/speaker-diarization-3.1`。
- 交付 TTS 或克隆：每个输出添加 AudioSeal。
- 语音解锁：AASIST 与 ECAPA 集成，加活体挑战。
- 呼叫中心欺诈：对 20% 通话样本运行 AASIST。

## 问答
type: qa
from: phases/06-speech-and-audio/16-anti-spoofing-audio-watermarking/docs/zh.md, phases/18-ethics-safety-alignment/23-watermarking-synthid-stable-signature-c2pa/docs/zh.md, phases/06-speech-and-audio/06-speaker-recognition-verification/docs/zh.md

- **水印还是检测器？** 两者都用。音高变换可移除多数水印。
- **活体短语能阻止克隆吗？** 能阻止重放，不能阻止实时克隆。
- **没有 SynthID 信号就代表真实吗？** 不代表。其他模型不会添加该信号。
- **为何 C2PA 与水印一起用？** 元数据丰富但可剥离，水印持久但只能携带少量比特。
- **报告 EER 时还需什么？** EER 及其对应阈值。
