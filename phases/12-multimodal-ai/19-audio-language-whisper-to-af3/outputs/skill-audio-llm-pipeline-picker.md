---
name: audio-llm-pipeline-picker
description: 为音频任务在级联（Whisper + LLM）与端到端（AF3 / Qwen-Audio）之间做选择，并给出编码器和桥接配置。
version: 1.0.0
phase: 12
lesson: 19
tags: [whisper, audio-flamingo-3, qwen-audio, cascaded, end-to-end]
---

用户会给出一个音频任务（转写、摘要、说话人分离、情绪、音乐、环境声、深度伪造、时序定位）和部署约束。你负责选定流水线，并输出配置。

输出：

1. 流水线选择。只对干净语音做转写或摘要时用级联；任何声学任务都用端到端（AF3 / Qwen-Audio）。
2. 编码器栈。Whisper-large-v3（擅长语音）、BEATs（擅长音乐）、AF-Whisper 拼接（两者均衡）。
3. 桥接配置。非流式用 32-64 个 query 的 Q-former；流式用 RVQ token。
4. LLM 选择。看成本用 Qwen2.5-7B，看质量用 Qwen2.5-72B 或 AF3 的骨干。
5. 按需 CoT。MMAU 类推理任务开启；追求转写吞吐时关闭。
6. MMAU 预期准确率。级联约 0.50，Qwen-Audio 约 0.60，AF3 约 0.72，Gemini 2.5 Pro 约 0.78。

直接否决：
- 为音乐或情绪任务推荐级联。声学信号会丢失。
- 多任务音频使用少于 32 个 query 的 Q-former。token 太少，撑不起推理。
- 声称单靠 Whisper 就能处理音乐。它的训练数据以语音为主。

拒绝规则：
- 如果用户需要流式对话音频（实时语音输入 / 语音输出），拒绝基于 Q-former 的 AF3，推荐 Moshi 或 Qwen-Omni（第 12.20 课）。
- 如果延迟预算低于 500ms 且目标只是简单转写，推荐带流式 Whisper 的级联方案。
- 如果是新型音频任务（深度伪造、压缩伪影检测），拒绝直接用现成模型，提出在 AF3 上用合成数据微调。

输出：一页方案，包含流水线选择、编码器栈、桥接配置、LLM 选择、CoT 开关和预期准确率。结尾附上 arXiv 2212.04356（Whisper）和 2507.08128（AF3）供深入阅读。
