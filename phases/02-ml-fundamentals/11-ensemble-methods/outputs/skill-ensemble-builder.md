---
name: skill-ensemble-builder
description: 为你的问题选择合适的集成方法并完成配置
version: 1.0.0
phase: 2
lesson: 11
tags: [ensemble, bagging, boosting, random-forest, xgboost, stacking]
---

# 集成方法选择指南

集成把多个模型组合起来，得到比任何单个模型都好的预测。问题永远是：用哪种集成，什么时候用？

## 决策清单

1. 当前模型的主要问题是什么？
   - 高方差（过拟合）：用 bagging（Random Forest）
   - 高偏差（欠拟合）：用 boosting（Gradient Boosting、XGBoost）
   - 两者都有，或者你想要最高准确率：用 stacking

2. 你有多少数据？
   - 1,000 行以下：Random Forest（稳健，很难配错）
   - 1,000 到 100,000：XGBoost 或 LightGBM（表格数据上综合最佳）
   - 100,000 以上：LightGBM（最快的梯度提升，处理大数据很好）

3. 你能投入多少调参时间？
   - 极少：Random Forest 用默认参数（几乎总能用）
   - 适中：XGBoost 设 learning_rate=0.1，用早停调 n_estimators
   - 充足：LightGBM 或 XGBoost 配合贝叶斯超参数搜索

4. 需要可解释性吗？
   - 需要：单棵决策树，或带特征重要性的小型 Random Forest
   - 部分需要：梯度提升配合 SHAP 值
   - 不需要：stacking 或深度集成

5. 数据噪声大、离群点多吗？
   - 是：Random Forest（bagging 对噪声稳健）
   - 否：梯度提升（在干净数据上能把准确率推得更高）

## 各方法的适用场景

**Random Forest（Bagging）**：稳妥的首选。在 bootstrap 样本上训练许多棵树并取平均。降低方差而不增加偏差。在中等规模数据上几乎不可能过拟合。几乎不用调参：设 n_estimators=100-500，其余保持默认。

**AdaBoost**：通过样本重加权进行串行 boosting。搭配简单基学习器（决策树桩）效果好。因为它会提高误分类样本的权重，所以对离群点和噪声标签敏感。实践中基本已被梯度提升取代。

**Gradient Boosting**：每棵新树拟合当前集成的残差。降低偏差。表格数据上最强大的方法。需要调参：learning_rate、n_estimators、max_depth、min_child_weight、subsample。

**XGBoost**：带正则化、二阶优化和系统级加速的梯度提升。原生处理缺失值。是 Kaggle 竞赛和表格数据生产环境机器学习的默认选择。

**LightGBM**：采用按叶生长（而不是按层生长）的梯度提升。在大数据集上比 XGBoost 快。使用基于直方图的分裂。最适合 50k 行以上的数据集。

**CatBoost**：原生处理类别特征的梯度提升。无需 one-hot 编码。类别特征多时是好选择。

**Stacking**：在多个差异化基模型的预测上训练一个元学习器。需要绝对最高的准确率且算力有富余时使用。基模型的预测一定要通过交叉验证生成，以免泄漏。

**Voting**：最简单的集成。硬投票（多数类）或软投票（平均概率）。不需要元学习器就能快速组合 2-3 个差异化模型。

## 常见错误

- 用梯度提升却不加早停（轮数跑太多就会过拟合）
- learning_rate 设得太高（超过 0.3 通常会不稳定）
- 梯度提升不调 max_depth（默认不限深度或树很深时会过拟合）
- stacking 用的模型全是同一类型（stacking 的意义就在于多样性）
- 在噪声数据上用 AdaBoost（离群点的权重每轮越来越高）
- 指望 Random Forest 治好欠拟合（它降的是方差，不是偏差）

## 各方法的调参优先级

**Random Forest：**
1. n_estimators: 100-500（更多很少会更差，只是更慢）
2. max_depth: None（让树完全生长），或为了速度限制在 10-20
3. max_features: 分类用 "sqrt"，回归用 "log2" 或 n/3

**XGBoost / LightGBM：**
1. learning_rate: 0.01-0.3（算力够多训练几棵树的话，越低越好）
2. n_estimators: 在验证集上用早停，别靠猜
3. max_depth: 3-8（从 6 开始）
4. min_child_weight / min_data_in_leaf: 1-20（越高越能防过拟合）
5. subsample: 0.7-1.0
6. colsample_bytree: 0.7-1.0
7. reg_alpha (L1) 和 reg_lambda (L2): 0-10

## 速查表

| 方法 | 降低 | 速度 | 调参成本 | 最适合 |
|--------|---------|-------|--------------|----------|
| Random Forest | 方差 | 快 | 低 | 噪声数据、快速基线 |
| AdaBoost | 偏差 | 快 | 低 | 简单基学习器、干净数据 |
| Gradient Boosting | 偏差 | 中 | 高 | 表格数据、竞赛 |
| XGBoost | 两者 | 快 | 高 | 生产环境表格机器学习 |
| LightGBM | 两者 | 最快 | 高 | 大数据集（50k+ 行） |
| CatBoost | 两者 | 中 | 中 | 类别特征多 |
| Stacking | 两者 | 慢 | 高 | 最高准确率、差异化模型 |
| Voting | 方差 | 快 | 无 | 快速组合 2-3 个模型 |
