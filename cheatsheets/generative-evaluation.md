---
id: generative-evaluation
title: 生成模型评估
code: EG
subtitle: FID、CLIP 分数、CMMD、Elo、WER、MOS、SECS、EER 与 FAD。涵盖代码、样本量和各指标的失效方式。
hue: 45
sources: phases/08-generative-ai/14-evaluation-fid-clip-score, phases/06-speech-and-audio/17-audio-evaluation-metrics, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified
source_hash: 81785e79b8446044
---

## FID 与 CLIP 分数
type: architecture
from: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md

```arch
node | real | 1,1 | 真实图像 | 留出集 | store
node | gen | 1,2 | 生成图像 | 至少 10k 张 | store
node | inc | 2,1 | Inception-v3 | 2048 维特征 | model
node | gauss | 3,1 | 高斯拟合 | 均值与协方差 | process
node | fid | 4,1 | FID | 越低越好 | client
node | prompt | 1,3 | Prompt | | client
node | clip | 2,3 | CLIP 编码器 | 图像与文本 | model
node | cos | 3,3 | 余弦相似度 | 逐图像计算 | process
node | score | 4,3 | CLIP 分数 | 越高越好 | client
edge | real | inc |
edge | gen | inc |
edge | inc | gauss | 两组特征
edge | gauss | fid | Fréchet 距离
edge | gen | clip |
edge | prompt | clip |
edge | clip | cos |
edge | cos | score | 30k 样本均值
```

## 生产评估报告
type: flow
from: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md

1. **样本质量**：使用 10-30k 个样本，与留出的真实集计算 FID。
2. **遵循程度**：在相同样本及其 prompt 上计算 CLIP 分数或 CMMD。
3. **偏好**：在盲测竞技场中对比上一版模型的胜率。
4. **失败审计**：随机抽 50 个输出，标记手部、文本和对象数量问题。
5. **种子**：至少运行 3 个种子。报告标准差。
6. **每个 PR**：在 500 个样本子集上计算 FID 与 CLIP 分数，约 30 分钟。
7. **每晚**：完整运行 10k 样本 FID、HPSv2 和 Elo。

## 公式
type: concepts
from: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md

- **FID**: $\lVert \mu_r - \mu_g \rVert^2 + \mathrm{Tr}(\Sigma_r + \Sigma_g - 2 (\Sigma_r \Sigma_g)^{0.5})$
- **CLIP 分数**：`CLIP_image(x_gen)` 与 `CLIP_text(prompt)` 的余弦相似度。
- **Elo 期望值**：$E_a = 1 / (1 + 10^{(r_b - r_a)/400})$
- **Elo 更新**：$r_a \leftarrow r_a + k (s_a - E_a)$。B 向反方向变化相同数值。
- **WER**：归一化后的 $(S + D + I) / N$。CER 使用字符。
- **DER**：(FA + Miss + Confusion) / 总说话时长。
- **EER**：FAR 等于 FRR 时的阈值。
- **Show-o 掩码比例**：$\cos\left(\frac{\pi t}{2T}\right)$，从第 0 步的 1.0 到第 T 步的 0。

## 图像指标代码
type: annotated-code
lang: python
from: phases/08-generative-ai/14-evaluation-fid-clip-score/code/main.py

```python
mu_r = mean_vec(real_features)
mu_g = mean_vec(gen_features)
cov_r = covariance(real_features, mu_r)
mean_sq = sum((a - b) ** 2 for a, b in zip(mu_r, mu_g))
sqrt_prod = jacobi_sqrt(prod)                    # 矩阵平方根
return mean_sq + trace(cov_r) + trace(cov_g) - 2 * trace(sqrt_prod)
score = clip_like(image, prompt)                 # 余弦相似度，越高越好
expected_a = 1 / (1 + 10 ** ((r_b - r_a) / 400))
actual_a = 1.0 if winner == "a" else 0.0
delta = k * (actual_a - expected_a)              # k=32
return r_a + delta, r_b - delta
```

## 音频指标代码
type: annotated-code
lang: python
from: phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

```python
transform = Compose([ToLowerCase(), RemovePunctuation(), Strip()])
score = wer(truth="<ref>", hypothesis="<hyp>",
            truth_transform=transform, hypothesis_transform=transform)
sv = EncoderClassifier.from_hparams("speechbrain/spkrec-ecapa-voxceleb")
emb_ref = sv.encode_batch(load_wav("reference.wav"))
emb_clone = sv.encode_batch(load_wav("cloned.wav"))
secs = torch.nn.functional.cosine_similarity(emb_ref, emb_clone, dim=-1).item()
fad = FrechetAudioDistance()
score = fad.get_fad_score("generated_folder/", "reference_folder/")
```

## 指标函数
type: task-table
from: phases/08-generative-ai/14-evaluation-fid-clip-score/code/main.py, phases/06-speech-and-audio/17-audio-evaluation-metrics/code/main.py, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

| 任务 | 代码 |
|---|---|
| 图像 FID | `fid(real_features, gen_features)` |
| 从成对结果更新 Elo | `elo_update(r_a, r_b, winner, k=32)` |
| 词错误率 | `wer(ref, hyp)` |
| 字符错误率 | `cer(ref, hyp)` |
| 等错误率 | `eer_from_scores(same, diff)` |
| 类 FAD 距离 | `embedding_fad_like(real_embeds, fake_embeds)` |
| 多选题准确率 | `mmau_accuracy(predictions, golds)` |
| TTS 往返 WER | `ttr_wer(tts_model, asr_model, texts)` |

## 图像指标对比
type: comparison
from: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md
span: 2

| 比较项 | FID | CLIP 分数 | CMMD | 人类偏好 |
|---|---|---|---|---|
| 测量内容 | 样本质量 | prompt 遵循程度 | 质量、细微差异 | 整体偏好 |
| 特征 | Inception-v3，2048 维 | CLIP 图像与文本 | CLIP | 人类或 LLM 评委 |
| 最低要求 | 10k，对比留出真实集 | 30k | 5k | 200 对盲测 |
| 弱点 | 样本少、领域偏离 ImageNet | 组合能力弱、prompt 短 | 未覆盖 | 评委方差、prompt 选择 |

## 统一模型的采样成本
type: comparison
from: phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md

| 比较项 | Chameleon, Emu3 | Transfusion | Show-o |
|---|---|---|---|
| 解码 | 自回归 token | 连续扩散 | 掩码离散扩散 |
| 步数 | 1024-4096 次前向传播 | 约 20 | 约 16 |
| 每步 | 一个 token | 完整 transformer 前向传播 | 提交前 K 个 token |

## 音频目标数值
type: concepts
from: phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

- **WER**：朗读语音上低于 5% 即达到人类水平。
- **UTMOS**：与人类 MOS 的相关性约 0.9。F5-TTS 为 3.95，真实音频为 4.08。
- **SECS**：高于 0.75 表示可辨识的克隆。
- **CLAP**：高于 0.3 表示文本与音频较好对齐。
- **EER**：ECAPA 在 VoxCeleb1-O 上为 0.87%。
- **FAD**：MusicGen-small 在 MusicCaps 上为 4.5。越低越好。
- **MMAU-Pro**：四选一随机准确率为 25%。
- **插话响应**：目标低于 150 ms。

## 默认值
type: defaults
from: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md, phases/08-generative-ai/14-evaluation-fid-clip-score/code/main.py, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/code/main.py

| 设置 | 默认值 | 说明 |
|---|---|---|
| Elo `k` | 32 | `elo_update` |
| Elo 初始评分 | 1000 | 两个模型相同 |
| FID 样本数 | 10k | 小样本 FID 不可靠 |
| CLIP 分数样本数 | 30k | 平均为一个标量 |
| Inception 输入 | 299×299 | 分辨率需一致 |
| MOS 听众数 | 20+ | 每模型 100+ 个样本 |
| Show-o 步数 `T` | 8 | 余弦调度 |
| 保留比例下限 | 0.15 | 每步的 `keep_ratio` |

## 故障排查
type: troubleshooting
from: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 少量样本得到低 FID | 小样本低估协方差 | 至少使用 10k 个样本 |
| FID 对人脸或艺术图像无意义 | Inception 在 ImageNet 上训练 | 使用领域提取器，如 FD-DINO |
| FID 随分辨率变化 | 缩放至 299×299 | 在相同分辨率比较 |
| CLIP 分数上升，图像未改善 | 使用“high quality, 4k, masterpiece” | 检查属性绑定与饱和情况 |
| Elo 无意义 | 模型见过基准 prompt | 使用留出 prompt 集 |
| 5% WER 掩盖口音样本的 30% | 使用汇总 WER | 按人口群体切片报告 |
| 克隆音频 UTMOS 差 | 模型在干净语音上训练 | 使用领域 MOS 评审组 |
| FAD 不可比 | 参考集不同 | 所有模型使用同一参考集 |

## 规则
type: tips
from: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md

- 计算 WER 前归一化文本。报告归一化规则。
- 报告分布。延迟用 P50/P95/P99，按类别和分类报告。
- 运行一个公开基准和一个内部留出集。
- 将真实特征一次性缓存为 `.npz` 文件。
- 使用 `num_images_per_prompt=8` 批量生成评估样本。
- 使用三种结论一致的指标，再做定性评审。

## 问答
type: qa
from: phases/08-generative-ai/14-evaluation-fid-clip-score/docs/zh.md, phases/06-speech-and-audio/17-audio-evaluation-metrics/docs/zh.md, phases/12-multimodal-ai/14-show-o-discrete-diffusion-unified/docs/zh.md

- **为何用 CMMD？** 它使用 CLIP 特征与 MMD，偏差更小，且不假设高斯分布。
- **SECS 高、MOS 低？** 音色正确，但声音不自然。
- **EER 还是 minDCF？** minDCF 更贴近生产，在某工作点按成本加权。
- **10k 个 SDXL 样本成本多少？** 单张 L4、一次一个请求，约 11 小时。
- **Show-o 为何能免费修补图像？** 它在训练时预测被遮盖的 token。
