# 视频-语言模型：时间 token 与 grounding

> 视频不是一摞照片。一段 5 秒的片段有因果顺序、动作动词和事件时序，是图像模型表示不了的。Video-LLaMA（Zhang 等人，2023 年 6 月）出货了第一个带视听 grounding 的开放视频 LLM。VideoChat 和 Video-LLaVA 放大了这个模式。到 2025 年，Qwen2.5-VL 的 TMRoPE 缩小了与前沿专有模型的差距。每个系统解决时间 token 的方式都不同——每片段一个 Q-former、每帧 concat-pool、每 token 一次 TMRoPE。本节课通读这些模式，搭一个均匀 vs 动态帧采样器，并在时间 grounding 任务上评测。

**类型：** Build
**语言：** Python（标准库，帧采样器 + 时间 grounding 评测器）
**前置要求：** Phase 12 · 08（LLaVA-OneVision）
**预计时间：** ~180 分钟

## 学习目标

- 解释为什么时间位置编码独立于视觉编码器改变视频 VLM 的性能。
- 在每秒 token 数 vs grounding 准确率上把均匀、动态 FPS、事件驱动三种帧采样作比较。
- 描述每片段一个 Q-former（Video-LLaMA）vs 每帧池化（Video-LLaVA）vs 每 token 一次 M-RoPE（Qwen2.5-VL）的设计。
- 说出四个视频基准：VideoMME、TempCompass、EgoSchema、Video-MMMU。

## 问题背景

一段 1 分钟、30 FPS 的视频是 1800 帧。每帧 196 个视觉 token（224 下的 ViT-B）算，就是 35.2 万个 token——比任何 2024 年时代的 LLM 上下文都大。

存在三种缩减策略：

1. 帧下采样（按内容 1-8 FPS）。
2. 激进地池化每帧的 patch token（3x3 或 4x4 双线性池化）。
3. 用一个 Q-former 压缩，它吃一段 16 帧片段、吐 64 个 token。

每种取舍都不同。下采样丢时间细节。池化丢空间细节。Q-former 两者各丢一点但省 token。

时间位置编码是另一条轴：模型怎么知道第 5 帧在第 6 帧之前？选项包括简单的一维时间 RoPE（Video-LLaMA）、学出来的时间嵌入（Video-LLaVA），以及 TMRoPE（Qwen2.5-VL，完整 3D）。

## 核心概念

### Video-LLaMA：每片段一个 Q-former + 音频分支

Video-LLaMA（2023）是第一个开放视频 LLM。架构：

- 2 FPS 下的 16 帧片段（即 8 秒）。
- 逐帧 ViT 特征 -> 视频 Q-former，它交叉关注全部 16 帧 -> 32 个学出的 query -> LLM。
- 并行音频分支：波形 -> ImageBind 音频编码器 -> 音频 Q-former -> 32 个 query -> LLM。

强项：视听联合推理。弱项：片段长度固定，无任意时间 grounding。

### VideoChat 与 Video-LLaVA

VideoChat 保留 Video-LLaMA 的想法但去掉了音频并简化。Video-LLaVA（Lin 等人，2023）在图像和视频帧上训了单个视觉编码器（"投影前对齐"），给出统一表示。两者都是冻结 CLIP 编码器 + MLP + LLM。

两者都不处理长视频。都是 8-16 帧系统。

### Qwen2.5-VL 与 TMRoPE

Qwen2.5-VL 引入了 TMRoPE——时间-模态旋转位置嵌入。每个 patch token 携带一个 (t, h, w) 位置，其中 t 是真实时间戳（不是帧索引）。

与简单时间嵌入的关键区别：

- 绝对时间，不是索引。模型看到"在 4.2 秒"，而非"在第 15 帧"。
- 每 token 旋转，不是每片段。每个视觉 token 按它的时间戳独立旋转。
- 与动态 FPS 兼容。如果你这里按 2 FPS、那里按 4 FPS 采样，TMRoPE 原生处理这种不均匀间距。

TMRoPE 让"猫在第几秒跳起来？"这类查询成为可能。模型能输出"在 4.2 秒"。Video-LLaMA 只能说"片段早段"。

### 帧采样策略

均匀：在时长上均匀采 N 帧。简单，丢掉运动峰值。

动态 FPS：基于运动强度自适应采样。光流或帧差分挑出高运动段做更密集采样。Qwen2.5-VL 在这上面训练。

事件驱动：跑一个轻量检测器，在有动作的地方多采。VideoAgent 用这个。

关键帧 + 上下文：在镜头边界 + 邻近几帧采样。用于影视内容。

### 每帧池化

在 1 FPS、每帧 576 token 下，一段 5 分钟片段是 172,800 个 token。用 Qwen2.5-VL-72B 的 128k 上下文能做，但贵。

3x3 双线性池化减到每帧 64 token -> 5 分钟 19,200 个 token。大多数任务的甜点区。

对空间细节没那么要紧的 agent 工作流，池化更激进（6x6 -> 每帧 16 token）。

### 四个视频基准

- VideoMME：综合视频理解，短 + 中 + 长。
- TempCompass：细粒度时间推理，"之前"/"之后"类问题。
- EgoSchema：长时程第一人称视频。
- Video-MMMU：多模态多学科视频问题。

一次完整的视频 VLM 评测会全打到这四个。它们各压不同的轴——TempCompass 全是关于排序，EgoSchema 关于 3 分钟以上推理，VideoMME 横跨时长。

### grounding 输出格式

时间 grounding 的输出格式：

- 自由文本："猫在大约 4 秒处跳起。"易解析但不精确。
- 结构化 JSON：`{"event": "jump", "start": 4.1, "end": 4.3}`。Qwen2.5-VL 训这个。
- 基于 token：与答案交错的特殊 `<time>4.1</time>` token。Qwen2.5-VL 的内部格式。

基于 token 的对下游使用最准。Qwen2.5-VL 的 JSON 输出格式可直接解析。

### 2026 年最佳实践

2026 年的视频 VLM：

- 编码器：带 M-RoPE 或 TMRoPE 的 SigLIP 2（Qwen2.5-VL）。
- 帧采样：动态 FPS（按运动 1-4）配最大帧上限。
- 每帧池化：3x3 双线性。
- 输出：带 time + event 字段的结构化 JSON。
- 基准：通用用 VideoMME + TempCompass；长时程用 EgoSchema。

```figure
video-temporal-patches
```

## 实际使用

`code/main.py` 包含：

- 均匀和动态 FPS 帧采样器。
- 一个玩具时间 grounding 评测器：给定时间 T 处的"真值"事件和一个模型输出，带容差地为准确率打分。
- 一份横跨 Video-LLaMA（16 帧，Q-former）、Video-LLaVA（8 帧，MLP）、Qwen2.5-VL（动态 FPS + TMRoPE）的对比。

## 拿去用

本节课产出 `outputs/skill-video-vlm-frame-planner.md`。给定一个视频任务（监控、动作识别、时间 grounding、摘要），它挑出帧采样器、池化倍数、输出格式和预期准确率档。

## 练习

1. 对一段 3 分钟烹饪演示，在均匀 vs 动态 FPS 之间挑选。用一个 token 数来辩护。

2. TMRoPE 具体加入了什么是简单时间嵌入表做不到的？

3. 写一个 VLM 能学会吐出的时间 grounding JSON schema。包含错误情形。

4. 读 Video-LLaVA 第 3 节关于"投影前对齐"的内容。为什么这比训分开的图像和视频编码器更好？

5. 给定 VideoMME 排行榜，截至 2026 年顶级开放模型与顶级专有模型的差距有多大？这差距里有多少能归因于时间编码 vs 基座 LLM 规模？

## 关键术语

| 术语 | 大家怎么说 | 它实际指什么 |
|------|-----------------|------------------------|
| 时间 grounding | "时间定位的答案" | VLM 为某事件何时发生输出一个具体的时间戳范围 |
| TMRoPE | "时间-多模态 RoPE" | 带绝对时间戳的 3D 旋转位置，Qwen2.5-VL 所用 |
| 动态 FPS | "运动感知采样" | 在高运动段多采帧，在静态段少采 |
| 帧池化 | "每帧空间压缩" | 在进 LLM 前用双线性插值减少每帧 patch |
| 视频 Q-former | "片段压缩器" | 把 N 帧映射到 K 个学出 query 的交叉注意力瓶颈 |
| VideoMME | "视频基准" | 综合短/中/长视频基准，2500+ 样本 |

## 延伸阅读

- [Zhang et al. — Video-LLaMA (arXiv:2306.02858)](https://arxiv.org/abs/2306.02858)
- [Li et al. — VideoChat (arXiv:2305.06355)](https://arxiv.org/abs/2305.06355)
- [Lin et al. — Video-LLaVA (arXiv:2311.10122)](https://arxiv.org/abs/2311.10122)
- [Qwen Team — Qwen2.5-VL (arXiv:2502.13923)](https://arxiv.org/abs/2502.13923)
- [Lin et al. — VILA-1.5 (arXiv:2312.07533)](https://arxiv.org/abs/2312.07533)
