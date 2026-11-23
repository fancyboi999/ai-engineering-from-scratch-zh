---
name: bert-finetuner
description: 为新的分类、抽取或检索任务规划 BERT 微调。
version: 1.0.0
phase: 7
lesson: 6
tags: [bert, fine-tuning, nlp]
---

拿到下游任务（分类 / NER / 检索 / 重排 / NLI）、标注数据量和部署约束（延迟、设备）后，输出：

1. 骨干选择。模型名（ModernBERT-base / large、DeBERTa-v3、multilingual-e5 等），附一句理由。上下文 ≤8K 的英语任务优先选 ModernBERT。
2. 头部规格。分类：`[CLS]` → dropout → linear(num_classes)。NER：逐 token 线性层，CRF 可选。检索：均值池化 + 对比损失。
3. 训练配方。优化器（AdamW，lr 通常 2e-5）、warmup 比例（6–10%）、epoch 数（3–5）、batch size、fp16/bf16。
4. 评测方案。适合任务的指标（分类用准确率 + F1，NER 用实体级 F1，检索用 MRR/NDCG）。留出集大小。
5. 失败模式检查。点名一个风险：标签泄漏、类别不平衡、上下文截断、预训练语料与微调语料的分词器不匹配。

拒绝在生成式输出（文本生成）上微调 BERT，改推荐 decoder-only 模型。少数类低于 10% 时，没有按类别分层的评测就拒绝上线微调结果。标注样本少于 1,000 条却解冻整个骨干网络的微调，标记为很可能过拟合。
