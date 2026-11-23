---
name: skill-cmer-monitor
description: 为生产环境的 VLM 接口接入跨模态错误率（CMER）监控、看板和告警
version: 1.0.0
phase: 4
lesson: 25
tags: [vlm, production, monitoring, hallucination]
---

# CMER 监控

把跨模态对齐当作一等的生产 KPI 来管。

## 适用场景

- 部署任何基于图像生成文本的 VLM 接口。
- 排查用户反馈的幻觉回答。
- 追踪输入分布漂移是否削弱了模型的图像对齐（grounding）能力。

## 输入

- `vlm_output`：生成的文本。
- `text_confidence`：softmax 之后每个 token 概率的平均值，取值在 `[0, 1]`。按 `exp(mean(log_probs))` 计算。不要传原始 logits：原始 logits 没有上下界，而 `conf_threshold` 假定输入是概率。
- `image_embedding`：图像的 CLIP 系列嵌入（DINOv3、SigLIP、CLIP）。
- `text_embedding`：生成文本的 CLIP 系列嵌入。
- 可选 `prompt_type`：用于分组的标签（vqa / ocr / captioning / agent）。

## 单请求计算

```python
import torch

def cmer_flag(image_emb, text_emb, text_conf, sim_thr=0.25, conf_thr=0.8):
    if image_emb.shape != text_emb.shape:
        raise ValueError(f"emb shape mismatch: {image_emb.shape} vs {text_emb.shape}")
    image_emb = image_emb / (image_emb.norm() + 1e-8)
    text_emb = text_emb / (text_emb.norm() + 1e-8)
    sim = float((image_emb * text_emb).sum())
    flagged = (text_conf > conf_thr) and (sim < sim_thr)
    return {"sim": sim, "flagged": flagged}
```

嵌入是来自独立 CLIP 系列编码器的一维 PyTorch 张量（`torch.float32`）。如果用 NumPy 数组，把 `.norm()` 换成 `np.linalg.norm(...)`，并相应转换输出类型。

把 `sim`、`text_conf`、`flagged`、`prompt_type`、`timestamp`、`model_version`、`request_id` 写入监控管线（Prometheus、DataDog、OpenTelemetry）。

## 聚合指标

```
CMER = (flagged requests in window) / (total requests in window)
```

按接口、按 prompt_type、按模型版本分别报告。

## 告警阈值

- 基线 CMER：用 7 天正常流量确定。
- 警告：CMER 连续 1 小时 >= 基线的 1.5 倍。
- 严重：CMER 连续 30 分钟 >= 基线的 2 倍，或任一窗口的绝对值 > 15%。

## 看板面板

1. CMER 随时间变化（5 分钟分桶，7 天窗口）。
2. 按 prompt_type 拆分的 CMER（堆叠柱状图）。
3. 每小时 `sim` 的分布（直方图）。
4. 幻觉输出 Top 样本（每天抽 20 条被标记的回答交人工复核）。

## CMER 飙升时的处理

1. 抽样查看被标记的请求。
2. 确认模型版本没有被意外更换。
3. 检查输入分布（新的文件格式？新的图片来源？压缩方式变了？）。
4. 在飙升消退前，把受影响的流量转给人工复核。
5. 如果飙升持续不退，就微调或替换模型；不要压掉告警。

## 规则

- 绝不用 VLM 自己的嵌入计算 CMER，要用独立编码器（DINOv3、SigLIP 或 CLIP-L/14）。否则你测的是模型的自洽性，不是对齐程度。
- 始终记录原始 `sim` 值，不要只记 `flagged` 这一位；分布漂移会先出现在下四分位，之后标记率才会变。
- 没有 CMER 监控就不要上线 VLM 接口；幻觉是生产环境最主要的失败模式，没有这个指标就悄无声息。
- 对敏感领域（医疗、法律、金融），把 `sim_threshold` 提到 0.35 或更高。标记条件是 `sim < sim_threshold`，阈值越高，越多输出会被当作可能缺乏依据而被拦下，这正是高风险场景该有的默认值。
