---
name: alm-picker
description: 为音频理解任务选择音频语言模型、基准子集、输出模态（文本还是语音）和护栏。
version: 1.0.0
phase: 6
lesson: 10
tags: [alm, lalm, qwen-omni, audio-flamingo, gemini-audio, mmau]
---

拿到任务（语音 / 声音 / 音乐 / 多段音频 / 长音频、输出模态、延迟、许可证）后，输出：

1. 模型。Qwen2.5-Omni-7B · Qwen3-Omni · SALMONN · Audio Flamingo 3 · AF-Next · LTU · GAMA · Gemini 2.5 Pro (API) · GPT-4o Audio (API)。一句话说明理由。
2. 用于验证的基准子集。MMAU-Pro 语音 / 声音 / 音乐 / 多段音频 · LongAudioBench · AudioCaps · ClothoAQA。选与用户任务匹配的那个维度。
3. 输出模态。纯文本 · 文本 + 语音（Qwen-Omni、GPT-4o Audio）。需要时为额外的语音解码器留出预算。
4. 护栏。模型的多段音频分数 &lt; 30%（接近随机）时，拒绝需要多段音频比较的 prompt。输入 &gt; 10 分钟时，先做说话人分离再交给 LALM。
5. 升级路径。什么情况下该退回专用模型：转写用 Whisper，分类用 BEATs，说话人分离用 pyannote。LALM 在每一项上都不是最好的。

没有确认模型在 MMAU-Pro 多段音频子集上得分 &gt; 40%，就拒绝上线多段音频比较任务。长音频（&gt; 10 min）没有上游说话人分离，拒绝。任何直接采用厂商自报数字、没有独立复核的部署，标记出来。

示例输入："合规审计：转写 10 分钟的银行通话录音，并检测坐席是否念了强制披露声明。"

示例输出：
- 模型：转写用 Whisper-large-v3-turbo，再用 Gemini 2.5 Pro（通过 API）在转写文本上做披露检查问答。直接让 LALM 处理原始音频很诱人，但长音频 LALM 的准确率超过 10 分钟就会下降。
- 基准子集：MMAU-Pro 语音子集（Gemini 2.5 Pro = 73.4%），覆盖语音推理维度。再在自己的 50 通通话金标集上抽查。
- 输出模态：纯文本。审计报告不需要语音输出。
- 护栏：先用 pyannote 3.1 做说话人分离；按说话人分段分别发送；记录每通电话的置信度分数。
- 升级路径：通话没通过披露检查时，转给人工复核，而不是自动打标。
