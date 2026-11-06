---
id: threshold-precision-or-recall
title: 在 95% 样本为负类的数据集上选择决策阈值
card: math-classical-ml
kind: tradeoff
level: 2
roles: [ai-evaluation-reliability-engineer, applied-ai-engineer, ai-data-engineer]
rounds: [ml-breadth, screen]
tags: [classification, precision, recall, threshold, imbalance]
minutes: 8
lessons: [phases/02-ml-fundamentals/03-logistic-regression, phases/02-ml-fundamentals/09-model-evaluation]
manuals: []
practice: [logistic-regression]
cheatsheet: [classical-ml]
related: [math-classical-ml/logistic-loss-on-separable-data, math-classical-ml/negative-r-squared]
updated: 2026-11-03
---

一个二分类模型在负类占比高达 95% 的数据集上取得了 95% 的准确率。产品负责人对此非常满意，但你并不满意。你需要索取哪些关键指标？你又该如何为该业务产品合理选择分类决策阈值？

## Short answer

一个始终预测负类的模型也能取得该准确率，因此该数值不能证明任何能力。应要求提供混淆矩阵，查阅当前阈值下的精确率、召回率和 F1 分数，以及衡量全局排序能力的 AUC-ROC 指标。决策阈值应从默认的 0.5 出发，向业务代价更高的错误类型反方向调整：误报（假阳性）代价高昂时提高阈值，漏报（假阴性）代价高昂时降低阈值。

## Full answer

### 混淆矩阵的四项统计

| | 预测为正类 | 预测为负类 |
|---|---|---|
| 实际为正类 | 真正例（TP） | 伪反例（FN） |
| 实际为负类 | 伪正例（FP） | 真反例（TN） |

精确率是真正例占所有预测正类的比例。召回率是真正例占所有实际正类的比例。F1 分数是两者的调和平均数。准确率将两类错误与样本规模混在一起，在不平衡数据集上会直接被多数类淹没并失真。

### 决策阈值的作用

模型输出的是连续概率值，最终决策通过与阈值对比完成。阈值越高，预测为正类的门槛越高：精确率上升，召回率下降。降低阈值则走向相反方向。逻辑回归课程在同一个模型上依次扫描了 0.3、0.4、0.5、0.6 和 0.7 五个阈值，并打印了每个阈值对应的四项指标表格，这正是向产品负责人直观呈现权衡的最佳依据。

### 业务代价驱动的调整方向

- 当假阳性代价更高时（例如拦截正常消息的过滤器），应优先保证高精确率，相应调高决策阈值。
- 当假阴性代价更高时（例如漏诊疾病的筛查系统），应优先追求高召回率，相应调低决策阈值。
- 当两种代价没有绝对主导时，以 F1 分数为综合参考，并清晰拆解背后的精确率与召回率明细。

### 无关阈值的全局视角

AUC-ROC 曲线绘制了所有可能阈值下的真阳性率对假阳性率的轨迹。它衡量模型将正类样本排在负类样本之前的排序能力：0.5 代表随机瞎猜，1.0 代表完美排序。用它对比模型，再根据业务的实际损益成本确定阈值。

## Follow-ups

- **Level 2:** 一个始终预测负类的模型其精确率和召回率是多少？ Expected: 召回率为 0（因为没有召回任何正类），精确率由于预测正类数为 0 而数学未定义（通常置为 0）。
- **Level 2:** 为什么 F1 分数采用调和平均数而非算术平均数？ Expected: 调和平均数会被较小的一方严重拉低，防止模型依靠高精确率掩盖接近于零的极差召回率。
- **Level 3:** 如何确保所选决策阈值的真实客观性？ Expected: 在验证集上选定阈值，不在测试集上选，并在该固定阈值下对测试集仅做单次指标报告。
- **Level 3:** 在什么场景下 AUC-ROC 不适合作为总结指标？ Expected: 正类样本极度罕见且业务极度聚焦头部高置信度预测的精确性时；此时精确率-召回率曲线（PR 曲线）能更客观地展现问题。

## Wrong answers

- "准确率高达 95%，说明模型表现很出色。" 始终预测负类的全负模型也能拿到同样的数字；准确率掩盖了少数类样本的糟糕表现。
- "阈值必须固定在 0.5，因为那是 Sigmoid 的居中分界点。" 0.5 仅仅是模型最不确定的平衡中点；业务的损益代价决定了切分点。
- "挑选在测试集上取得最高 F1 的阈值作为最终阈值。" 这属于对测试集的逆向过拟合；应在验证集上确定阈值，并在测试集上做最终验证。

## Taught in

[逻辑回归课程](../../../phases/02-ml-fundamentals/03-logistic-regression/)构建了评测指标并演示了阈值扫描，[模型评估课程](../../../phases/02-ml-fundamentals/09-model-evaluation/)补充了 AUC-ROC 机制以及不平衡样本的处理。
