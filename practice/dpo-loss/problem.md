直接偏好优化（DPO）使用成对的回答训练语言模型。每对回答中，一个受到人的偏好，另一个被拒绝。DPO 不需要单独的奖励模型。策略与冻结参考模型之间的对数概率比充当奖励。

## 任务

编写三个函数。批次包含 $N$ 对回答，每个输入为每对回答提供一个序列对数概率。

1. `implicit_reward(policy_logprob, ref_logprob, beta)` 返回每对回答的隐式奖励 $r = \beta \, (\log \pi(y \mid x) - \log \pi_{ref}(y \mid x))$。
2. `dpo_loss(...)` 返回整个批次的平均 DPO 损失。
3. `dpo_grad(...)` 返回该平均损失对两组策略对数概率的梯度。

令 $r_w$ 为偏好回答的隐式奖励，$r_l$ 为拒绝回答的隐式奖励。第 $i$ 对回答的间隔为 $z_i = r_{w,i} - r_{l,i}$。损失为

$$L = \frac{1}{N} \sum_{i=1}^{N} -\log \sigma(z_i), \qquad \sigma(z) = \frac{1}{1 + e^{-z}}.$$

$L$ 对第 $i$ 对中偏好回答的策略对数概率的梯度为 $-\beta \, \sigma(-z_i) / N$。对拒绝回答的策略对数概率的梯度为 $+\beta \, \sigma(-z_i) / N$。参考模型的对数概率视为常量。

## 输入和输出

`dpo_loss` 和 `dpo_grad` 中四个对数概率参数的顺序相同：`policy_logprob_preferred`、`policy_logprob_rejected`、`ref_logprob_preferred`、`ref_logprob_rejected`。

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `policy_logprob` | 浮点数组 | `(N,)` | 策略模型给某个回答的对数概率 |
| `ref_logprob` | 浮点数组 | `(N,)` | 参考模型给同一回答的对数概率 |
| `policy_logprob_preferred` | 浮点数组 | `(N,)` | 策略模型给每个偏好回答的对数概率 |
| `policy_logprob_rejected` | 浮点数组 | `(N,)` | 策略模型给每个拒绝回答的对数概率 |
| `ref_logprob_preferred` | 浮点数组 | `(N,)` | 参考模型给每个偏好回答的对数概率 |
| `ref_logprob_rejected` | 浮点数组 | `(N,)` | 参考模型给每个拒绝回答的对数概率 |
| `beta` | 浮点数 | | 参考模型约束的强度，大于 0 |

- `implicit_reward` 返回形状为 `(N,)` 的浮点数组。
- `dpo_loss` 返回 Python 浮点数。
- `dpo_grad` 返回元组 `(grad_preferred, grad_rejected)`，其中包含两个形状为 `(N,)` 的浮点数组。

## 约束

- `1 <= N <= 1000`，且 `0 < beta <= 10`。
- 对数概率可低至 `-5000`。间隔的正负幅度都可达数千。损失和梯度必须保持有限且准确。
- 不要在对数内部添加小常数。使用 $-\log \sigma(z)$ 的数值稳定形式。
- 不得修改输入数组。
- 仅使用 NumPy。

## 示例

```python
policy_preferred = np.array([-12.0, -20.0, -8.0])
policy_rejected = np.array([-15.0, -18.0, -9.0])
ref_preferred = np.array([-13.0, -19.0, -8.5])
ref_rejected = np.array([-14.0, -19.0, -8.5])
implicit_reward(policy_preferred, ref_preferred, 0.1)
implicit_reward(policy_rejected, ref_rejected, 0.1)
```

```text
[ 0.1  -0.1   0.05]
[-0.1   0.1  -0.05]
```

```python
dpo_loss(policy_preferred, policy_rejected, ref_preferred, ref_rejected, 0.1)
```

```text
0.6802247996122515
```

```python
grad_preferred, grad_rejected = dpo_grad(policy_preferred, policy_rejected, ref_preferred, ref_rejected, 0.1)
```

```text
grad_preferred
[-0.01500553 -0.0183278  -0.01583403]
grad_rejected
[0.01500553 0.0183278  0.01583403]
```
