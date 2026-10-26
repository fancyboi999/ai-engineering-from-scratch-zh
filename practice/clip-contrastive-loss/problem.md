CLIP 联合训练图像编码器和文本编码器。在包含 $N$ 对样本的批次中，图像 $i$ 只与文本 $i$ 匹配。损失会拉近匹配的样本对，推远其余 $N^2 - N$ 对样本。零样本分类和图像搜索都会使用这种损失训练出的嵌入。

## 任务

编写三个函数。

1. `similarity_logits(image_emb, text_emb, temperature)` 返回 $N \times N$ 的 logit 矩阵。
2. `symmetric_infonce(logits)` 返回对称对比损失，类型为浮点数。
3. `symmetric_infonce_grad(logits)` 返回该损失对 logits 的梯度。

**Logits。** 将每一行图像嵌入和文本嵌入分别除以自身的 L2 范数。将结果记为 $\hat{I}$ 和 $\hat{T}$。logits 为

$$S = \frac{\hat{I} \hat{T}^\top}{\tau}$$

其中 $\tau$ 为温度。第 $i$ 行表示图像 $i$ 与所有文本的比较结果。第 $j$ 列表示文本 $j$ 与所有图像的比较结果。

**损失。** 第 $i$ 行和第 $i$ 列的目标都是索引 $i$，即对角线位置。

$$\mathcal{L}_{img} = -\frac{1}{N} \sum_i \log \frac{e^{S_{ii}}}{\sum_j e^{S_{ij}}}, \qquad \mathcal{L}_{txt} = -\frac{1}{N} \sum_j \log \frac{e^{S_{jj}}}{\sum_i e^{S_{ij}}}$$

$$\mathcal{L} = \frac{\mathcal{L}_{img} + \mathcal{L}_{txt}}{2}$$

**梯度。** 返回 $\partial \mathcal{L} / \partial S$，形状与 `logits` 相同。令 $R$ 为对 $S$ 逐行计算的 softmax，$C$ 为对 $S$ 逐列计算的 softmax。单个交叉熵项的梯度是 softmax 减去独热目标。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `image_emb` | 浮点数组 | `(N, d)` | 每行一个图像嵌入 |
| `text_emb` | 浮点数组 | `(N, d)` | 每行一个文本嵌入，第 $i$ 行与图像 $i$ 匹配 |
| `temperature` | 浮点数 | | $\tau > 0$，logits 要除以该值 |
| `logits` | 浮点数组 | `(N, N)` | logit 矩阵，行对应图像，列对应文本 |

- `similarity_logits` 返回形状为 `(N, N)` 的浮点数组。
- `symmetric_infonce` 返回 Python 浮点数。
- `symmetric_infonce_grad` 返回形状为 `(N, N)` 的浮点数组。

## 约束

- `1 <= N <= 256`，且 `1 <= d <= 512`。
- 嵌入数组中没有全为零的行。
- `0.01 <= temperature <= 1`。
- `symmetric_infonce` 及其梯度函数接收任意有限 logits，绝对值可达 1000。结果必须保持有限。
- 不得修改输入数组。
- 仅使用 NumPy。

## 示例

```python
image_emb = np.array([[1.0, 0.0], [0.0, 2.0], [1.0, 1.0]])
text_emb = np.array([[2.0, 0.0], [1.0, 1.0], [0.0, 3.0]])
logits = similarity_logits(image_emb, text_emb, 0.5)
```

```text
[[2.         1.41421356 0.        ]
 [0.         1.41421356 2.        ]
 [1.41421356 2.         1.41421356]]
```

```python
symmetric_infonce(logits)
symmetric_infonce_grad(logits)
```

```text
0.9905556060000382
[[-0.13632819  0.09873442  0.02666175]
 [ 0.02666175 -0.23459891  0.19700514]
 [ 0.09873442  0.15772852 -0.23459891]]
```

```python
symmetric_infonce(np.zeros((4, 4)))
```

```text
1.3862943611198906
```
