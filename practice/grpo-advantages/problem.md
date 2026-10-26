GRPO 使用强化学习训练语言模型，不需要价值网络。对于每个 prompt，它采样一组 $G$ 个回答，并逐个评分。每个回答的基线是组内平均奖励。更新使用 PPO 的裁剪替代目标，并加入相对于冻结参考模型的 KL 惩罚。

## 任务

编写三个函数。

1. `group_advantages(rewards, eps=1e-8)` 返回组内相对优势值。
2. `kl_k3(logp, ref_logp)` 返回每个 token 的 KL 散度 k3 估计值。
3. `grpo_objective(logp, old_logp, ref_logp, advantages, mask, clip_eps=0.2, beta=0.04)` 返回 GRPO 目标函数的浮点值。训练时最大化这个目标。

**优势值。** `rewards` 的每一行是一组回答。对于组内奖励 $r_i$，令 $\mu$ 为组内均值，$\sigma$ 为组内总体标准差（除以 $G$，而不是 $G - 1$）：

$$A_i = \frac{r_i - \mu}{\sigma + \varepsilon}$$

使用结果奖励时，回答 $i$ 的每个 token 都使用相同的优势值 $A_i$。

**k3 估计量。** 对于一个 token，当前策略和参考策略的对数概率分别为 $\log \pi_\theta$ 和 $\log \pi_{ref}$：

$$\hat{D}_{KL} = \frac{\pi_{ref}}{\pi_\theta} - \log \frac{\pi_{ref}}{\pi_\theta} - 1$$

**目标函数。** 对于回答 $i$ 的 token $t$，令 $\rho_{i,t} = \exp(\log \pi_\theta - \log \pi_{old})$。则：

$$J = \frac{1}{N} \sum_{i=1}^{N} \frac{1}{|o_i|} \sum_{t \in o_i} \Big[ \min\big(\rho_{i,t} A_i,\ \mathrm{clip}(\rho_{i,t}, 1 - \epsilon, 1 + \epsilon)\, A_i\big) - \beta\, \hat{D}_{KL,i,t} \Big]$$

其中，$N$ 是回答数量，$o_i$ 是回答 $i$ 的有效 token 集合（`mask` 为 `True`），$|o_i|$ 是有效 token 数量。先对每个回答的 token 取平均，再对回答取平均。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `rewards` | 浮点数组 | `(num_groups, G)` | 每个回答的奖励，每行表示一组 |
| `eps` | 浮点数 | | 加到标准差上的小数值 |
| `logp` | 浮点数组 | `(N, L)` | 当前策略对每个采样 token 的对数概率 |
| `old_logp` | 浮点数组 | `(N, L)` | 生成回答的策略对相同 token 的对数概率 |
| `ref_logp` | 浮点数组 | `(N, L)` | 参考策略对相同 token 的对数概率 |
| `advantages` | 浮点数组 | `(N,)` | 每个回答的优势值 |
| `mask` | 布尔数组 | `(N, L)` | 有效 token 为 `True`，填充 token 为 `False` |
| `clip_eps` | 浮点数 | | $\epsilon$，裁剪范围 |
| `beta` | 浮点数 | | KL 惩罚的权重 |

- `group_advantages` 返回形状为 `(num_groups, G)` 的浮点数组。
- `kl_k3` 返回形状与输入相同的浮点数组。
- `grpo_objective` 返回 Python 浮点数。

## 约束

- `1 <= G, N <= 64` 且 `1 <= L <= 512`。
- 每个回答至少有一个有效 token。
- 填充 token 可以包含任意有限值，但不能影响结果。
- 不要修改输入数组。
- 只使用 NumPy。

## 示例

```python
group_advantages(np.array([[1.0, 0.0, 0.0, 1.0], [0.0, 0.0, 1.0, 0.0]]))
kl_k3(np.array([-1.0, -2.0, -0.5]), np.array([-1.0, -1.5, -1.0]))
```

```text
[[ 0.99999998 -0.99999998 -0.99999998  0.99999998]
 [-0.57735026 -0.57735026  1.73205077 -0.57735026]]
[0.         0.14872127 0.10653066]
```

```python
logp = np.array([[-1.0, -0.5, -2.0], [-0.3, -1.2, 0.0]])
old_logp = np.array([[-1.1, -0.5, -1.0], [-0.6, -1.0, 0.0]])
ref_logp = np.array([[-1.2, -0.4, -1.5], [-0.4, -1.1, 0.0]])
advantages = np.array([1.0, -1.0])
mask = np.array([[True, True, True], [True, True, False]])
grpo_objective(logp, old_logp, ref_logp, advantages, mask)
grpo_objective(logp, old_logp, ref_logp, advantages, mask, clip_eps=0.2, beta=0.0)
```

```text
-0.13122323326245566
-0.1299723302889813
```
