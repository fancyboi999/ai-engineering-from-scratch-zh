---
name: video-qa
description: 构建视频理解流水线，包含场景切分、多向量索引、时间定位和带时间戳的引用。
version: 1.0.0
phase: 19
lesson: 12
tags: [capstone, video, multimodal, gemini, qwen-vl, molmo, transnet, qdrant]
---

给定 100 小时的视频，构建一条摄取流水线和一个查询系统，用 (start, end) 时间戳加帧预览来回答自然语言问题。

构建计划：

1. 摄取视频（YouTube URL 或 MP4）；必要时降采样到 720p。
2. 用 TransNetV2 或 PySceneDetect 做场景切分；产出 `[{scene_id, start_ms, end_ms, keyframe_path}]`。
3. 用 Whisper-v3-turbo（faster-whisper）做 ASR，生成词级时间戳；按场景切片。
4. 用 Gemini 2.5 Pro、Qwen3-VL-Max 或 Molmo 2 做 VLM 描述；产出描述文本 + 帧嵌入。
5. Qdrant 多向量索引：每个场景三个命名向量（caption_emb、frame_emb、transcript_emb），payload 为 {video_id, scene_id, start_ms, end_ms, keyframe_url}。
6. 查询：三路稠密查询并行；用倒数排名融合合并；取 top-k=5 个场景。
7. 时间定位（TimeLens 适配器或 VideoITG）在排名第一的场景内细化 (start, end)。
8. VLM 合成（Gemini 2.5 Pro），输入为查询 + top-3 场景片段 + 转写文本；强制要求 `(video_id, start_ms, end_ms)` 引用。
9. 在 ActivityNet-QA、NeXT-GQA 以及一套 100 条人工标注的自定义查询集上评估。报告总体准确率和各题型（描述类、计数类、动作类型类）的准确率。

评分标准：

| 权重 | 评分项 | 衡量方式 |
|:-:|---|---|
| 25 | 时间定位 IoU | 留出定位集上的 IoU |
| 20 | 问答准确率 | NeXT-GQA 和 100 条自定义查询集 |
| 20 | 摄取吞吐 | 每美元能索引的视频小时数 |
| 20 | UI 与引用体验 | 时间戳链接、缩略图条、跳转到帧 |
| 15 | 幻觉率 | 计数类和动作类型类准确率单独报告 |

直接否决：

- 流水线把每个场景池化成单个向量。必须用多向量，题型之间的差异才能体现出来。
- 回答没有 (start, end) 引用。
- 只报告一个总体准确率，没有按计数/动作子集拆分。
- VLM 合成时没有直接拿到场景帧（只输入文本会丢掉视觉依据）。

拒绝规则：

- 许可证来源不明的视频拒绝提供服务；每个 video_id 都必须带许可证标签。
- 摄取速率超过实测吞吐时，拒绝声称"实时"响应。
- 拒绝把计数/动作类的幻觉数字藏在总体准确率里。

输出：一个仓库，包含场景切分 + ASR + 描述生成流水线、多向量 Qdrant collection、时间定位适配器、带时间戳深链接的 Next.js 15 查看器、三项基准的评估结果（ActivityNet-QA、NeXT-GQA、自定义集），以及一份说明文档，写出你观察到的三类计数或动作类型失败，以及缓解每一类的检索或合成改动。
