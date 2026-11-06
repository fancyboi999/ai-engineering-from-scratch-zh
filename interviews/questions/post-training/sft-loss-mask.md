---
id: sft-loss-mask
title: 为什么 SFT 损失计算要跳过指令 token
card: post-training
kind: concept
level: 1
roles: [applied-ai-engineer, ai-data-engineer]
rounds: [screen, ml-depth]
tags: [sft, loss-mask, instruction-tuning, chat-template]
minutes: 6
lessons: [phases/10-llms-from-scratch/06-instruction-tuning-sft, phases/19-capstone-projects/39-instruction-tuning-sft]
manuals: []
practice: []
cheatsheet: [llm-pipeline-capstone]
related: [post-training/sft-data-quality-wins, post-training/sft-learning-rate-gap]
updated: 2026-11-03
---

你正在微调一个基座模型使其遵循人类指令。一位队友编写的训练循环计算了输入序列中每一个 token 的交叉熵损失，包括用户指令部分的 token。这是否存在问题？你应该如何修改？为什么？

## Short answer

是的。只在回答 token 上计算损失。用户在推理时总是提供指令，因此在指令上计算梯度会教会模型写问题，而不是回答问题。把每个指令位置、每个 padding 位置和回答边界 token 的标签设置为忽略索引，使它们不产生损失和梯度。

## Full answer

### 掩码的具体实现机制

每个 SFT 训练样本由三部分串联而成：用户指令、角色边界标记，以及模型回答。在前向传播阶段，模型依然完整读取整条长序列，因此自注意力机制能充分注意并理解指令上下文。损失函数仅在边界标记之后的位置上累加计算。在 PyTorch 中，通常将 `input_ids` 拷贝为 `labels`，并将指令、边界和填充位置的值覆盖为 `-100`，这是 `cross_entropy` 的默认 `ignore_index`。务必先执行错位一位的操作，再打上标签掩码，确保掩码精准对齐到正确的预测目标上。

### 为什么这不只是细节打磨

不加掩码会出现两处错误。第一，模型把容量花在了用户总是会提供的文本上。第二，指令位置通常比回答位置多，因此回答损失在梯度和中只占很小一部分。你在意的那部分的有效学习率低于你设置的值。

### 必须按正确的 token 计数做归一化

计算批次平均损失时，必须除以掩码后实际回答 token 的有效总数，而不是除以整条序列的物理长度。否则，一条冗长的用户指令会直接稀释掉简短精炼回答原本强烈的梯度信号。

### 多轮对话

如果一次对话中有多个 assistant 轮次，掩码在每个 assistant 轮次上为 1，在每个 user 轮次上为 0。在训练之前，先为单个样本打印 token 列和旁边的标签列。

## Follow-ups

- **Level 1:** 哪些具体位置必须打上忽略索引？ Expected: 指令部分、padding 填充部分，以及回答开始边界标记本身；模型需要预测的是边界之后的内容，而不是预测边界符号本身。
- **Level 2:** 既然不计算损失，为什么前向传播依然需要输入指令部分的 token？ Expected: 回答以注意力机制读取的指令为条件；掩码去除的是它的损失惩罚，而不是它的上下文。
- **Level 2:** 在开展长期训练前，如何快速验证掩码实现的正确性？ Expected: 针对单条样本并排打印错位后的 token 字符串与对应的标签值，断言仅有回答部分的有效 token 携带真实标签 ID。
- **Level 3:** 基座模型在接收到一个问题后，习惯性地继续编造更多类似的问题。SFT 改变了什么，没改变什么？ Expected: SFT 改变了交互会话模式，使模型学会在响应标记之后给出回答；SFT 没有增加事实知识，事实知识来源于预训练。

## Wrong answers

- "在指令部分计算损失能提供额外的监督信号，应当保留。" 它会训练模型去生成指令问题，且严重稀释压缩了回答部分在总梯度中的比重。
- "将计算出的掩码损失除以整条输入序列的完整长度。" 冗长的指令因此会大幅稀释简短回答的梯度信号；必须除以实际参与损失计算的回答 token 数量。
- "在回答角色标记上也计算损失，以便模型学会何时开始输出。" 角色标记属于 prompt 模板；prompt 提供标记，模型预测标记后面的内容。

## Taught in

[SFT 课程](../../../phases/10-llms-from-scratch/06-instruction-tuning-sft/)用 numpy 构建了损失掩码，而[综合项目 SFT 课程](../../../phases/19-capstone-projects/39-instruction-tuning-sft/)构建了带忽略索引的 collate 函数。
