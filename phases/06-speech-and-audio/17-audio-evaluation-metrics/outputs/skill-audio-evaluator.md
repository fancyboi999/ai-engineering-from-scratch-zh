---
name: audio-evaluator
description: 为任何音频模型发布选择指标、基准、归一化规则和报告格式。
version: 1.0.0
phase: 6
lesson: 17
tags: [evaluation, wer, mos, utmos, eer, der, fad, mmau, leaderboard]
---

拿到任务（ASR / TTS / 克隆 / 说话人验证 / 说话人分离 / 分类 / 音乐 / LALM / 流式语音到语音）后，输出：

1. 主指标。WER · MOS · UTMOS · SECS · EER · DER · mAP · FAD · MMAU-Pro 准确率 · 延迟 P95。只选一个。
2. 次要指标。1-3 个附加维度（速度、多样性、鲁棒性）及理由。
3. 归一化规则。转小写、去标点、数字展开、合并空白。用 Whisper-normalizer 或自定义规则，并写进文档。
4. 公开基准。要对标的权威排行榜（Open ASR、TTS Arena、MMAU-Pro、VoxCeleb1-O、AudioSet、LongAudioBench 等）。
5. 内部测试集。N 条留出领域数据；按人群 / 声学条件切片拆分。
6. 报告格式。给分布（延迟给 P50/P95/P99；分类给各类别召回率；MMAU 给各类别分数）。附发布说明模板。

延迟拒绝只报单个数字（要报分位数）。分类拒绝只报汇总值（要报各类别）。TTS 发布没有同时给出 MOS/UTMOS 和 SECS（克隆时），拒绝。ASR 发布没有 WER 归一化规范，拒绝。音乐发布只给 FAD，拒绝：始终搭配人工 MOS 评审团。

示例输入："发布一个新的英语-西班牙语对话 TTS。需要让团队相信它比现有的 Cartesia-Sonic 基线更好。"

示例输出：
- 主指标：UTMOS（每种语言 50 条 prompt 的成对音频样本）+ 人工评审 MOS（每种语言 20 位听众，与基线做盲测 A/B）。
- 次要指标：TTFA 中位数和 P95（必须与基线持平）；相对固定音色参考的 SECS &gt; 0.80（说话人相似度不回退）；往返 ASR（Whisper-large-v3-turbo）的 WER 每种语言 &lt; 2%，英语和西班牙语都适用（两者都以空格分词，WER 合适；没有词边界的语言改用 CER）。
- 归一化：英语用 `openai-whisper` 包里的 `EnglishTextNormalizer`，西班牙语和语码混用的 prompt 用它的 `BasicTextNormalizer`，在计算往返 WER 之前同时作用于参考文本和假设文本。本课的 `wer()` 辅助函数只支持 ASCII，所以西班牙语要用这些归一化器（或外部评测器）。
- 公开基准：用 TTS Arena（英语）和 Artificial Analysis Speech 看相对 ELO 排名。目标：与最接近的竞品相差不超过 50 ELO。
- 内部测试集：200 条留出 prompt（每种语言 100 条），覆盖金额、日期、产品名、两句旁白、情感朗读、语码混用。10 种不同人群的音色。
- 报告：发布说明包含核心结论（UTMOS + MOS）、P50/P95 TTFA 直方图、SECS 累积分布、按类别拆分的 WER/CER，以及失败模式说明（语码混用 prompt 失败率 X%）。
