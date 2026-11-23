---
name: skill-classification-diagnostics
description: 根据混淆矩阵和类别名找出逐类别的失败点，并给出影响最大的一项修复
version: 1.0.0
phase: 4
lesson: 4
tags: [computer-vision, classification, evaluation, debugging]
---

# 分类诊断

这是一套读混淆矩阵的方法。总体准确率只能告诉你分类器能用，混淆矩阵才告诉你它*还有哪些不会*。

## 何时使用

- 第一次查看训练好的分类器在验证集上的表现。
- 两次训练之间，决定下一步改什么。
- 模型上线前，确认没有关键类别在悄悄失败。
- 排查线上回退：总体准确率掉了一个点，需要知道原因。

## 输入

- `cm`：CxC 混淆矩阵（行 = 真实类别，列 = 预测类别）。
- `labels`：C 个类别名的列表，顺序与矩阵一致。
- 可选 `class_priors`：各类别在训练集中的频次（默认取 `cm` 的行和）。

## 步骤

1. **计算逐类别指标。** 遇到除以零时，把该类别的这项指标视为未定义，报告为 `n/a`；绝不能悄悄用 0 代替。
   - precision_i = cm[i,i] / sum(cm[:, i])   （该类别从未被预测时未定义）
   - recall_i    = cm[i,i] / sum(cm[i, :])   （该类别没有真实样本时未定义）
   - f1_i        = 2 * p * r / (p + r)        （任一分量未定义时未定义）

2. **按 F1 排出最差的至多三个类别。** 混淆矩阵不足三个类别时，有几个排几个。所有指标都未定义的类别不参与排名。

3. **找出每行最大的非对角单元格**，也就是最常从这个类别"抢走"样本的那个类别。按 `true -> predicted` 的形式报告。

4. **为每个最差类别判定失败模式。** 用下面的量化阈值，保证标签可复现：
   - `ambiguity`：与另一个类别双向混淆，即 `cm[i,j] / sum(cm[i, :]) >= 0.15` 且 `cm[j,i] / sum(cm[j, :]) >= 0.15`。
   - `imbalance`：该类别的训练样本数只有其主要混淆类别的 `< 0.5x`。
   - `label_noise`：`|precision_i - recall_i| >= 0.2`，且不属于 imbalance / ambiguity 的情况。
   - `systematic`：没有任何单个混淆类别占该类别错误的 0.2 以上；错误分散在三个或更多其他类别上。

5. **给出影响最大的一项下一步行动**：
   - `ambiguity` -> 收集或合成有区分度的样本，加入能保留区分特征的针对性数据增强。
   - `imbalance` -> 对少数类过采样，或使用按类别加权的损失。
   - `label_noise` -> 对该类别做分层抽样审查；先修正错误标注，再做其他改动。
   - `systematic` -> 为该类别补充数据，或微调时提高该类别损失的权重。

## 报告

```
[diagnostics]
  aggregate accuracy: X.XX
  macro F1:           X.XX

[top-3 worst classes]
  1. class <name>  F1 = X.XX  prec = X.XX  rec = X.XX
     top confusion: <name> -> <other>  (N cases)
     failure mode:  ambiguity | imbalance | label_noise | systematic
     action:        <one sentence>

  2. ...
  3. ...

[recommendation]
  single biggest lever: <one sentence naming the class and the fix>
```

## 规则

- 最多返回三个类别。再多就会淹没信号。
- 每个最差类别都要点名其主要混淆类别；绝不能笼统写成"和很多类别混淆"。
- 每条建议都要以混淆矩阵中的证据为依据。不要泛泛地说"多加数据"而不指明哪个类别。
- precision 和 recall 相差超过 0.2 时，一律把标签噪声列为候选原因：真实存在的类别在训练后，P 和 R 通常是一致的。
