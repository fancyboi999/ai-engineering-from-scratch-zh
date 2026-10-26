Actor-critic 需要为每一步计算优势值，衡量该动作的结果比 critic 的预期好多少。广义优势估计（GAE）将一步 TD 误差与更长期的回报结合起来。参数 $\lambda$ 控制两者的混合比例。A2C 和 PPO 在每次轨迹采样（rollout）中都会使用 GAE。

## 任务

编写两个函数。

1. `td_errors(rewards, values, dones, gamma)` 返回每一步的 TD 误差：$\delta_t = r_t + \gamma (1 - d_t) V_{t+1} - V_t$。
2. `gae(rewards, values, dones, gamma, lam)` 返回元组 `(advantages, returns)`。

优势值从最后一步向第一步递推：

$A_{T-1} = \delta_{T-1}$；当 $t < T - 1$ 时，$A_t = \delta_t + \gamma \lambda (1 - d_t) A_{t+1}$。

回报是 critic 的训练目标：$R_t = A_t + V_t$。

当 `dones[t]` 为 `True` 时，$d_t$ 为 1，否则为 0。第 $t$ 步的终止标记表示第 $t$ 步是当前回合的最后一步。此时下一状态的价值和下一步的优势值均按 0 处理。

`values` 数组包含 $T + 1$ 个元素。`values[t]` 是 critic 对第 $t$ 步状态的价值估计。`values[T]` 是自举值，即 critic 对最后一步之后状态的价值估计。只有最后一步没有终止标记时才使用它。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `rewards` | 浮点数组 | `(T,)` | 每一步的奖励 |
| `values` | 浮点数组 | `(T + 1,)` | 各状态的 critic 价值估计，最后一个元素是自举值 |
| `dones` | 布尔数组 | `(T,)` | 每个回合的最后一步为 `True` |
| `gamma` | 浮点数 | 标量 | 折扣因子，范围为 0 到 1 |
| `lam` | 浮点数 | 标量 | GAE 参数 $\lambda$，范围为 0 到 1 |

- `td_errors` 返回形状为 `(T,)` 的浮点数组。
- `gae` 返回两个浮点数组组成的元组。两个数组的形状均为 `(T,)`，依次表示优势值和回报。

## 约束

- `1 <= T <= 1000`。
- 不要对优势值做归一化。归一化是单独的一步。
- 不要修改输入数组。
- 只使用 NumPy。

## 示例

```python
rewards = np.array([1.0, 0.0, 1.0])
values = np.array([0.5, 0.4, 0.3, 0.2])
dones = np.array([False, False, True])
td_errors(rewards, values, dones, 0.9)
```

```text
[ 0.86 -0.13  0.7 ]
```

```python
gae(rewards, values, dones, 0.9, 0.8)
```

```text
(array([1.12928, 0.374  , 0.7    ]), array([1.62928, 0.774  , 1.     ]))
```

```python
rewards = np.array([1.0, 1.0, 1.0, 1.0])
values = np.array([1.0, 2.0, 1.0, 2.0, 3.0])
dones = np.array([False, True, False, False])
gae(rewards, values, dones, 0.5, 0.5)
```

```text
(array([ 0.75 , -1.   ,  1.125,  0.5  ]), array([1.75 , 1.   , 2.125, 2.5  ]))
```
