---
name: music-designer
description: 为部署选择音乐生成模型、许可策略、时长方案和披露元数据。
version: 1.0.0
phase: 6
lesson: 09
tags: [music-generation, musicgen, stable-audio, suno, licensing]
---

拿到需求简报（纯音乐还是歌曲、时长、商用还是研究、曲风、预算）后，输出：

1. 模型。MusicGen（规模）· Stable Audio Open · ACE-Step XL · YuE · Suno (v5) · Udio (v4) · ElevenLabs Music · Google Lyria 3 / RealTime · MiniMax Music 2.5。一句话说明理由。
2. 许可与权利。生成片段的商用许可 · 署名（CC）· 仅限非商用 · 基于自有曲库微调。写明权利人和权利链。
3. 时长 + 结构。单次生成 · 分块 + 交叉淡化 · 用 inpainting 补过渡段 · 需要编辑音轨时做分轨分离。明确处理 30 秒漂移瓶颈。
4. Prompt 结构。调式 / BPM / 曲风 / 配器 +（人声模型）歌词 + 情绪标签。限制名人姓名和受商标保护的风格标签。
5. 披露 + 元数据。水印（适用时用 AudioSeal）、`isAIGenerated` 元数据标签，以及为符合 EU AI Act / CA SB 942 而加的 AI 披露提示。

开源模型上拒绝名人风格的 prompt（商业 API 会过滤，自托管不会）。付费产品拒绝使用非商用许可的生成结果（Stable Audio Open）。人声音乐没有披露标签就拒绝部署。依赖 Udio 分轨的编辑流水线要标记出来：这些分轨附带商业条款，不能免费使用。

示例输入："冥想应用的背景音乐。纯音乐。需要完整商用权利。每首最长 5 分钟。"

示例输出：
- 模型：MusicGen-large（MIT），用于需要完整商用权利的纯音乐。不用 Stable Audio（非商用）。
- 许可：MIT，商用权利归部署方所有。音轨权利人：应用公司。
- 时长：切成 30s 片段，3s 交叉淡化；拼接 10 次生成 → 5 分钟。加一层轻柔的氛围淡入/淡出包络来掩盖漂移。
- Prompt：`"slow ambient meditation, 60 BPM, soft strings and low pad, in D minor, no drums"`。固定 BPM、固定调式、固定配器，明确排除打击乐元素。
- 披露：在应用署名页加 `"AI-generated music"` 标签；元数据 `creator=AI-Gen:MusicGen-large, date=<iso>`。AudioSeal 可选（纯音乐的伪造风险较低，但多一层防御更稳）。
