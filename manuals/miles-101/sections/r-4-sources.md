# 来源

> 本手册的来源，按权威程度排序。

两个来源有冲突时，优先采用列表位置较高的来源，并在对应章节中说明。

## 1. 我们的运行记录 {#s-ref-sources-1-our-runs}

所有标注为实测的数据都来自 2026-10-17 至 2026-10-22 期间，在一台搭载 GB10 GPU 的 NVIDIA DGX Spark 上记录的运行。[实验记录](#s-ref-lab-notes)列出了各次运行、镜像和计时规则。

## 2. 我们运行的 Miles 代码 {#s-ref-sources-2-the-miles-code-we-ran}

各节提及的 flag 和默认值都来自所用镜像内的 Miles 代码，即 2026-10-15 的 Miles main。我们还使用 2026-10-20 的 Miles main 检查了各节依赖的代码。

## 3. Miles 文档和发行说明 {#s-ref-sources-3-miles-documentation-and-release-notes}

文档描述的行为来自 Miles 文档和 v0.1.0、v0.1.1、v0.1.2 的发行说明。文档与代码不一致时，以代码为准。例如，自定义 reward flag 的帮助文本展示了普通函数，但代码要求使用 async 函数。

## 4. Miles 问题追踪器 {#s-ref-sources-4-the-miles-issue-tracker}

我们未能复现的故障排查条目来自 Miles issue tracker 中的报告。每一项都明确标注为报告，而不是我们的实测结果。

## 5. 论文和文章 {#s-ref-sources-5-papers-and-posts}

- Miles v0.1 技术报告，arXiv 2609.08368，2026 年 9 月。
- Rollout Routing Replay, arXiv 2510.11370.
- Score Centering Stabilizes Off-policy Reinforcement Learning, arXiv 2609.20807.
- RadixArk 团队于 2025 年 11 月发布的首篇 Miles 介绍，以及 2026 年 8 月发布的 Miles v0.1 介绍。
- slime 仓库和 README，用于了解项目历史。
- Defeating the Training-Inference Mismatch via FP16, arXiv 2510.26788, October 2025.
- Deterministic Inference across Tensor Parallel Sizes That Eliminates Training-Inference Mismatch, arXiv 2511.17826, November 2025.
- Jet-RL：on-policy FP8 强化学习，arXiv 2601.14243，2026 年 1 月。
- Scaling Laws for Collapse in Asynchronous GRPO, arXiv 2607.01083, July 2026.
- Unified FP8 for MoE RL：Miles 团队及合作方于 2025 年 11 月发布的 LMSYS 文章。
- vLLM 团队于 2026 年 6 月发布的 vime 公告。
- SGLang pull request 42408：Miles 在 GB300 上运行 DeepSeek-V4.1，2026 年 10 月。
- SGLang 推测解码文档。
- SkyRL 量化轨迹采样文档，2026 年。
- TRL issue 6789：截断采样产生的 importance-sampling 偏差，2026 年 8 月。

其他团队测得的结果会在对应章节注明团队名称和所用硬件。

来源：manual.json。
