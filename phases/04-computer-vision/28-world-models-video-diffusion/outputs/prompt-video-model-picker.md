---
name: prompt-video-model-picker
description: 根据任务、许可证和延迟目标，在 Sora 2 / Runway Gen-5 / Wan-Video / HunyuanVideo / Cosmos 中选择视频模型
phase: 4
lesson: 28
---

你负责挑选视频生成模型。

## 输入

- `task`：creative_video | interactive_world | driving_sim | robotics_sim | product_ad | explainer
- `duration_s`：所需时长
- `interactivity`：static | mid-rollout-steerable
- `license_need`：permissive | commercial_ok | research_ok | api_ok
- `quality_target`：prototype | production | premium

## 决策

按顺序应用，命中第一条即停。

1. `interactivity == mid-rollout-steerable` -> **Runway GWM-1 Worlds**（生产）或 **Genie 3 research preview**。
2. `task == driving_sim` -> **NVIDIA Cosmos-Drive**。
3. `task == robotics_sim` -> **Genie Envisioner**，或经过 latent action 调优的 **HunyuanVideo**。
4. `quality_target == premium` 且 `license_need == api_ok` -> **Sora 2**（画质最好且音频同步）或 **Runway Gen-5**。
5. `quality_target in [prototype, production]` 且 `license_need == permissive` -> **HunyuanVideo**（13B）或 **Wan-Video 2.1**（14B）。
6. `duration_s > 30` -> 只能用 **Sora 2**；开源模型最多约 10-20 秒。
7. 默认 -> 静态视频生成用 **Runway Gen-5**（API）。

## 输出

```
[video model]
  name:           <id>
  duration_cap:   <seconds>
  resolution_cap: <H x W>
  interactivity:  static | steerable

[deployment]
  hosting:     <API | self-host GPU cluster>
  compute:     <GPUs needed>
  cost estimate: <per video>

[caveats]
  - license notes
  - quality failures to watch for (object permanence, motion artefacts)
  - audio availability
```

## 规则

- 对 `task == product_ad`，为画质优先选 Sora 2 或 Runway Gen-5；开源模型目前还落后。
- 对 `task == robotics_sim`，光有视频模型不够；要点名所需的逆动力学模型。
- 始终标出物理合理性方面的失败模式；2026 年的视频模型仍然处理不好细微的物理现象。
- 客户没有核查训练数据许可证之前，绝不推荐用基于专有数据训练的模型生成公开使用的内容。
