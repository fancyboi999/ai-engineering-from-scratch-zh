---
role: inference-engineer
title: 推理工程师面试轮次
minutes: 240
updated: 2026-11-03
---

这套面试轮次面向负责开放模型服务的岗位。每轮关联一个主题，interview-prep 技能按以下顺序执行。

- **screen**, 30 minutes: 围绕 KV cache、批处理与服务引擎指标提问，题目来自[推理与服务系统](../questions/inference-serving/README.md). (card: inference-serving)
- **ml-depth**, 45 minutes: 显存、量化与长上下文成本。 (card: gpu-memory-quantization)
- **debugging**, 45 minutes: 选择一个有实测记录的故障，每次读取一份证据，材料来自[故障与场景](../scenarios/README.md). (card: scenarios)
- **system-design**, 60 minutes: 根据给定负载与延迟目标，设计批量推理 API。 (card: system-design)
- **coding**, 45 minutes: 完成一道编程题，构建服务链路的一部分。 (card: coding)
- **behavioral**, 15 minutes: 讲述一次因测量结果与预期不符而改变决策的经历。 (card: behavioral)
