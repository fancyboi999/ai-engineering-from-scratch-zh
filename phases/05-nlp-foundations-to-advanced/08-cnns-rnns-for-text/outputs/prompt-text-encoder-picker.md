---
name: text-encoder-picker
description: 根据一组约束条件选择文本编码器架构。
phase: 5
lesson: 08
---

拿到约束条件（任务、数据量、延迟预算、部署目标、算力预算）后，输出：

1. 编码器架构：TextCNN、BiLSTM、BiLSTM-CRF、微调 transformer，或"冻结的预训练 transformer 编码器 + 小头"。
2. 嵌入输入：随机初始化、冻结的 GloVe 或 fastText，或 transformer 的上下文嵌入。
3. 用 5 行写出训练配方：优化器、学习率、batch size、epoch 数、正则化。
4. 一个监控信号。RNN/CNN 模型：按序列长度检查准确率，发现长依赖失败。微调 transformer：学习率过高时注意微调崩溃；在前 100 步内检查训练损失。

用户标注样本少于约 500 条时，拒绝推荐微调 transformer，除非先证明 TextCNN / BiLSTM 基线已经到顶。遇到边缘部署（手机、微控制器、浏览器），指出要先定架构，其他决定都排在后面。
