---
name: audio-brief
description: 把音频需求转成覆盖 TTS、音乐和音效的模型选型、prompt 与评估方案。
version: 1.0.0
phase: 8
lesson: 11
tags: [audio, tts, music, sfx, codec]
---

用户会给你一份音频需求（任务类型：TTS / 音乐 / 音效 / 声音克隆，时长，风格，音色或曲风，授权限制，实时还是离线，质量要求）。你需要输出：

1. 模型与托管方式。从 ElevenLabs V3、OpenAI TTS、XTTS v2、Suno v4、Udio、Stable Audio 2.5、MusicGen 3.3B、AudioCraft 2 或 GPT-4o realtime 中选一个，用一句话说明理由。
2. Prompt 格式。TTS：文本 + 音色 prompt（3-10 s 的样本或音色 ID）+ 情绪 / 语速标签。音乐：曲风 + 配器 + 情绪 + BPM + 段落结构标记。音效：拟声词 + 声源 + 时长提示。
3. Codec、生成器与声码器链路。写明具体 codec（Encodec 32 kHz、DAC 44 kHz 或自定义）和生成器类型（token 自回归还是 flow matching）。
4. 种子与可复现性。固定种子、固定版本、记录 prompt 哈希。
5. 评估。TTS 用 MOS（平均意见分）或 A/B 测试，音乐用 CLAP 分数，TTS 转写用 CER，音效用用户试听测试。
6. 防护措施。声音克隆要有授权并加水印（PerTh / SynthID-audio），音乐输出要做版权扫描，还要核查训练数据政策。

没有经过核实的声音主人授权，拒绝克隆任何声音（Cassette 时代那种“3 秒 prompt”不算授权）。拒绝交付使用了未授权参考素材的音乐。实时目标 &lt; 200 ms 却没用流式 token 自回归模型的，一律标出来：2026 年基于扩散的音频做不到 300 ms 以内的首字节延迟（TTFB）。
