---
name: skill-cot-patterns
description: 按任务复杂度、准确率要求和成本约束选择推理技术的决策框架
version: 1.0.0
phase: 11
lesson: 02
tags: [chain-of-thought, few-shot, self-consistency, tree-of-thought, react, reasoning, prompting]
---

# 推理技术选型指南

需要 LLM 推理解题时，先选技术，再写 prompt。技术决定推理架构，prompt 只是往里填内容。

## 快速决策树

1. 任务是简单的事实查询或单步分类吗？
   - 是：用 **zero-shot**。CoT 只增加成本，不提升准确率。
   - 否：继续。

2. 任务需要多步推理（数学、逻辑、规划）吗？
   - 是：用 **Chain-of-Thought**，继续看第 3 步。
   - 否：格式重要就用 **few-shot**，不重要就用 zero-shot。

3. 能接受一次推理出错吗？
   - 能：用 **few-shot CoT**（单次采样，temperature 0.0）。
   - 不能：用 **self-consistency**（N=5，temperature 0.7），继续看第 4 步。

4. 这是有很多可能路径的搜索/规划问题吗？
   - 是：用 **Tree-of-Thought**。
   - 否：self-consistency 就够了。

5. 任务需要外部信息或计算吗？
   - 是：用 **ReAct**（推理 + 工具调用）。
   - 否：纯推理技术就够了。

## 技术对比矩阵

| 技术 | 准确率提升 | 成本倍数 | 延迟 | 最适合 |
|-----------|--------------|-----------------|---------|----------|
| Zero-shot | 基线 | 1x | ~1s | 简单任务、事实问答 |
| Few-shot | +5-15% | 1.2x | ~1s | 格式匹配、分类 |
| Zero-shot CoT | +10-20% | 1.3x | ~1.5s | 快速增强推理 |
| Few-shot CoT | +15-25% | 1.5x | ~2s | 数学、逻辑、多步任务 |
| Self-Consistency (N=5) | 比 CoT 再 +2-5% | 5x | ~5s | 高风险推理 |
| Self-Consistency (N=10) | 比 N=5 再 +1-2% | 10x | ~10s | 仅限关键决策 |
| Tree-of-Thought | 视任务而定 | 10-40x | ~30s+ | 搜索、规划、谜题 |
| ReAct | 视任务而定 | 3-10x | ~5-15s | 需要知识支撑的任务 |
| Prompt Chaining | 比单次调用 +5-10% | 2-5x | ~5-10s | 复杂的多部分任务 |

## 各模型使用建议

### GPT-4o / GPT-4.1
- 基线推理能力强，zero-shot CoT 往往就够。
- 3 个示例的 few-shot CoT 在 GSM8K 上能到 95%。
- self-consistency 收益很小（95% 到 97%），只在关键任务上值得用。
- 原生支持结构化输出，便于提取答案。

### Claude 3.5 Sonnet / Claude 3.7 Sonnet
- 很擅长遵循结构化 prompt 格式（XML 标签）。
- 用 XML 分隔示例的 few-shot CoT 效果最好。
- Extended thinking（Claude 3.7）就是原生 CoT，不需要再用 prompt 引导。
- self-consistency 效果好，因为 Claude 在 temperature 0.7 下推理路径足够多样。

### Llama 3.1/3.3 70B
- 从 few-shot CoT 中获益最大（与 zero-shot 的准确率差距更大）。
- 推理任务建议用 N=5 的 self-consistency。
- 比商业模型需要更明确的格式指令。
- 本地推理跑 ToT 很贵，只在批处理时考虑。

### Gemini 2.5 Pro
- 开箱即有很强的多步推理能力。
- Thinking 模式自带 CoT，不需要专门做 prompt 工程。
- few-shot 示例对格式一致性的帮助大于对准确率的帮助。
- 上下文窗口大（1M），塞很多示例的 few-shot 也可行。

## 反模式

**简单任务用 CoT**：问 "What is 2+2? Let's think step by step" 纯属浪费 token。模型不写推理过程也能算对简单算术。3 步以上的问题 CoT 才有用。

**temperature 0.0 下做 self-consistency**：N 个采样会完全相同。必须用 temperature > 0（建议 0.5-0.8）才能得到多样的推理路径。

**什么都上 ToT**：ToT 需要 O(b^d) 次 LLM 调用，b 是分支因子，d 是深度。b=3、d=3 的树最多要 39 次调用。只在更便宜的技术都失败时才用。

**few-shot 示例本身有错**：带推理错误的示例会教模型犯同样的错。每个示例都必须核对。一个错误示例对准确率的伤害可能比不给示例还大。

**答案格式不统一就去提取**：self-consistency 要在多个采样之间比较答案。如果答案格式五花八门（"$18"、"18 dollars"、"eighteen"），投票就会失败。务必强制格式："The answer is [number]."

## 成本优化

以一个每天处理 10,000 次查询的生产系统为例，按 GPT-4o 定价（输入 $2.50/1M，输出 $10/1M）：

| 技术 | 平均每次查询 token 数 | 每日成本 | 准确率 |
|-----------|-----------------|------------|----------|
| Zero-shot | ~200 | ~$5 | 78% |
| Few-shot CoT | ~600 | ~$15 | 95% |
| Self-Consistency (N=5) | ~3,000 | ~$75 | 97% |
| ToT (b=3, d=2) | ~6,000 | ~$150 | 视任务而定 |

对大多数应用来说，成本最优的策略是：先用 few-shot CoT，只对置信度低的查询追加 self-consistency（即「动手构建」一节里的升级模式）。

## 与 Prompt Chaining 组合

推理技术可以和 prompt chaining 组合使用：

**链第 1 步**（提取）：zero-shot，temperature 0.0
**链第 2 步**（推理）：few-shot CoT，temperature 0.0
**链第 3 步**（校验）：N=3 的 self-consistency，temperature 0.7

这条三步链的成本约为单次 CoT 调用的 3 倍，但能拦住提取错误和推理错误，还能从校验步骤拿到置信度分数。

## 何时超越 prompt 工程

如果你花在调 prompt 上的时间比写应用代码还多，考虑：

1. **微调**：有 500+ 条标注样本且任务范围窄
2. **DSPy 编译**：想自动优化 prompt
3. **Agent 框架**：任务需要多轮工具调用（阶段 14）
4. **RAG**：模型需要访问私有或最新的知识（第 06-07 课）

prompt 技术是地基。它适用于任何模型、任何供应商，也不需要训练数据。但它有上限。知道什么时候该升级到下一层，和掌握这些技术本身同样重要。
