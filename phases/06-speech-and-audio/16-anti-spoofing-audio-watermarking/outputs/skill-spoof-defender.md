---
name: spoof-defender
description: 为语音生成 / 声纹认证部署选择检测模型、水印、溯源清单和运维预案。
version: 1.0.0
phase: 6
lesson: 16
tags: [anti-spoofing, watermark, audioseal, asvspoof, c2pa, voice-fraud]
---

拿到负载情况（语音生成还是声纹认证、部署规模、合规区域、攻击者画像）后，输出：

1. 检测（CM）。AASIST · RawNet2 · NeXt-TDNN + WavLM · 商业方案（Pindrop、Validsoft）。训练数据：ASVspoof 2019 / ASVspoof 5 / 领域数据。目标 EER。
2. 水印（对外生成）。AudioSeal 16 位载荷，编码 `(model_id, user_id, generation_ts)` · WaveVerify（替代方案）· 不加（需给出理由）。每条输出上线前，CI 都运行检测器。
3. 溯源。用部署方密钥签名的 C2PA 清单 · IPTC 元数据 · 不加（非面向消费者的音频）。
4. 声纹认证护栏（如适用）。活体挑战（TTS 播报随机短语 + 转写比对）、重放攻击检测（AASIST + PA 模型）、按信道校准生物识别阈值。
5. 运维。审计日志保留、同意凭证保留（7 年以上）、滥用检测信号（请求量突增、具名人物 prompt）、紧急关停流程。

语音生成部署没有 AudioSeal（或同等水印），一律拒绝。声纹生物识别部署没有反伪造检测，拒绝：有了声音克隆，只靠余弦相似度的认证轻易就能绕过。只依赖溯源清单的部署拒绝（清单可以被剥掉）。真实场景部署直接用 ASVspoof 2019 训练出的检测阈值、不做信道校准扫描，拒绝。

示例输入："银行客服 IVR。声纹解锁 + AI 生成的语音 agent。每月 1000 万通电话。美国 + 欧盟。"

示例输出：
- 检测：首选商业方案 Pindrop，或开源的 NeXt-TDNN + WavLM。在 ASVspoof 5 + 10 万条银行专属通话样本上训练。领域内数据目标 EER &lt; 0.5%。
- 水印：每条对外 TTS 语音都加 AudioSeal 16 位载荷；载荷编码 bank_id + session_id + 时间戳。发送前由检测器验证。
- 溯源：在向客户导出音频的流程上加 C2PA 清单；纯内部通话跳过。
- 声纹认证：每次认证都做活体挑战（TTS 播报随机 4 位数字短语；用户复述 + 检测器 + 转写器）。每次呼入认证尝试都运行反伪造检测。生物识别阈值设在 FAR 0.1%、FRR 1%。
- 运维：同意凭证 + 审计日志在本区域保留 7 年（EU 数据驻留 EU）。克隆请求量突增 &gt; 2σ 时告警；检测到滥用时触发紧急关停。
