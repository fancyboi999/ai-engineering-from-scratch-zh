# Evidence: cheatsheets/audio-features.md
upstream_revision: 45fa4084de6ba2f88fa96a41e69efa2166f868b3

# 证据对照：音频特征、分类与指标

中文主题：[音频特征、分类与指标](../audio-features.md)。下列逐条英文记录保留冻结上游版本的路径、行号与数值；标题对应中文主题。

原始记录中的 docs/en.md 和行号只在上述 upstream 版本有效，不代表当前 docs/zh.md 的行号，也不表示本次重新运行了命令、GPU 测量或外部模型。当前中文主题的 from 路径另由构建器校验。

Abbreviations: P06 = phases/06-speech-and-audio. L01 = P06/01-audio-fundamentals, L02 = P06/02-spectrograms-mel-features, L03 = P06/03-audio-classification, L17 = P06/17-audio-evaluation-metrics. d = docs/en.md, c = code/main.py.

## 从波形到标签 (architecture)

原始区块：Waveform to label (architecture, 8 nodes, 7 edges)
- Waveform, floats in [-1, 1]: L02/d:12, L01/d:26
- Frames, 400 samples, hop 160: L02/d:22
- STFT, Hann window, FFT: L02/d:22
- Mel filterbank, 80 triangles: L02/d:26, 28
- Log-mel, Whisper input: L02/d:30, 165
- MFCC, DCT-II, keep 13: L02/d:32
- Pool, mean + var, 26 dims: L03/d:81
- Classifier k-NN, CNN, AST, BEATs: L03/d:20-26
- edge magnitude (STFT magnitude into filterbank): L02/d:28
- edge cosine (k-NN cosine similarity): L03/c:112-122

## 公式 (concepts)

原始区块：Formulas (concepts, 8)
- t = n / sr, 10 s at 16 kHz = 160,000 floats: L01/d:26
- Nyquist sr/2, aliasing: L01/d:39
- 7 kHz at 10 kHz folds to 3 kHz: L01/d:97
- bin k = k · sr / N, resolution sr / N: L01/d:43, 132
- mel formula: L02/d:26
- Hann formula: L02/d:57-58
- frames 1 + (len - frame_len) // hop, 998 frames: L02/d:45-50
- Mixup formula: L03/d:173

## 特征默认值 (defaults)

原始区块：Feature defaults (defaults, 8)
- Frame length 400, 25 ms at 16 kHz: L02/d:22
- Hop 160, 10 ms: L02/d:22, 160
- Window Hann, tapers edges to zero: L02/d:22, 161
- 80 mel bins, 0 to 8 kHz: L02/d:26
- 128 log-mels for AST, PANNs, BEATs: L02/d:130
- MFCC 13, first coefficient energy, dropped: L02/d:32, 120
- eps 1e-10, log(mel_spec + 1e-10): L02/d:30, 103
- Keyword spotting 40 MFCCs for tiny devices: L02/d:133

## 代码中的任务 (task-table)

原始区块：Tasks in code (task-table, 8)
- sine(freq_hz, sr, seconds, amp=0.5): L01/c:14
- peak_freq(samples, sr): L01/c:60
- frame_signal(signal, frame_len, hop): L02/c:43
- stft_magnitude(signal, frame_len, hop): L02/c:50
- mel_filterbank(n_mels, n_fft, sr): L03/c:61
- log_transform(mel_spec, eps=1e-10): L02/c:100
- dct_ii(x, n_coeffs): L02/c:104
- knn(q, bank, labels, k=3): L03/c:119

## MFCC k-NN 基线 (annotated-code)

原始区块：MFCC k-NN baseline (annotated-code, 8 lines)
- sr = 8000: L03/c:127
- stft_mag, Hann then DFT: L03/c:47-50, 98
- mel_filterbank(n_mels, frame_len, sr), half = n_fft // 2 + 1: L03/c:65, 99
- apply_filterbank weighted sum: L03/c:77-82, 100
- log_transform log(max(v, eps)): L03/c:85-86, 101
- dct_ii per frame, n_mfcc=13: L03/c:97, 102
- summarize mean + var, 26 dims: L03/c:105-109, L03/d:81
- knn(feat, X_train, y_train, k=3), cosine top k majority vote: L03/c:119-122, 154

## 模型评分 (annotated-code)

原始区块：Score a model (annotated-code, 8 lines)
- jiwer import and Compose transform: L17/d:123-125
- wer(truth=..., hypothesis=..., transforms), ~0.17: L17/d:126-132
- EncoderClassifier.from_hparams("speechbrain/spkrec-ecapa-voxceleb"): L17/d:150-151
- cosine_similarity(emb_ref, emb_clone, dim=-1).item(): L17/d:155
- FrechetAudioDistance, get_fad_score: L17/d:161-163
- FAD lower better: L17/d:78

## 库与工具 (command-table)

原始区块：Libraries (command-table, 8)
- soundfile, WAV/FLAC/OGG, float32: L01/d:105
- torchaudio.transforms.Resample, anti-aliasing built in: L01/d:106
- numpy.fft.rfft: L01/d:89
- torch.stft vectorized: L02/d:72
- librosa.power_to_db reference-normalized dB: L02/d:107
- ffprobe reports sr/channels/codec: L01/d:109
- jiwer WER/CER with normalization: L17/d:32, 222
- ASTForAudioClassification.from_pretrained: L03/d:125-128

## 选择分类器 (concepts)

原始区块：Pick a classifier (concepts, 7)
- Tiny dataset (<1000 clips) k-NN on MFCC means + augmentation: L03/d:146
- Medium 1K–100K BEATs or AST fine-tune: L03/d:147
- Large >100K from scratch or Whisper-encoder: L03/d:148
- Real-time edge 40-MFCC CNN int8: L03/d:149
- Multi-label BEATs-iter3 BCE + mixup + SpecAugment: L03/d:150
- Exclusive: top-1, top-5 accuracy: L03/d:40
- Imbalanced: per-class recall + macro F1: L03/d:42

## 指标 (glossary)

原始区块：Metrics (glossary, 9)
- WER (S + D + I) / N: L17/d:32, 210
- CER tone languages: L17/d:34
- RTFx audio seconds per wall-clock second, higher better: L17/d:36
- MOS 1-5, 20+ listeners, 100+ samples: L17/d:42
- UTMOS ~0.9 correlation: L17/d:44
- SECS ECAPA cosine, > 0.75 recognizable clone: L17/d:46
- EER FAR = FRR, ECAPA VoxCeleb1-O 0.87%: L17/d:58
- DER (FA + Miss + Confusion) / total_speaker_time: L17/d:64
- FAD Fréchet distance on VGGish embeddings, lower better: L17/d:78, 217

## 故障排查 (troubleshooting)

原始区块：Troubleshooting (troubleshooting, 8)
- 44.1 kHz stereo into Whisper, 16 kHz mono float32: L01/d:111
- energy above Nyquist aliased, low-pass before downsampling: L01/d:39
- mel count mismatch 80 vs 128, log feature shape: L02/d:139
- mels at 22.05 kHz, fix SR before featurization: L02/d:140
- dB vs log, custom code will not autodetect: L02/d:141
- normalization drift doubles WER: L02/d:142
- zero-padding flat trailing frames, pad symmetrically or replicate: L02/d:143
- 5% WER hides 30% on accented speech, report by slice: L17/d:193

## 问答 (qa)

原始区块：Questions (qa, 6)
- mel matches log pitch perception: L02/d:16
- window removes spectral leakage: L02/d:61
- raw magnitudes span 5-6 orders: L02/d:24
- larger FFT: better frequency, worse time resolution: L02/d:34
- DFT O(N²), FFT O(N log N): L01/d:45, 89
- minDCF weighted cost at operating point: L17/d:60

## 提示 (tips)

原始区块：Tips (tips, 7)
- match sample rate first: L01/d:111
- start with 80 log-mels unless music: L02/d:135
- start with a frozen backbone: L03/d:153
- balanced sampling in training, not evaluation: L03/d:34
- normalize before scoring, report the rule: L17/d:184
- P50/P95/P99 for latency: L17/d:185
- in-house held-out set, benchmark saturation: L17/d:194
