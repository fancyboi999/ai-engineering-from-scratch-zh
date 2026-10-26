表格型 Q-learning 和 SARSA 每次根据一条状态转移学习动作价值。两者都会让 $Q[s, a]$ 向目标值靠近。Q-learning 在目标中使用下一状态的最佳动作；SARSA 使用 agent 实际选择的下一动作。学习过程中，epsilon-greedy 策略负责选择动作。

## 任务

编写三个函数。

1. `q_learning_update(Q, s, a, r, s_next, done, alpha=0.1, gamma=0.99)` 返回执行一次 Q-learning 更新后的表。
2. `sarsa_update(Q, s, a, r, s_next, a_next, done, alpha=0.1, gamma=0.99)` 返回执行一次 SARSA 更新后的表。
3. `epsilon_greedy(Q, s, epsilon, rng)` 返回状态 `s` 对应的动作。

两种更新都只修改 $Q[s, a]$：

$$Q[s, a] \leftarrow Q[s, a] + \alpha \left(y - Q[s, a]\right)$$

Q-learning 的目标值 $y$ 为 $r + \gamma \max_{a'} Q[s', a']$。SARSA 的目标值为 $r + \gamma \, Q[s', a_{next}]$。`done` 为 `True` 时，目标值只有 $r$，不包含下一状态项。目标值必须使用更新前的 `Q`。

`epsilon_greedy` 必须按以下顺序使用随机数生成器 `rng`：

1. 抽取 `u = rng.random()`。
2. 若 `u < epsilon`，再抽取并返回 `rng.integers(n_actions)`。
3. 否则返回 `Q[s]` 中值最大的动作。并列时返回索引最小的动作。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `Q` | float 数组 | `(n_states, n_actions)` | 动作价值 |
| `s`, `s_next` | int | | 当前状态与下一状态 |
| `a`, `a_next` | int | | 当前动作与下一动作 |
| `r` | float | | 这次状态转移的奖励 |
| `done` | bool | | `s_next` 为终止状态时取 `True` |
| `alpha` | float | | 步长，范围为 0 到 1 |
| `gamma` | float | | 折扣因子，范围为 0 到 1 |
| `epsilon` | float | | 选择随机动作的概率，范围为 0 到 1 |
| `rng` | `np.random.Generator` | | 随机数生成器 |

- `q_learning_update` 和 `sarsa_update` 返回形状为 `(n_states, n_actions)` 的新浮点数组。
- `epsilon_greedy` 返回 Python `int`。

## 约束

- `1 <= n_states <= 1000`，且 `1 <= n_actions <= 20`。
- `s_next` 可以与 `s` 相同。
- 不要修改输入表。请返回新表。
- 仅使用 numpy。

## 示例

```python
Q = np.array([[0.0, 1.0], [2.0, -1.0], [0.5, 0.5]])
q_learning_update(Q, 0, 1, -1.0, 1, False, alpha=0.5, gamma=0.9)
sarsa_update(Q, 0, 1, -1.0, 1, 1, False, alpha=0.5, gamma=0.9)
q_learning_update(Q, 0, 1, -1.0, 1, True, alpha=0.5, gamma=0.9)
```

```text
[[ 0.   0.9]
 [ 2.  -1. ]
 [ 0.5  0.5]]
[[ 0.   -0.45]
 [ 2.   -1.  ]
 [ 0.5   0.5 ]]
[[ 0.   0. ]
 [ 2.  -1. ]
 [ 0.5  0.5]]
```

```python
rng = np.random.default_rng(7)
Q = np.array([[1.0, 3.0, 3.0, 0.0]])
[epsilon_greedy(Q, 0, 0.5, rng) for _ in range(12)]
```

```text
[1, 1, 1, 0, 1, 1, 1, 1, 3, 1, 3, 1]
```
