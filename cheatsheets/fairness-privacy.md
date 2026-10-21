---
id: fairness-privacy
title: 偏差、公平性与差分隐私
code: BF
subtitle: 测量偏差、选择公平标准、用 DP-SGD 训练并审计隐私声明。使用 Python 标准库教学示例。
hue: 285
sources: phases/18-ethics-safety-alignment/20-bias-representational-harm, phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual, phases/18-ethics-safety-alignment/22-differential-privacy-for-llms
source_hash: 69d26f081860e782
---

## 三类公平性对比
type: comparison
span: 2
from: phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual/docs/zh.md

| 因素 | 群体公平 | 个体公平 | 反事实公平 |
|---|---|---|---|
| 规则 | 受保护群体之间比率相等 | 相似个体得到相似决策 | 敏感属性改变时决策不变 |
| 来源 | 人口统计均等、均等化赔率、CUAE | Dwork 等，2012 | Kusner 等，2017 |
| 需要 | 群体标签与结果 | 相似性度量 d | 因果 DAG |
| 形式检验 | 各组比率相同 | Lipschitz 常数 L | 反事实改变 |
| 弱点 | 基础率不同时标准冲突 | 定义 d 属于政策问题 | 可信度取决于 DAG 的依据 |

## 各标准的使用条件
type: tips
from: phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual/docs/zh.md

- 要求接受率相同时，使用人口统计均等。
- 要求各组 TPR 和 FPR 相同时，使用均等化赔率。
- 要求预测值相同时，使用条件使用准确率均等。
- 能定义任务特定度量 d 时，使用个体公平。
- 有群体因果 DAG 时，使用反事实公平。
- 法律禁止干预受保护属性时，使用回溯反事实。

## 公式
type: concepts
from: phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual/docs/zh.md, phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/docs/zh.md, phases/18-ethics-safety-alignment/20-bias-representational-harm/code/main.py

- **人口统计均等**：对所有群体，P(Y=1 | A=a) = P(Y=1 | A=a')。
- **均等化赔率**：P(Y=1 | Y*=y, A=a) = P(Y=1 | Y*=y, A=a')。
- **条件使用准确率**：P(Y*=y | Y=y, A=a) = P(Y*=y | Y=y, A=a')。
- **个体公平**：|f(x) - f(x')| <= L * d(x, x')
- **(ε, δ)-DP**：$P(M(D) \in S) \le e^{\varepsilon} \cdot P(M(D') \in S) + \delta$
- **WEAT 项**：s(w, X, Y) = mean cosine(w, X) - mean cosine(w, Y)
- **WEAT 效应**：身份群体间的 mean_a(s) - mean_b(s)。

## DP-SGD 步骤
type: flow
from: phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/docs/zh.md

1. **采样器**：采样一个小批次。
2. **训练器**：计算逐样本梯度。
3. **裁剪器**：将每个样本的梯度裁剪到阈值 C。
4. **噪声**：将裁剪后的梯度求和，加入标准差为 $\sigma \cdot C$ 的高斯噪声。
5. **优化器**：使用带噪声的总和更新参数。
6. **隐私会计器**：用 Moments Accountant 或 Rényi DP 会计器跟踪隐私成本。

## 测量偏差的位置
type: architecture
from: phases/18-ethics-safety-alignment/20-bias-representational-harm/docs/zh.md

```arch
node | emb | 1,1 | 基于嵌入 | 对 RLHF 前嵌入做 WEAT | model
node | prob | 2,1 | 基于概率 | 刻板印象对数似然 | model
node | gen | 3,1 | 基于生成文本 | 简历评分、对话 | process
node | rep | 2,2 | 表征伤害 | 刻板印象、抹除 |
node | alloc | 3,2 | 分配伤害 | 物质结果不平等 |
edge | emb | prob | 表征
edge | prob | gen | 行为
edge | gen | rep |
edge | gen | alloc |
```

## WEAT 教学探针
type: annotated-code
lang: python
from: phases/18-ethics-safety-alignment/20-bias-representational-harm/code/main.py

```python
A = ["he", "his", "man"]                      # 身份群体 A
B = ["she", "her", "woman"]                   # 身份群体 B
X = ["engineer", "programmer", "scientist"]   # 技术 / 职业
Y = ["nurse", "teacher", "caregiver"]         # 照护 / 家庭
pre = weat_score(A, B, X, Y)                  # 正值：A 更接近 X
EMB = debias(EMB)                             # 投影移除性别方向
gender_dir = [1.0, -1.0, 0.0, 0.0]            # 轴 1 减轴 0
post = weat_score(A, B, X, Y)                 # 下降，但不为零
```

## 群体指标与人口统计均等重加权
type: annotated-code
lang: python
from: phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual/code/main.py

```python
train_data = gen(1000)                        # A=0 基础率 0.3，A=1 基础率 0.6
test_data = gen(500)
baseline = train(train_data)                  # steps 200，lr 0.1
preds = predict(baseline, test_data)          # (pred, label, group)
demographic_parity(preds)                     # rate0、rate1
equalized_odds(preds)                         # 每组的 (TPR, FPR)
conditional_use(preds)                        # 每组的 (PPV, NPV)
dp_reweighted = train(train_data, sample_weights=weights)  # a=0 y=1: 2.0，a=1 y=1: 0.5
```

## DP-SGD 教学示例
type: annotated-code
lang: python
from: phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/code/main.py

```python
grad_w = clip(grad_w, C)                      # 缩放至范数 C
grad_b = max(-C, min(C, grad_b))              # 裁剪偏置梯度
noise_b = random.gauss(0.0, sigma * C)        # 噪声标准差 sigma * C
b -= lr * (grad_b + noise_b)                  # 逐样本带噪更新
for sigma in (0.0, 0.5, 1.0, 2.0, 4.0):       # 扫描噪声乘数
    model = dp_sgd(train_data, epochs=epochs, lr=0.05, sigma=sigma, C=C)
    acc = accuracy(model, test_data)
eps = analytical_epsilon(max(sigma, 0.01), steps=epochs * len(train_data), delta=delta)
```

## 教学示例默认值
type: defaults
from: phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual/code/main.py, phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/code/main.py, phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 裁剪范数 `C` | 1.0 | 第 22 课教学示例 |
| `delta` | 1e-5 | `analytical_epsilon` 默认值 |
| `epochs` | 10 | DP-SGD 教学示例，500 条训练记录 |
| DP-SGD `lr` | 0.05 | 扫描中固定不变 |
| `sigma` | 0.0 | 标准 SGD，epsilon 为无穷大 |
| 发布的 ε | [1, 10] | 仅用于说明，不是推荐默认值 |
| 公平性 `train` | `steps: int = 200` | `lr: float = 0.1` |

## 故障排查
type: troubleshooting
from: phases/18-ethics-safety-alignment/20-bias-representational-harm/docs/zh.md, phases/18-ethics-safety-alignment/20-bias-representational-harm/code/main.py, phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual/code/main.py, phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| WEAT 效应未降至零 | 去偏只能减轻，不能消除 | 加入概率与生成文本指标 |
| 描绘多样，决策却不平等 | 仅测量表征伤害 | 同时测量分配伤害 |
| 性别评估通过，偏差仍存在 | 偏差出现在（性别、种族）组合 | 运行交叉群体测试 |
| DP 差距缩小，EO 与 CUAE 却变差 | 基础率不等 | 以政策形式明确所选标准 |
| 金丝雀 MIA 显示泄漏很少 | 金丝雀并非“最易提取”的数据 | 加入训练数据提取测试 |
| 输出安全，个体仍被重新识别 | 置信度分数泄漏 | 不公开分数，或将其截断/量化 |

## 调用教学代码
type: task-table
from: phases/18-ethics-safety-alignment/20-bias-representational-harm/code/main.py, phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual/code/main.py, phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/code/main.py

| 任务 | 代码 |
|---|---|
| 计算 WEAT 探针得分 | `weat_score(<identity_a>, <identity_b>, ...)` |
| 投影移除偏差方向 | `debias(<emb>)` |
| 重加权训练 | `train(data, sample_weights=<w>)` |
| 各组人口统计均等 | `demographic_parity(preds)` |
| 各组均等化赔率 | `equalized_odds(preds)` |
| 裁剪一个梯度 | `clip(<g>, <C>)` |
| 使用 DP-SGD 训练 | `dp_sgd(data, epochs, lr, sigma, C)` |
| 一次运行的 epsilon | `analytical_epsilon(sigma, steps)` |

## 问答
type: qa
from: phases/18-ethics-safety-alignment/21-fairness-criteria-group-individual-counterfactual/docs/zh.md, phases/18-ethics-safety-alignment/22-differential-privacy-for-llms/docs/zh.md, phases/18-ethics-safety-alignment/20-bias-representational-harm/docs/zh.md

- **一个模型能同时满足三种群体标准吗？** 不能。基础率不等时无法做到（Chouldechova、KMR，2017）。
- **为何使用回溯反事实？** 它从实际特征推理，不干预该属性。
- **为何 MIA 与提取结果不一致？** 两者测量不同对象：插入的金丝雀与“最易提取”的数据。
- **LoRA + DP-SGD 保护什么？** 适配器。基础模型保持固定。
- **为何 WinoIdentity 要考虑不确定性？** 错误率相同而不确定性不同，仍会改变分配。
