---
name: skill-fine-tuning-guide
description: 判断何时以及如何用 LoRA 和 QLoRA 微调 LLM 的决策树
version: 1.0.0
phase: 11
lesson: 8
tags: [fine-tuning, lora, qlora, peft, llm-engineering]
---

# 微调决策指南

微调之前，按顺序尝试以下方案：

```
1. Prompt engineering (minutes, $0)
2. Few-shot examples in prompt (minutes, $0)
3. RAG for knowledge retrieval (days, $10-100/month)
4. Fine-tuning with LoRA/QLoRA (days, $5-50 per experiment)
5. Full fine-tuning (weeks, $100-10,000 per run)
```

只有在上一步被证实不够用时，才进入下一步。

## 什么时候微调

- 模型需要稳定的输出风格或格式，而 prompt 做不到
- 你在蒸馏更大的模型（让 8B 模型达到 GPT-4 的质量）
- 延迟很重要，而 few-shot 示例会增加太多 token
- 需要模型可靠地遵循一种复杂的推理模式
- 你有 1,000+ 条体现目标输入输出行为的高质量样本

## 什么时候不要微调

- 用对 prompt，模型已经能做到你想要的
- 你需要模型知道某些事实（改用 RAG）
- 训练样本少于 500 条（很可能过拟合）
- 任务经常变化（重新训练很贵）
- 你需要审计是哪些数据影响了某个具体输出（微调是黑盒）

## 方法选择

| GPU 显存 | 7B 模型 | 13B 模型 | 70B 模型 |
|----------|----------|-----------|-----------|
| 16GB (T4) | QLoRA | 不可行 | 不可行 |
| 24GB (3090/4090) | QLoRA 或 LoRA | QLoRA | 不可行 |
| 40GB (A100) | LoRA 或全量 | QLoRA 或 LoRA | QLoRA |
| 80GB (A100/H100) | 全量 | LoRA 或全量 | QLoRA 或 LoRA |

## LoRA 配置清单

1. 从 r=16、alpha=32 开始（大多数任务的安全默认值）
2. 先只作用于 q_proj 和 v_proj（最小可用 LoRA）
3. QLoRA 学习率用 2e-4，LoRA fp16 用 5e-5
4. 设置 lora_dropout=0.05
5. 训练 1-3 个 epoch（再多就有过拟合风险）
6. 每 100 步在留出集上评估一次
7. 保存 checkpoint，按 eval loss 挑最好的

## 常见错误

- 训练 epoch 太多（小数据集在第 2-3 个 epoch 之后就过拟合）
- 沿用全量微调的学习率（LoRA 需要更高的学习率）
- 忘记设置 pad token（Llama 模型会出现 NaN loss）
- 没有冻结基座模型（LoRA 就失去意义了）
- 只在训练数据上评估（始终留出 10-20% 做评估）
- 跳过 prompt 工程基线（微调去解决一个 prompt 本来就能解决的问题）

## 质量验证

训练完成后，在 200+ 条留出样本上对比：
1. 使用最佳 prompt 的基座模型（基线）
2. 挂上 LoRA adapter 的基座模型（你的微调模型）
3. 使用相同 prompt 的 GPT-4 或 Claude（上限）

如果 LoRA 模型打不过 prompt 基线，该改进的是训练数据或配置，而不是加算力。

## Adapter 管理

- 多任务服务时保持 adapter 独立（每次请求切换 adapter）
- 单任务部署时把 adapter 合并进基座权重
- 把 adapter 存到 Hugging Face Hub（10-100MB，便于版本管理和分享）
- 部署前测试合并后模型的输出与未合并时一致
- 用 TIES-Merging 或 DARE 把多个 adapter 合成一个

## 调试训练

如果 loss 不下降：
1. 检查学习率（对 LoRA 来说太低，试试 2e-4）
2. 确认 LoRA 层确实收到了梯度
3. 确认基座模型权重已冻结
4. 检查数据格式（分词器必须匹配模型期望的格式）

如果 loss 下降但评估质量差：
1. 训练数据质量有问题（垃圾进，垃圾出）
2. 过拟合（减少 epoch，增大 dropout，增加数据）
3. 目标模块选错（复杂任务加上 MLP 层）
4. Rank 太低（试试 r=32 或 r=64）
