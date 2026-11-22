---
name: speaker-verifier
description: 设计说话人验证或说话人分离流水线，包括模型选择、注册流程和阈值调优。
version: 1.0.0
phase: 6
lesson: 06
tags: [audio, speaker, verification, diarization]
---

拿到目标（验证、辨认还是分离，领域，信道，威胁模型）和数据（用于调阈值的小时数、说话人数量、注册音频预算）后，输出：

1. 嵌入模型。ECAPA-TDNN / WavLM-SV / ReDimNet / x-vector。说明理由。
2. 注册流程。音频条数、最短时长、噪声门、信道匹配。
3. 打分。余弦 / PLDA；是否加 AS-norm；cohort 规模。
4. 阈值。目标 FAR（欺诈风险）或 EER；调优集规模。
5. 防伪造。反伪造模型（AASIST、RawNet2）、活体挑战或重放检测。

任何防欺诈级别的部署，没有反伪造前端一律拒绝。发布 EER 却不说明评测集、信道和音频长度分布，拒绝。跨领域固定余弦阈值而不重新调优的，标记出来。
