---
name: skill-prompt-patterns
description: 根据任务类型、可靠性要求和目标模型选择合适 prompt 模式的决策框架
version: 1.0.0
phase: 11
lesson: 01
tags: [prompt-engineering, patterns, llm, temperature, cross-model, few-shot, chain-of-thought]
---

# Prompt 模式选择指南

开发基于 LLM 的功能时，先选 prompt 模式，再动笔写 prompt。模式决定结构，内容往结构里填。

## 模式决策矩阵

| 任务类型 | 主模式 | 辅助模式 | Temperature | 需要 few-shot 吗？ |
|-----------|----------------|-------------------|-------------|-----------------|
| 数据抽取 | Template Fill | Few-Shot | 0.0 | 需要（2-3 个示例） |
| 分类 | Few-Shot | Guardrail | 0.0 | 需要（3-5 个示例） |
| 摘要 | Persona + Template | Audience Adapt | 0.3 | 不需要 |
| 代码生成 | Persona | Chain-of-Thought | 0.0 | 可选 |
| 创意写作 | Persona | Critique | 0.7-1.0 | 不需要 |
| 多步推理 | Chain-of-Thought | Decomposition | 0.3 | 可选 |
| 问答 | Persona + Guardrail | Boundary | 0.3 | 不需要 |
| 生成 prompt | Meta-Prompt | Critique | 0.7 | 需要（1-2 个示例） |
| 内容审核 | Guardrail + Boundary | Few-Shot | 0.0 | 需要（5 个以上示例） |
| 翻译/改写 | Audience Adapt | Few-Shot | 0.3 | 需要（2-3 个示例） |

## 各模式的适用场景

**Persona 模式**：每个 prompt 都应以它为基础。唯一的问题是角色要定得多具体。通用任务给个宽泛的角色就够了。领域任务的角色应写明领域、资历和背景。

**Few-Shot 模式**：输出格式比内容更重要时使用。模型需要输出特定的 JSON 结构、CSV 格式或分类标签时，示例比指令更有效。经验法则：简单格式给 2-3 个示例，复杂或有歧义的格式给 5 个以上。

**Chain-of-Thought 模式**：用于数学、逻辑、多步分析，以及任何需要模型“写出推导过程”的任务。在推理任务上能把准确率提高 10-40%（Wei et al., 2022）。简单的事实查询或抽取不要用，它只会浪费 token。

**Template Fill 模式**：用于每条输出都必须结构相同的结构化抽取。配合 temperature=0.0，并明确规定缺失字段填 "N/A"，效果最好。

**Critique 模式**：质量比速度更重要时使用。模型先生成，再自我批评，然后改进。token 成本大约翻倍，但准确性和完整性明显提升。最适合高风险输出（报告、建议、面向公众的内容）。

**Guardrail 模式**：任何面向用户的系统都要用。必须包含：范围边界、超出范围时的拒答行为、明确的“我不知道”处理方式。配合应用层的输入校验一起用。

**Meta-Prompt 模式**：用来为新任务生成 prompt。不必从零写 prompt，描述任务后让模型来写，再测试、迭代。能节省初版 prompt 的开发时间。

**Decomposition 模式**：用于适合分而治之的复杂问题。模型把问题拆成几部分，逐一解决，再合并。对包含 3-7 个子问题的任务最有效。

**Audience Adaptation 模式**：同一份内容要服务不同受众时使用。明确指定受众，别指望模型从上下文里猜。

**Boundary 模式**：用于绝对不能回答某类问题的生产系统。它比 guardrail 更强，因为它定义了硬性范围和确切的拒答话术。在合规敏感领域必不可少。

## 跨模型兼容性

按在 GPT-4o、Claude 3.5 Sonnet、Gemini 1.5 Pro 和 Llama 3 上表现的一致程度排序：

| 模式 | 跨模型一致性 | 说明 |
|---------|------------------------|-------|
| Few-Shot | 非常高 | 示例在所有模型间都迁移得很好 |
| Template Fill | 非常高 | 结构明确，几乎没有发散空间 |
| Chain-of-Thought | 高 | 所有主流模型都支持 "think step by step" |
| Persona | 高 | 到处都管用，但不同模型对角色具体程度的反应不同 |
| Guardrail | 中等 | Claude 对 guardrail 遵守得最严格；GPT-4o 在长对话中有时会偏离 |
| Critique | 中等 | 自我批评的质量因模型而差异很大 |
| Meta-Prompt | 中等 | GPT-4o 和 Claude 写出的 prompt 风格不同 |
| Boundary | 中低 | 拒答行为各不相同；要逐个模型测试 |

## 常见错误

1. **什么都用 Chain-of-Thought**：CoT 会增加 token 和延迟。只在需要推理步骤时用。
2. **约束太多**：超过 5-7 条约束，模型就会开始漏掉一些。优先保留最重要的 3 条。
3. **角色与约束互相矛盾**："你是一名创意作家" + "绝不使用比喻" 会让模型无所适从。
4. **不指定 temperature**：需要确定性输出时，却把 temperature 留在默认值（通常是 1.0）。
5. **在模型之间复制粘贴 prompt**：一定要测试。为 GPT-4o 调好的 prompt 在 Claude 上可能表现更差，反过来也一样。
6. **忽略 system 消息**：把所有内容都塞进 user 消息，而不是用 system 消息承载持久规则。
7. **过度依赖否定约束**："不要做 X、Y、Z、A、B、C" 不如 "只做 W" 有效。正向表述给了模型一个清晰的目标。

## 可靠性目标

| 使用场景 | 模式组合 | 预期准确率 | Token 成本 |
|----------|-------------------|-------------------|------------|
| 生产环境抽取 | Template + Few-Shot | 95%+ | 低（500-1K） |
| 面向用户的问答 | Persona + Guardrail + Boundary | 90%+ | 中（1-2K） |
| 代码生成 | Persona + Chain-of-Thought | 85%+ | 中（1-3K） |
| 内容生成 | Persona + Critique | 质量 90%+ | 高（2-4K，两轮） |
| 分类 | Few-Shot + Guardrail | 95%+ | 低（300-800） |
| 复杂分析 | Decomposition + Chain-of-Thought | 85%+ | 高（3-5K） |
