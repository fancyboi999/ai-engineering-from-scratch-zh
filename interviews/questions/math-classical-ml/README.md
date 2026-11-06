# 数学与经典机器学习

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

线性代数、概率、优化，以及在表格数据上仍然胜出的经典模型。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [排查全连接层的张量形状错误](dense-layer-weight-shape.md) | 概念 | 1 基础 | 5 |
| [NumPy 中输出不同数值的两种乘法操作](elementwise-or-matmul.md) | 代码阅读 | 1 基础 | 5 |
| [计算结果精确为零的句子得分](log-probs-instead-of-products.md) | 概念 | 1 基础 | 5 |
| [测试集上的 R 平方指标小于零](negative-r-squared.md) | 概念 | 1 基础 | 5 |
| [为什么最小化交叉熵等价于最小化 KL 散度](cross-entropy-is-kl-plus-entropy.md) | 概念 | 2 应用 | 8 |
| [用基尼不纯度与信息熵评估决策树节点](gini-for-a-mixed-node.md) | 估算 | 2 应用 | 8 |
| [为什么自动微分引擎对梯度累加而不是直接赋值](grad-accumulate-plus-equals.md) | 代码阅读 | 2 应用 | 8 |
| [为什么朴素梯度下降在狭窄山谷中剧烈震荡而动量法不会](momentum-in-a-narrow-valley.md) | 概念 | 2 应用 | 8 |
| [从平均交叉熵估算困惑度](perplexity-from-cross-entropy.md) | 估算 | 2 应用 | 6 |
| [为什么反向传播采用反向链式法则](reverse-mode-one-pass.md) | 概念 | 2 应用 | 8 |
| [生产环境永远无法企及的虚高测试得分](scaler-fit-before-split.md) | 排障 | 2 应用 | 8 |
| [在真实批次上返回 inf 的交叉熵实现](softmax-inf-at-large-logits.md) | 排障 | 2 应用 | 8 |
| [在 95% 样本为负类的数据集上选择决策阈值](threshold-precision-or-recall.md) | 权衡 | 2 应用 | 8 |
| [深层决策树用 Bagging，决策树桩用 Boosting](bag-or-boost-the-base-model.md) | 权衡 | 3 高级 | 12 |
| [训练与推理的 16 位浮点格式选型](bfloat16-or-float16-for-training.md) | 权衡 | 3 高级 | 12 |
| [因检验设置不当而失败的梯度检验](gradient-check-step-size.md) | 排障 | 3 高级 | 12 |
| [权重持续无止境增长的逻辑回归](logistic-loss-on-separable-data.md) | 概念 | 3 高级 | 12 |
| [随机森林将用户 ID 列排在特征重要性首位](mdi-ranks-noise-feature.md) | 排障 | 3 高级 | 12 |
| [在大数值特征上计算错误的方差实现](variance-of-large-numbers.md) | 排障 | 3 高级 | 10 |
| [判断单次划分上的微弱优势是否真实有效](compare-two-models-with-folds.md) | 设计 | 4 架构与规模 | 15 |
| [测试误差先下降再冲高随后再次下降](past-the-interpolation-threshold.md) | 概念 | 4 架构与规模 | 15 |
| [构建元学习器绝不作弊的 Stacking 集成模型](stacking-without-leakage.md) | 课后任务 | 4 架构与规模 | 25 |

[全部主题](../../README.md)
