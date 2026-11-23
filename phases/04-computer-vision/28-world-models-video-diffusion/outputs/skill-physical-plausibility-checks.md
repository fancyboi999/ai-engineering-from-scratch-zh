---
name: skill-physical-plausibility-checks
description: 生成视频上线前，自动检查物体恒存性、重力和连续性
version: 1.0.0
phase: 4
lesson: 28
tags: [video-generation, quality, physics, evaluation]
---

# 物理合理性检查

生成视频上生产需要自动化护栏。人工复核扩展不了，物理检查能抓住那些经典的失败模式。

## 适用场景

- 任何根据文本或图像 prompt 生成视频的产品。
- 为视频生成 API 接口做自动化 QA。
- 在微调或基座模型更新后，监控视频模型的质量漂移。

## 输入

- `video`：`(T, H, W, 3)` 张量，或 mp4 文件路径。
- 可选参考信息：预期物体数量、初始场景描述。

## 检查项

### 1. 物体恒存性
用 SAM 3.1 Object Multiplex 跨帧跟踪每个检测目标。稳定的轨迹消失 <=3 帧后又重新出现时，标记出来：模型暂时把这个物体弄丢了。物体在画面中央附近（而非边缘）消失判为硬失败；在边缘消失判为软失败。

### 2. 运动平滑性
相邻帧之间的光流应大体连续。逐像素光流突然激增说明出现了瞬移。用 RAFT 计算光流；当 99 分位光流幅值超过中位数 10 倍以上时，标记该帧。

### 3. 重力 / 支撑
对检测为实体的物体（食物、球、工具），在没有抬起动作时，检查其竖直位置是否只降不升。物体向上漂移就标记，除非在附近检测到"抓握的手"。

### 4. 身份一致性
对人物或角色，跨帧计算人脸识别嵌入。同一个持续出现的身份，在 5 帧窗口内的余弦相似度应保持 > 0.8。低于阈值说明角色变形了。

### 5. 手和肢体
运行姿态估计器（第 21 课）。以下情况标记该帧：一只手可见手指 > 5 或 < 4；手臂长度在帧间翻倍；肢体穿过表面插进身体。

### 6. 文字渲染（prompt 要求出现文字时）
如果用户 prompt 里有带引号的字符串，对生成的帧做 OCR，并与要求的字符串计算 CER。CER > 20% 就标记。

## 报告

```
[plausibility]
  video frames:           <T>
  permanence violations:  <N>
  smoothness violations:  <N>
  gravity violations:     <N>
  identity drift:         <N of 5-frame windows>
  limb anomalies:         <N>
  OCR CER vs requested:   <float>

[verdict]
  ship | hold | reject

[samples for review]
  frame ranges where each failure occurred
```

## 规则

- 不要因为任何单项检查就直接拦截；汇总各项分数，异常总数超过阈值时把视频挂起待审。
- 身份漂移和恒存性违规的权重最高，用户最先注意到的就是它们。
- 长期记录每项检查的失败率；趋势上升通常意味着基座模型更新了，或者 prompt 分布变了。
- 绝不删除被标记的视频；留着它们用于模型调试和事后复盘。
- 对敏感内容（人物、儿童、公众人物），无论分数如何，每个视频都必须人工复核。
