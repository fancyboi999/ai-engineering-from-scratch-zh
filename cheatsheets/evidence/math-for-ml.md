# 证据对照：机器学习数学

中文主题：[机器学习数学](../math-for-ml.md)。

以下为当前中文区块的来源索引。文末保留冻结上游 `0d4b1ca0c6d75b8e413be88ca4174598eba4d1e0` 的原始逐条定位记录，便于回查英文原文。原始记录中的 `docs/en.md` 与行号属于该上游版本，不是当前 `docs/zh.md` 的行号，也不表示本次已执行这些命令或重现性能数据。

当前中文来源按区块登记如下。正文说明、代码注释和图中标签见链接的中文主题；命令、API 标识与数值保留原样。

## 计算图、前向与反向传播

对应主题区块：**计算图、前向与反向传播**（`architecture`）。

来源文件：

- [`phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md`](../../phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 关键公式

对应主题区块：**关键公式**（`concepts`）。

来源文件：

- [`phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md`](../../phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md)
- [`phases/01-math-foundations/07-bayes-theorem/docs/zh.md`](../../phases/01-math-foundations/07-bayes-theorem/docs/zh.md)
- [`phases/01-math-foundations/09-information-theory/docs/zh.md`](../../phases/01-math-foundations/09-information-theory/docs/zh.md)
- [`phases/01-math-foundations/13-numerical-stability/docs/zh.md`](../../phases/01-math-foundations/13-numerical-stability/docs/zh.md)
- [`phases/01-math-foundations/14-norms-and-distances/docs/zh.md`](../../phases/01-math-foundations/14-norms-and-distances/docs/zh.md)
- [`phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md`](../../phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 更新规则

对应主题区块：**更新规则**（`concepts`）。

来源文件：

- [`phases/01-math-foundations/08-optimization/docs/zh.md`](../../phases/01-math-foundations/08-optimization/docs/zh.md)
- [`phases/01-math-foundations/04-calculus-for-ml/docs/zh.md`](../../phases/01-math-foundations/04-calculus-for-ml/docs/zh.md)
- [`phases/01-math-foundations/16-sampling-methods/docs/zh.md`](../../phases/01-math-foundations/16-sampling-methods/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## NumPy 任务

对应主题区块：**NumPy 任务**（`task-table`）。

来源文件：

- [`phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md`](../../phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md)
- [`phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md`](../../phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md)
- [`phases/01-math-foundations/17-linear-systems/docs/zh.md`](../../phases/01-math-foundations/17-linear-systems/docs/zh.md)
- [`phases/01-math-foundations/14-norms-and-distances/docs/zh.md`](../../phases/01-math-foundations/14-norms-and-distances/docs/zh.md)
- [`phases/01-math-foundations/12-tensor-operations/docs/zh.md`](../../phases/01-math-foundations/12-tensor-operations/docs/zh.md)
- [`phases/01-math-foundations/01-linear-algebra-intuition/docs/zh.md`](../../phases/01-math-foundations/01-linear-algebra-intuition/docs/zh.md)

构建器核对的标识与数值：

- `np.maximum`
- `maximum`
- `np.linalg.solve`
- `solve`
- `np.linalg.lstsq`
- `lstsq`
- `np.linalg.svd`
- `full_matrices`
- `svd`
- `np.diag`
- `diag`
- `np.linalg.pinv`
- `pinv`
- `np.linalg.norm`
- `norm`
- `np.einsum`
- `batch_A`
- `batch_B`
- `einsum`

## PyTorch 与 SciPy 任务

对应主题区块：**PyTorch 与 SciPy 任务**（`task-table`）。

来源文件：

- [`phases/01-math-foundations/08-optimization/docs/zh.md`](../../phases/01-math-foundations/08-optimization/docs/zh.md)
- [`phases/01-math-foundations/13-numerical-stability/docs/zh.md`](../../phases/01-math-foundations/13-numerical-stability/docs/zh.md)
- [`phases/01-math-foundations/16-sampling-methods/docs/zh.md`](../../phases/01-math-foundations/16-sampling-methods/docs/zh.md)
- [`phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md`](../../phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md)

构建器核对的标识与数值：

- `torch.optim.AdamW`
- `model.parameters`
- `weight_decay`
- `AdamW`
- `parameters`
- `torch.optim.lr_scheduler.CosineAnnealingLR`
- `lr_scheduler`
- `T_max`
- `CosineAnnealingLR`
- `torch.nn.utils.clip_grad_norm_`
- `clip_grad_norm_`
- `torch.autograd.gradcheck`
- `gradcheck`
- `torch.nn.functional.log_softmax`
- `log_softmax`
- `stats.norm`
- `norm`
- `ppf`
- `n_components`
- `fit_transform`
- `SklearnPCA`
- `random_state`
- `TSNE`

## 几行代码实现自动求导

对应主题区块：**几行代码实现自动求导**（`annotated-code`）。

来源文件：

- [`phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md`](../../phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md)

构建器核对的标识与数值：

- `torch.tensor`
- `requires_grad`
- `tensor`
- `y.backward`
- `backward`
- `x.grad`
- `print`
- `__mul__`
- `self.data`
- `other.data`
- `Value`
- `_backward`
- `self.grad`
- `out.grad`
- `other.grad`
- `out._backward`
- `reversed`
- `v._backward`

## 稳定的 softmax 与交叉熵

对应主题区块：**稳定的 softmax 与交叉熵**（`annotated-code`）。

来源文件：

- [`phases/01-math-foundations/13-numerical-stability/docs/zh.md`](../../phases/01-math-foundations/13-numerical-stability/docs/zh.md)

构建器核对的标识与数值：

- `softmax_stable`
- `max_logit`
- `max`
- `math.exp`
- `exp`
- `sum`
- `cross_entropy_stable`
- `true_class`
- `log_sum_exp`
- `log`
- `log_prob`

## 使用 SVD 的 PCA

对应主题区块：**使用 SVD 的 PCA**（`flow`）。

来源文件：

- [`phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md`](../../phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md)
- [`phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md`](../../phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md)

构建器核对的标识与数值：

- `np.linalg.svd`
- `svd`

## 默认值与数值

对应主题区块：**默认值与数值**（`defaults`）。

来源文件：

- [`phases/01-math-foundations/08-optimization/docs/zh.md`](../../phases/01-math-foundations/08-optimization/docs/zh.md)
- [`phases/01-math-foundations/13-numerical-stability/docs/zh.md`](../../phases/01-math-foundations/13-numerical-stability/docs/zh.md)
- [`phases/01-math-foundations/16-sampling-methods/docs/zh.md`](../../phases/01-math-foundations/16-sampling-methods/docs/zh.md)

构建器核对的标识与数值：

- `0.001`
- `0.999`
- `1e-8`
- `0.01`
- `1e-5`
- `1.0`
- `65536`
- `0.9`

## 故障排查

对应主题区块：**故障排查**（`troubleshooting`）。

来源文件：

- [`phases/01-math-foundations/13-numerical-stability/docs/zh.md`](../../phases/01-math-foundations/13-numerical-stability/docs/zh.md)
- [`phases/01-math-foundations/17-linear-systems/docs/zh.md`](../../phases/01-math-foundations/17-linear-systems/docs/zh.md)
- [`phases/01-math-foundations/07-bayes-theorem/docs/zh.md`](../../phases/01-math-foundations/07-bayes-theorem/docs/zh.md)
- [`phases/01-math-foundations/08-optimization/docs/zh.md`](../../phases/01-math-foundations/08-optimization/docs/zh.md)

构建器核对的标识与数值：

- `torch.use_deterministic_algorithms`
- `use_deterministic_algorithms`
- `math.isclose`
- `isclose`

## 问答

对应主题区块：**问答**（`qa`）。

来源文件：

- [`phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md`](../../phases/01-math-foundations/05-chain-rule-and-autodiff/docs/zh.md)
- [`phases/01-math-foundations/09-information-theory/docs/zh.md`](../../phases/01-math-foundations/09-information-theory/docs/zh.md)
- [`phases/01-math-foundations/13-numerical-stability/docs/zh.md`](../../phases/01-math-foundations/13-numerical-stability/docs/zh.md)
- [`phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md`](../../phases/01-math-foundations/11-singular-value-decomposition/docs/zh.md)
- [`phases/01-math-foundations/16-sampling-methods/docs/zh.md`](../../phases/01-math-foundations/16-sampling-methods/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 提示

对应主题区块：**提示**（`tips`）。

来源文件：

- [`phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md`](../../phases/01-math-foundations/02-vectors-matrices-operations/docs/zh.md)
- [`phases/01-math-foundations/13-numerical-stability/docs/zh.md`](../../phases/01-math-foundations/13-numerical-stability/docs/zh.md)
- [`phases/01-math-foundations/07-bayes-theorem/docs/zh.md`](../../phases/01-math-foundations/07-bayes-theorem/docs/zh.md)
- [`phases/01-math-foundations/09-information-theory/docs/zh.md`](../../phases/01-math-foundations/09-information-theory/docs/zh.md)
- [`phases/01-math-foundations/08-optimization/docs/zh.md`](../../phases/01-math-foundations/08-optimization/docs/zh.md)

此区块为概念说明或流程。构建器不自动证明自然语言陈述；应结合中文主题与以下原始逐条定位记录核对。

## 冻结上游的原始定位记录

以下文本原样保留，只用作历史审计证据；英文说明不属于站点可见文案。

````text
# Evidence: math-for-ml

Abbreviation: P01 = phases/01-math-foundations. All paths are docs/en.md unless the line says otherwise.

## Architecture: Computational graph, forward and backward
- x1 "x1 = 2", "dy/dx1 = 3": P01/05-chain-rule-and-autodiff:68, 83
- x2 "x2 = 3", "dy/dx2 = 2": P01/05:69, 84
- mul "Multiply", "a = 6": P01/05:68, 70
- b "b = 1", "dy/db = 1": P01/05:71, 82
- add "Add", "c = 7": P01/05:70, 72
- relu "relu", "y = 7": P01/05:72-73
- seed "Seed", "dy/dy = 1": P01/05:80, 106
- edges a, c: P01/05:70, 72. edge "backward": P01/05:76-87 (backward pass graph)

## Key formulas
- Chain rule: P01/05:34
- Bayes: P01/07-bayes-theorem:49
- Entropy: P01/09-information-theory:54
- Cross-entropy: P01/09:73
- KL = H(P, Q) - H(P), not symmetric: P01/09:92-93, 99
- Log-sum-exp: P01/13-numerical-stability:145 (exp written as e^)
- Cosine similarity, -1 to +1: P01/14-norms-and-distances:142, 145
- SVD and rank k: P01/11-singular-value-decomposition:52, 144

## Update rules
- Gradient descent: P01/08-optimization:42
- Momentum: P01/08:99-100
- Adam moments: P01/08:134-135 (gradient written as g)
- Bias correction: P01/08:136-137
- Adam step: P01/08:138
- Cosine schedule: P01/08:156
- Newton step: P01/04-calculus-for-ml:240
- Temperature: P01/16-sampling-methods:247

## Tasks in NumPy
- Dense layer: P01/02-vectors-matrices-operations:293
- np.linalg.solve(A, b): P01/17-linear-systems:565
- np.linalg.lstsq(X, y, rcond=None)[0]: P01/17:532
- Thin SVD: P01/11:426, 439
- Rank k approximation: P01/11:440
- np.linalg.pinv(A) @ b: P01/11:485
- Row norms: P01/14:457
- Batched einsum: P01/12-tensor-operations:232

## Tasks in PyTorch and SciPy
- AdamW, "for transformers": P01/08:331, 340
- CosineAnnealingLR: P01/08:333
- clip_grad_norm_: P01/13:334
- gradcheck: P01/13:267
- log_softmax: P01/13:387
- stats.norm(...).ppf(0.975): P01/16:624-626 (two lines joined)
- SklearnPCA(n_components=2).fit_transform: P01/10-dimensionality-reduction:288-289 (two lines joined)
- TSNE(n_components=2, perplexity=30, random_state=42): P01/10:297

## Annotated code: Autograd in a few lines
- torch.tensor, expression, y.backward(), print(x.grad) 7.0: P01/05:152-155
- "builds the graph", "reverse mode": P01/05:161-162
- __mul__, out = Value(...), _backward, grads, return: P01/05:203-213 (the isinstance line is left out)
- "+= sums over all uses": P01/05:220
- self.grad = 1.0, reversed(topo), v._backward(): P01/05:236-238; seed dy/dy = 1: P01/05:241

## Annotated code: Stable softmax and cross-entropy
- softmax_stable: P01/13:418-422
- "largest term is 1": P01/13:148
- cross_entropy_stable: P01/13:459-464
- "stay in log space": P01/13:103

## Flow: PCA with SVD
1. Center: P01/10:52
2. Covariance C = X^T X / (n-1): P01/11:341
3. np.linalg.svd(A), avoid eig of A^T A: P01/11:332
4. Right singular vectors V are the components: P01/11:351
5. Variance sigma_i^2 / (n-1): P01/11:352
6. 90 to 95% cumulative variance: P01/10:89
7. Project top k: P01/10:56

## Defaults and numbers
- Adam lr 0.001: P01/08:75, 144
- Adam beta2 0.999, beta1 0.9: P01/08:144
- Adam epsilon 1e-8: P01/08:144
- SGD momentum lr 0.01, momentum 0.9: P01/08:75, 339
- Gradient check h 1e-5, 1e-5 to 1e-7: P01/13:253
- max_norm 1.0, 0.5 RL, 5.0 simpler: P01/13:336
- Dynamic loss scale 65536, halve and double: P01/13:294
- Top-p 0.9 with temperature 0.7: P01/16:306

## Troubleshooting
- Loss NaN: P01/13:365-367
- Loss stuck at log(num_classes): P01/13:369-371
- Accuracy 1 to 3% low: P01/13:373-375
- Gradient norm 0.0: P01/13:377-379
- Results differ across GPUs, use_deterministic_algorithms: P01/13:381-383
- 0.1 + 0.2 == 0.3, math.isclose(): P01/13:56-81
- Condition number, add lambda I, drop features: P01/17:315-337, 394
- Naive Bayes zero probability, Laplace smoothing: P01/07:140-146

## Questions
- Reverse mode: P01/05:113
- Cross-entropy maximizes likelihood: P01/09:257
- bfloat16 range, 65,504: P01/13:303, 307
- SVD vs eig(A.T @ A), squared condition number: P01/11:317, 332
- Reparameterization trick: P01/16:329-335

## Tips
- (m x n) @ (n x p) = (m x p): P01/02:56
- Sum log probabilities: P01/07:255
- Never compare floats with ==: P01/13:81
- Check gradients for a new layer or loss: P01/13:267
- Perplexity is exp of cross-entropy in nats: P01/09:275-280
- Relative error below 1e-5 is acceptable: P01/13:263
````
