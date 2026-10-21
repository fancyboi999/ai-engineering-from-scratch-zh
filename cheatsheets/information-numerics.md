---
id: information-numerics
title: 信息论与数值稳定性
code: IT
subtitle: 熵、交叉熵、KL、稳定 softmax 与 log-sum-exp、浮点格式、PCA，以及距离选择。
hue: 280
sources: phases/01-math-foundations/09-information-theory, phases/01-math-foundations/10-dimensionality-reduction, phases/01-math-foundations/13-numerical-stability, phases/01-math-foundations/14-norms-and-distances
source_hash: e57b4c256ae68bc8
---

## 信息论公式
type: concepts
from: phases/01-math-foundations/09-information-theory/docs/zh.md

- **惊讶度**：$I(x) = -\log p(x)$。以 2 为底得到 bit，以 e 为底得到 nat。
- **熵**：$H(P) = -\sum_x p(x) \log p(x)$。公平硬币为 1 bit，99% 偏置硬币为 0.08 bit。
- **交叉熵**：$H(P,Q) = -\sum_x p(x) \log q(x)$。one-hot 标签得到 $-\log q(\text{true class})$。
- **KL 散度**：$D_{KL}(P \Vert Q) = H(P,Q) - H(P)$，不具有对称性。
- **互信息**：$I(X;Y) = H(X) + H(Y) - H(X,Y)$。为零表示独立。
- **条件熵**：$H(Y \mid X) = H(X,Y) - H(X)$。决策树分裂使其最小化。
- **困惑度**：交叉熵单位为 nat 时为 $e^{H(P,Q)}$。困惑度 50 相当于从 50 个 token 中均匀选择。
- **标签平滑**：$(1-\epsilon)\,\text{hard} + \epsilon / K$。取 0.1、4 类时，真实类别得到 0.925。
- **单位**：1 nat 为 1.4427 bit。PyTorch 和 TensorFlow 使用 nat。

## 稳定的损失计算路径
type: architecture
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/13-numerical-stability/code/numerical.py, phases/01-math-foundations/09-information-theory/docs/zh.md

```arch
node | logits | 1,1 | Logits | 原始得分 z
node | max | 2,1 | 减去最大值 | c = max(x)
node | lse | 3,1 | Log-sum-exp | 最大项为 exp(0) = 1
node | lsm | 4,1 | log_softmax_stable | z 减去 lse
node | ce | 4,2 | 交叉熵 | 真实类别对数概率的相反数
node | kl | 3,2 | KL 散度 | 交叉熵减去熵
node | ppl | 2,2 | 困惑度 | 平均交叉熵的 exp
edge | logits | max |
edge | max | lse | 平移后
edge | lse | lsm |
edge | lsm | ce | 对数概率
edge | ce | kl |
edge | ce | ppl |
```

## 稳定 softmax、LSE 与交叉熵
type: annotated-code
lang: python
from: phases/01-math-foundations/13-numerical-stability/code/numerical.py

```python
def logsumexp_stable(values):
    c = max(values)                                # 最大指数变为 0
    return c + math.log(sum(math.exp(v - c) for v in values))

def log_softmax_stable(logits):
    c = max(logits)
    lse = c + math.log(sum(math.exp(z - c) for z in logits))
    return [z - lse for z in logits]               # 对数概率，不会溢出

def cross_entropy_stable(true_class, logits):
    log_probs = log_softmax_stable(logits)
    return -log_probs[true_class]                  # 不会调用 log(0)
```

## 代码中的任务
type: task-table
from: phases/01-math-foundations/09-information-theory/code/information_theory.py, phases/01-math-foundations/13-numerical-stability/code/numerical.py

| 任务 | 代码 |
|---|---|
| 以 bit 为单位的熵 | `entropy(probs, base=2)` |
| KL 散度 | `kl_divergence(p, q, base=2)` |
| 从平均交叉熵计算困惑度 | `perplexity(avg_cross_entropy, base="e")` |
| 安全 softmax | `softmax_stable(logits)` |
| 数值梯度 | `numerical_gradient(f, x, h=1e-5)` |
| 与反向传播比较 | `check_gradient(analytical, numerical)` |
| 裁剪梯度范数 | `clip_by_norm(gradients, max_norm)` |
| 大均值数据的方差 | `welford_variance(values)` |

## 浮点格式与限制
type: defaults
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| float64 最大值 | 1.8e308 | 11 位指数，约 15-16 位有效数字 |
| float32 最大值 | 3.4028235e+38 | 8 位指数，约 7-8 位有效数字 |
| float32 最小正规数 | 1.175e-38 | 非正规数可达 1.401e-45 |
| float32 exp 上溢 | exp(89.0) | 得到 inf，exp(88.7) 仍可表示 |
| float32 exp 下溢 | exp(-104) | 得到 0.0 |
| float16 最大值 | 65,504 | 低于约 6e-8 的梯度变为 0 |
| bfloat16 最大值 | 3.4e38 | 8 位指数，7 位尾数 |
| float32 机器 epsilon | 1.19e-7 | 满足 1.0 + e != 1.0 的最小 e |

## 带损失缩放的混合精度
type: flow
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md

1. **主权重**：保留一份 float32 权重副本。
2. **前向传播**：使用 float16 加速。
3. **损失**：使用 float32 计算，避免上溢。
4. **缩放**：将损失乘一个因子，例如 1024。
5. **反向传播**：使用 float16，梯度放大为 1024 倍。
6. **取消缩放**：更新前将梯度除以 1024。
7. **更新**：修改 float32 主权重。
8. **动态缩放**：从 65536 开始，出现 inf 时减半，连续 N 步正常后翻倍。

## 数值故障
type: troubleshooting
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/13-numerical-stability/code/numerical.py

| 现象 | 原因 | 修正 |
|---|---|---|
| 几个 epoch 后损失变成 NaN | Logits 过大，softmax 上溢 | 稳定 softmax、降低学习率、裁剪梯度 |
| 损失停在 log(num_classes) | 输出接近均匀，没有学习 | 检查标签、损失和失活 ReLU |
| 验证准确率低 1-3% | 混合精度未做损失缩放 | 动态损失缩放或 bfloat16 |
| 某些层的梯度范数为 0.0 | ReLU 失活或 float16 下溢 | LeakyReLU 或 GELU、梯度缩放 |
| 不同 GPU 的结果不同 | 浮点加法不满足结合律 | `torch.use_deterministic_algorithms(True)` |
| 损失中的 `exp()` 返回 inf | 原始 logits 未减最大值 | `torch.nn.functional.log_softmax()` |
| 切换 float16 后发散 | 梯度小于 6e-8，数值大于 65,504 | 使用带损失缩放的 AMP，或 bfloat16 |
| 大数值的方差错误 | 灾难性消减 | `welford_variance` 或中心化数据 |

## 参数与阈值
type: defaults
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 梯度检查 `h` | 1e-5 | 典型范围为 1e-5 至 1e-7 |
| 梯度检查通过阈值 | 1e-7 | 超过 1e-3 表示有问题 |
| `max_norm` | 1.0 | transformer；RL 用 0.5，简单网络用 5.0 |
| LayerNorm `epsilon` | 1e-5 | 防止除零 |
| 对数与除法中的 epsilon | 1e-8 | `log(x + 1e-8)` |
| t-SNE 困惑度 | 5-50 | 课程使用 30 |
| UMAP `n_neighbors` | 15 | 配合 `min_dist` 为 0.1 |
| PCA 累计方差 | 0.95 | 或使用 90-95% 阈值 |

## 选择距离
type: command-table
from: phases/01-math-foundations/14-norms-and-distances/docs/zh.md, phases/01-math-foundations/14-norms-and-distances/code/distances.py

| 命令 | 作用 |
|---|---|
| `cosine_similarity(a, b)` | 文本和嵌入，忽略模长 |
| `dot_product(a, b)` | 推荐系统，模长编码流行度 |
| `l2_distance(a, b)` | 尺度相近的像素和空间数据 |
| `l1_distance(a, b)` | 稀疏高维特征，对离群值稳健 |
| `linf_distance(a, b)` | 单维最坏偏差 |
| `mahalanobis_distance(x, y, cov_matrix)` | 特征相关时检测离群值 |
| `jaccard_similarity(set_a, set_b)` | 集合和标签，分割任务中的 IoU |
| `edit_distance(s1, s2)` | 字符串的插入、删除或替换 |

## 降维
type: concepts
from: phases/01-math-foundations/10-dimensionality-reduction/docs/zh.md, phases/01-math-foundations/10-dimensionality-reduction/code/dim_reduction.py

- **维度灾难**：1000 维时，最大与最小距离比约为 1.02。
- **PCA**：中心化、求协方差、调用 `np.linalg.eigh`、按特征值排序、保留前 k 项。
- **解释方差比**：一个特征值除以所有特征值之和。
- **选择 k**：保留 90-95% 方差、寻找拐点，或在任务上扫描 k。
- **重建误差**：丢弃特征值之和。高误差标记离群值。
- **t-SNE**：保留局部邻居，具有随机性，复杂度为 $O(n^2)$。簇间间隙没有含义。
- **UMAP**：比 t-SNE 更快，保留更多全局结构。
- **核 PCA**：核特征空间中的 PCA，RBF 可分开同心圆。

## 问答
type: qa
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/14-norms-and-distances/docs/zh.md, phases/01-math-foundations/09-information-theory/docs/zh.md

- **为什么减去最大值？** 最大项变成 exp(0) = 1，总和至少为 1。
- **训练为什么用 bfloat16？** 它具有 float32 的数值范围，通常不需要损失缩放。
- **为什么最小化交叉熵？** 它等于负对数似然，H(P) 为常量。
- **KL 为什么不是距离？** 它不对称，也不满足三角不等式。
- **GAN 为什么用 Wasserstein？** 分布不重叠时它仍提供梯度。
- **L1 为什么产生稀疏权重？** 损失等高线在 L1 菱形的角上相切。
- **为什么用中心差分？** 误差为 $O(h^2)$，前向差分为 $O(h)$。

## 提示
type: tips
from: phases/01-math-foundations/13-numerical-stability/docs/zh.md, phases/01-math-foundations/14-norms-and-distances/docs/zh.md

- 不要用 `==` 比较浮点数，使用 `math.isclose()`。
- 调试时，每次前向传播后用 `math.isfinite(x)` 检查 nan 和 inf。
- 对 exp 输入做截断：`exp(clamp(x, -80, 80))`。
- 用 `torch.nn.utils.clip_grad_norm_()` 按范数裁剪，保留梯度方向。
- 用 `torch.autograd.gradcheck()` 检查每个新层或损失。
- 嵌入经过 L2 归一化后，余弦与点积得到相同结果。
