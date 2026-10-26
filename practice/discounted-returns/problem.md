REINFORCE 会用动作之后的回报缩放该动作对应的梯度。这里的回报是 reward-to-go：从当前步到 episode 结束的折扣奖励之和。rollout buffer 常把多个 episode 存在同一个数组中，并在每个 episode 的最后一步标记 done。

## 任务

编写三个函数。

1. `returns_to_go(rewards, gamma)` 返回单个 episode 的 reward-to-go。episode 长度为 $T$ 时，$G_{T-1} = r_{T-1}$，并且当 $t < T - 1$ 时，$G_t = r_t + \gamma G_{t+1}$。
2. `batch_returns(rewards, dones, gamma)` 返回拼接在一个数组中的多条 episode 的 reward-to-go。若 `dones[t]` 为 `True`，第 $t$ 步就是该 episode 的最后一步，因此 $G_t = r_t$。否则，$G_t = r_t + \gamma G_{t+1}$。批次最后一步没有后续步，即使它的 done 标记为 `False`，也要设 $G_{t+1} = 0$。
3. `normalize(returns)` 返回 $(G - \mu) / (\sigma + 10^{-8})$。其中 $\mu$ 是均值，$\sigma$ 是总体标准差（`ddof = 0`）。数组少于 2 个值时，返回内容不变的副本。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `rewards` | float 数组 | `(T,)` | 每一步的奖励 |
| `dones` | bool 数组 | `(T,)` | 在每条 episode 的最后一步为 `True` |
| `gamma` | float | 标量 | 折扣因子，范围为 0 到 1 |
| `returns` | float 数组 | `(T,)` | 要归一化的回报 |

每个函数都返回形状为 `(T,)` 的浮点数组。

## 约束

- `1 <= T <= 1000`，且 `0 <= gamma <= 1`。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
returns_to_go(np.array([1.0, 0.0, 2.0]), 0.9)
```

```text
[2.62 1.8  2.  ]
```

```python
rewards = np.array([1.0, 1.0, 1.0, 1.0, 1.0])
dones = np.array([False, True, False, False, True])
batch_returns(rewards, dones, 0.5)
```

```text
[1.5  1.   1.75 1.5  1.  ]
```

```python
normalize(np.array([1.0, 2.0, 3.0, 4.0]))
```

```text
[-1.34164077 -0.44721359  0.44721359  1.34164077]
```
