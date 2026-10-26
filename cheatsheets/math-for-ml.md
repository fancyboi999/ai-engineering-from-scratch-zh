---
id: math-for-ml
title: 机器学习数学
subtitle: 梯度、概率、信息、优化器、矩阵分解与浮点安全。使用 NumPy、SciPy 和 PyTorch。
hue: 260
sources: phases/01-math-foundations/02-vectors-matrices-operations, phases/01-math-foundations/04-calculus-for-ml, phases/01-math-foundations/05-chain-rule-and-autodiff, phases/01-math-foundations/06-probability-and-distributions, phases/01-math-foundations/07-bayes-theorem, phases/01-math-foundations/08-optimization, phases/01-math-foundations/09-information-theory, phases/01-math-foundations/10-dimensionality-reduction, phases/01-math-foundations/11-singular-value-decomposition, phases/01-math-foundations/12-tensor-operations, phases/01-math-foundations/13-numerical-stability, phases/01-math-foundations/14-norms-and-distances, phases/01-math-foundations/16-sampling-methods, phases/01-math-foundations/17-linear-systems
code: MM
source_hash: 7a5a6405f11dde72
---

## 计算图、前向与反向传播
type: architecture
from: phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md

```arch
node | x1 | 1,1 | x1 = 2 | dy/dx1 = 3
node | x2 | 1,2 | x2 = 3 | dy/dx2 = 2
node | mul | 2,1 | 相乘 | a = 6
node | b | 2,2 | b = 1 | dy/db = 1
node | add | 3,1 | 相加 | c = 7
node | relu | 4,1 | relu | y = 7
node | seed | 4,2 | 初始梯度 | dy/dy = 1
edge | x1 | mul |
edge | x2 | mul |
edge | mul | add | a
edge | b | add |
edge | add | relu | c
edge | relu | seed | 反向传播
```

## 关键公式
type: concepts
from: phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/09-information-theory/docs/zh.md, phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/14-norms-and-distances/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md

- **链式法则**：$\frac{dy}{dx} = f'(g(x)) \cdot g'(x)$
- **贝叶斯公式**：$P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)}$
- **熵**：$H(P) = -\sum_{x} p(x) \log(p(x))$
- **交叉熵**：$H(P, Q) = -\sum_{x} p(x) \log(q(x))$
- **KL 散度**：$D_{KL}(P \,\|\, Q) = H(P, Q) - H(P)$，不对称。
- **Log-sum-exp**: $\log \sum_i e^{x_i} = \max(x) + \log \sum_i e^{x_i - \max(x)}$
- **余弦相似度**：$\frac{a \cdot b}{\lVert a \rVert_2 \, \lVert b \rVert_2}$，范围 -1 至 +1。
- **SVD**：$A = U \Sigma V^T$。秩 $k$ 近似：$A_k = U_k \Sigma_k V_k^T$。

## 更新规则
type: concepts
from: phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/04-calculus-for-ml/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md

- **梯度下降**：$w = w - \text{lr} \cdot \text{gradient}$
- **动量**：$v = \beta v + \text{gradient}$，再 $w = w - \text{lr} \cdot v$。
- **Adam 矩估计**：$m = \beta_1 m + (1 - \beta_1) g$，$v = \beta_2 v + (1 - \beta_2) g^2$。
- **偏差修正**：$\hat{m} = m / (1 - \beta_1^t)$，$\hat{v} = v / (1 - \beta_2^t)$。
- **Adam 步骤**：$w = w - \text{lr} \cdot \hat{m} / (\sqrt{\hat{v}} + \epsilon)$
- **余弦调度**：$\text{lr}_{\min} + 0.5 (\text{lr}_{\max} - \text{lr}_{\min})(1 + \cos(\pi t / T))$
- **牛顿步骤**：$w_{\text{new}} = w_{\text{old}} - H^{-1} \cdot \text{gradient}$
- **温度**：$p_i = e^{z_i / T} / \sum_j e^{z_j / T}$

## NumPy 任务
type: task-table
from: phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/17-linear-systems/docs/zh.md, phases/01-math-foundations/14-norms-and-distances/docs/zh.md, phases/01-math-foundations/12-tensor-operations/docs/zh.md

| 任务 | 代码 |
|---|---|
| 稠密层 | `np.maximum(0, weights @ inputs + bias)` |
| 求解方阵线性系统 | `np.linalg.solve(A, b)` |
| 最小二乘 | `np.linalg.lstsq(X, y, rcond=None)[0]` |
| 紧致 SVD | `U, S, Vt = np.linalg.svd(A, full_matrices=False)` |
| 秩 k 近似 | `U[:, :k] @ np.diag(S[:k]) @ Vt[:k, :]` |
| 伪逆求解 | `np.linalg.pinv(A) @ b` |
| 按行求范数 | `np.linalg.norm(X, axis=1, keepdims=True)` |
| 批量矩阵乘法 | `np.einsum("bij,bjk->bik", batch_A, batch_B)` |

## PyTorch 与 SciPy 任务
type: task-table
from: phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

| 任务 | 代码 |
|---|---|
| transformer 的 AdamW | `torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)` |
| 余弦调度 | `torch.optim.lr_scheduler.CosineAnnealingLR(adam, T_max=100)` |
| 按范数裁剪 | `torch.nn.utils.clip_grad_norm_()` |
| 检查反向传播 | `torch.autograd.gradcheck()` |
| 稳定的 log softmax | `torch.nn.functional.log_softmax()` |
| N(0, 1) 的逆 CDF | `stats.norm(loc=0, scale=1).ppf(0.975)` |
| PCA 降到二维 | `SklearnPCA(n_components=2).fit_transform(X)` |
| t-SNE 降到二维 | `TSNE(n_components=2, perplexity=30, random_state=42)` |

## 几行代码实现自动求导
type: annotated-code
lang: python
from: phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md

```python
x = torch.tensor(2.0, requires_grad=True)  # 记录 x 上的操作
y = x ** 2 + 3 * x + 1                     # 构建计算图
y.backward()                               # 反向模式传播
print(x.grad)                              # 7.0 = 2*x + 3
def __mul__(self, other):
    out = Value(self.data * other.data, (self, other), '*')
    def _backward():
        self.grad += other.data * out.grad  # 局部梯度乘以上游梯度
        other.grad += self.data * out.grad  # += 累加全部使用处的梯度
    out._backward = _backward
    return out
self.grad = 1.0                            # 初始 dy/dy = 1
for v in reversed(topo):                   # 从输出到输入
    v._backward()                          # 每节点应用链式法则
```

## 稳定的 softmax 与交叉熵
type: annotated-code
lang: python
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md

```python
def softmax_stable(logits):
    max_logit = max(logits)                           # 先减去最大值
    exps = [math.exp(z - max_logit) for z in logits]  # 最大项为 1
    total = sum(exps)
    return [e / total for e in exps]
def cross_entropy_stable(true_class, logits):
    max_logit = max(logits)
    shifted = [z - max_logit for z in logits]
    log_sum_exp = math.log(sum(math.exp(s) for s in shifted))
    log_prob = shifted[true_class] - log_sum_exp     # 保持在对数空间
    return -log_prob
```

## 使用 SVD 的 PCA
type: flow
from: phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md

1. **中心化**：每个特征减去均值。
2. **协方差**：中心化的 X 对应 $C = \frac{1}{n-1} X^T X$。
3. **分解**：对数据调用 `np.linalg.svd(A)`，避免求 $A^T A$ 的特征分解。
4. **主成分**：右奇异向量 V 就是主成分。
5. **方差**：第 i 个成分解释 $\sigma_i^2 / (n-1)$。
6. **选择 k**：保留累计解释 90% 至 95% 方差的成分。
7. **投影**：保留前 k 个方向，舍弃其余方向。

## 默认值与数值
type: defaults
from: phases/01-math-foundations/08-optimization/docs/zh.md, phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| Adam lr | 0.001 | 多数问题的起点 |
| Adam beta2 | 0.999 | beta1 为 0.9 |
| Adam epsilon | 1e-8 | 避免除以零 |
| SGD 动量学习率 | 0.01 | 配合动量 0.9 |
| 梯度检查 h | 1e-5 | 常见为 1e-5 至 1e-7 |
| Transformer max_norm | 1.0 | RL 用 0.5，简单网络用 5.0 |
| 动态损失缩放初值 | 65536 | 遇到 inf 减半，N 步正常后加倍 |
| Top-p | 0.9 | 通用场景配合温度 0.7 |

## 故障排查
type: troubleshooting
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/17-linear-systems/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/08-optimization/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 几个 epoch 后损失 NaN | softmax 溢出或学习率过高 | 稳定 softmax、降低学习率、裁剪梯度 |
| 损失停在 log(num_classes) | 输出接近均匀分布 | 检查标签、损失函数、失活 ReLU |
| float16 准确率低 1 至 3 个百分点 | 梯度下溢 | 动态损失缩放或 bfloat16 |
| 某些层梯度范数为 0.0 | ReLU 失活或 float16 下溢 | LeakyReLU 或 GELU、梯度缩放 |
| 不同 GPU 结果不同 | 浮点加法不满足结合律 | `torch.use_deterministic_algorithms(True)` |
| `0.1 + 0.2 == 0.3` 为 False | 二进制不能精确表示 0.1 | `math.isclose()` 或容差比较 |
| 输入微变，解大幅变化 | 条件数过大 | 添加 $\lambda I$ 或移除共线特征 |
| 一个未见词让朴素贝叶斯概率归零 | MLE 给出零概率 | 拉普拉斯平滑，计数加 1 |

## 问答
type: qa
from: phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md, phases/01-math-foundations/09-information-theory/docs/zh.md, phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md, phases/01-math-foundations/16-sampling-methods/docs/zh.md

- **为何用反向模式？** 多输入、单损失，一次反向传播即可得到全部梯度。
- **为何用交叉熵？** 最小化交叉熵等价于最大化数据似然。
- **训练为何用 bfloat16？** 它有 float32 的数值范围，超过 65,504 的值不会溢出。
- **为何用 SVD 而非 A.T @ A 的特征向量？** 后者会将条件数平方。
- **为何使用重参数化技巧？** $z = \mu + \sigma \epsilon$ 让梯度穿过 $\mu$ 和 $\sigma$。

## 提示
type: tips
from: phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md, phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/07-bayes-theorem/docs/zh.md, phases/01-math-foundations/09-information-theory/docs/zh.md, phases/01-math-foundations/08-optimization/docs/zh.md

- 检查形状：`(m x n) @ (n x p) = (m x p)`。
- 累加对数概率，不要连乘大量小概率。
- 不要用 `==` 比较浮点数。
- 编写新层或新损失时检查梯度。
- 困惑度是以 nat 为单位的交叉熵的指数。
- 梯度检查中，相对误差低于 1e-5 可接受。
