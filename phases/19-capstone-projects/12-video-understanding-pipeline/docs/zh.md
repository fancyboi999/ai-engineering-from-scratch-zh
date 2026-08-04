# 顶点项目 12 —— 视频理解流水线（场景、问答、搜索）

> Twelve Labs 把 Marengo + Pegasus 产品化了。VideoDB 出了 CRUD-for-video 的 API。AI2 的 Molmo 2 发布了开源 VLM checkpoint。Gemini 长上下文原生处理数小时的视频。TimeLens-100K 在规模上定义了时间定位。2026 年的流水线已经定型：场景切分、逐场景 caption + embedding、转写对齐、多向量索引，以及一个用 (start, end) 时间戳加帧预览作答的查询。这个顶点项目就是摄入 100 小时、刷公开基准、并衡量计数和动作类问题上的幻觉。

**类型：** Capstone
**语言：** Python（流水线）、TypeScript（UI）
**前置要求：** 第 4 阶段（CV）、第 6 阶段（语音）、第 7 阶段（transformer）、第 11 阶段（LLM 工程）、第 12 阶段（多模态）、第 17 阶段（基础设施）
**涉及阶段：** P4 · P6 · P7 · P11 · P12 · P17
**预计时间：** 30 小时

## 问题背景

长视频问答是 2026 年规模下最吃带宽的多模态问题。Gemini 2.5 Pro 能原生读一个 2 小时的视频，但把 100 小时视频摄入成一份可查询的语料，仍然需要一个场景级索引。生产形态把场景切分（TransNetV2 或 PySceneDetect）、用 VLM 做逐场景 captioning（Gemini 2.5、Qwen3-VL-Max 或 Molmo 2）、转写对齐（带词级时间戳的 Whisper-v3-turbo），以及一个把 caption、帧 embedding、转写并排存的多向量索引结合起来。查询流水线用 (start, end) 时间戳加帧预览作答。

基准是公开的（ActivityNet-QA、NeXT-GQA）加上你自己的 100 问自定义集。计数和动作类问题上的幻觉是出了名难的失败类别；这个顶点项目明确地衡量它。

## 核心概念

摄入时三条流水线并行跑。**场景切分**把视频切成场景。**VLM captioning** 为每个场景生成一个 caption，并从一个关键帧生成一个帧 embedding。**ASR 对齐**产出词级时间戳。这三条流按 (scene_id, 时间范围) 连起来。每个场景在一个多向量索引（Qdrant）里拿到三种向量类型：caption embedding、关键帧 embedding、转写 embedding。

查询时，自然语言问题对全部三种向量发起检索；结果用 RRF 合并；一个时间定位适配器（TimeLens 风格）在最佳场景内细化 (start, end) 窗口。VLM 合成器（Gemini 2.5 Pro 或 Qwen3-VL-Max）接收 查询 + 最佳场景 + 裁剪过的帧，用带引用的时间戳和一个帧预览作答。

幻觉的衡量很重要。计数（“有多少人进了房间？”）和动作类（“厨师是先倒再搅吗？”）问题是出了名地不可靠。把这类的准确率跟描述性问题分开报告。

## 架构

```
video file / URL
      |
      v
PySceneDetect / TransNetV2  (scene segmentation)
      |
      +--- per-scene keyframe --- VLM caption + frame embedding
      |                            (Gemini 2.5 Pro / Qwen3-VL-Max / Molmo 2)
      |
      +--- audio channel --- Whisper-v3-turbo ASR + word timestamps
      |
      v
multi-vector Qdrant: {caption_emb, keyframe_emb, transcript_emb}
      |
query:
  dense queries against all three -> RRF merge -> top-k scenes
      |
      v
TimeLens / VideoITG temporal grounding (refine start/end within scene)
      |
      v
VLM synth: query + top scenes + frame previews
      |
      v
answer + (start, end) timestamps + frame thumbs + citations
```

## 技术栈

- 场景切分：TransNetV2（2024-26 SOTA）或 PySceneDetect
- ASR：通过 faster-whisper 的 Whisper-v3-turbo，带词级时间戳
- VLM captioner + 作答器：Gemini 2.5 Pro 或 Qwen3-VL-Max 或 Molmo 2
- 时间定位：TimeLens-100K 训练的适配器或 VideoITG
- 索引：带多向量支持的 Qdrant（caption / 帧 / 转写）
- UI：Next.js 15，配 HTML5 视频播放器和场景缩略图
- 评测：ActivityNet-QA、NeXT-GQA、自定义 100 问手工标注集
- 幻觉基准：带手工标签的计数和动作类子集

```figure
cf-scene-index
```

## 动手构建

1. **摄入遍历器。** 接收 YouTube URL 或本地 MP4。必要时降采样到 720p。持久化 `{video_id, file_path}`。

2. **场景切分。** 跑 TransNetV2 或 PySceneDetect，产出 `[{scene_id, start_ms, end_ms, keyframe_path}]`。目标 100 小时：约 6k-8k 个场景。

3. **ASR 遍历。** 在音频上跑 Whisper-v3-turbo；导出词级时间戳；切成逐场景的转写切片。

4. **VLM captioning。** 每个场景，用关键帧和一个简短的 caption 模板调 Gemini 2.5 Pro（或 Qwen3-VL-Max）。产出 caption + 帧 embedding。

5. **多向量索引。** 带三个命名向量的 Qdrant collection。payload：`{video_id, scene_id, start_ms, end_ms, keyframe_url}`。

6. **查询。** 自然语言问题发起三个 dense 查询；用倒数排名融合合并；top-k=5 个场景。

7. **时间定位。** 在最佳场景上跑 TimeLens 风格适配器，细化场景内的 (start, end) 窗口。

8. **VLM 合成。** 用 查询 + top-3 场景片段（作为图像或短片段）+ 转写 调 Gemini 2.5 Pro。要求 `(video_id, start_ms, end_ms)` 引用。

9. **评测。** 跑 ActivityNet-QA 和 NeXT-GQA。建一个 100 问自定义集。报告整体准确率 + 逐类别拆分（计数、动作、描述）。

## 实际使用

```
$ video-qa ask --url=https://youtube.com/watch?v=X "how many cars pass the intersection in the first minute?"
[scene]    23 scenes detected
[asr]      transcript complete, 4m12s
[index]    69 vectors written (23 scenes x 3)
[query]    top scene: scene 3 [01:32-01:54], confidence 0.84
[ground]   refined window: [00:12-00:58]
[synth]    gemini 2.5 pro, 1.4s
answer:    5 cars pass the intersection between 00:12 and 00:58.
citations: [scene 3: 00:12-00:58]
          [frame preview at 00:14, 00:27, 00:44, 00:51, 00:57]
```

## 拿去用

`outputs/skill-video-qa.md` 是交付物。给定一个 YouTube URL 或上传的视频，流水线给场景建索引，并用带时间戳的引用作答。

| 权重 | 标准 | 怎么衡量 |
|:-:|---|---|
| 25 | 时间定位 IoU | 留出定位集上的交并比 |
| 20 | 问答准确率 | NeXT-GQA 和自定义 100 问 |
| 20 | 摄入吞吐 | 每花一美元能处理多少小时视频 |
| 20 | UI 与引用体验 | 时间戳链接、缩略图条、跳转到帧 |
| 15 | 幻觉率 | 计数和动作类准确率分开算 |
| **100** | | |

## 练习

1. 在 captioning 遍历上把 Gemini 2.5 Pro 换成 Qwen3-VL-Max。在一个 50 场景的人评样本上报告 caption 质量差值。

2. 把逐场景帧 embedding 降成一个池化向量而不是多向量。衡量检索倒退。

3. 做一个“计数严格”模式：合成器把每个被计数的实例连同时间戳抽出来，用户点击核实。衡量用户核实是否减少了幻觉。

4. 给摄入成本跑基准：三种 VLM 选择下的 每美元处理视频小时数。挑那个甜点。

5. 加说话人分离的转写：在音频上跑 pyannote 说话人分离，并对逐说话人转写做 embedding。演示“Alice 关于 X 说了什么？”这类查询。

## 关键术语

| 术语 | 大家嘴上怎么说 | 它实际是什么 |
|------|-----------------|------------------------|
| Scene segmentation（场景切分） | “镜头检测” | 在镜头边界处把视频切成场景 |
| Multi-vector index（多向量索引） | “caption + 帧 + 转写” | 每种表示一个命名向量的 Qdrant collection |
| Temporal grounding（时间定位） | “它到底什么时候发生的” | 为一个查询答案细化 (start, end) 窗口 |
| Frame embedding（帧 embedding） | “视觉表示” | 一个关键帧的向量 embedding；用于场景视觉相似度 |
| RRF fusion（RRF 融合） | “倒数排名融合” | 跨多个排序列表的合并策略；经典的混合检索技巧 |
| Counting hallucination（计数幻觉） | “数错了” | VLM 在“有多少 X”问题上的已知失败模式 |
| ActivityNet-QA | “视频问答基准” | 长视频问答准确率基准 |

## 延伸阅读

- [AI2 Molmo 2](https://allenai.org/blog/molmo2) —— 开源 VLM checkpoint
- [TimeLens (CVPR 2026)](https://github.com/TencentARC/TimeLens) —— 规模化的时间定位
- [Gemini Video long-context](https://deepmind.google/technologies/gemini) —— 托管参考
- [VideoDB](https://videodb.io) —— CRUD-for-video API 参考
- [Twelve Labs Marengo + Pegasus](https://www.twelvelabs.io) —— 商业参考
- [TransNetV2](https://github.com/soCzech/TransNetV2) —— 场景切分模型
- [PySceneDetect](https://github.com/Breakthrough/PySceneDetect) —— 经典的开源替代
- [ActivityNet-QA](https://arxiv.org/abs/1906.02467) —— 参考评测基准
