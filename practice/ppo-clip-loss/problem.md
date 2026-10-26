PPO 会在同一批样本上对策略训练多个 epoch。重要性比率用于比较新策略与采集样本时的旧策略。PPO 会裁剪该比率，防止单次更新让策略变化过大。相同的裁剪损失也是许多 RLHF 流程的核心。

## 任务

编写三个函数。每个函数都接收 $N$ 个样本的新旧对数概率、优势值以及裁剪幅度 `eps`。

1. `ppo_clip_loss(logp_new, logp_old, advantages, eps=0.2)` 返回待最小化的损失。
2. `clip_fraction(logp_new, logp_old, advantages, eps=0.2)` 返回被裁剪样本的比例。
3. `ppo_clip_grad(logp_new, logp_old, advantages, eps=0.2)` 返回损失对 `logp_new` 的梯度。

样本 $t$ 的比率为 $r_t = \exp(\log\pi_{new,t} - \log\pi_{old,t})$。损失为：

$$L = -\frac{1}{N} \sum_t \min\left(r_t A_t,\ \mathrm{clip}(r_t, 1 - \epsilon, 1 + \epsilon) A_t\right)$$

当 $A_t > 0$ 且 $r_t > 1 + \epsilon$，或当 $A_t < 0$ 且 $r_t < 1 - \epsilon$ 时，样本 $t$ 会被裁剪。两个比较都使用严格不等式。$A_t = 0$ 的样本不会被裁剪。

被裁剪样本的梯度为 0。其他样本的梯度为 $-r_t A_t / N$。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `logp_new` | float 数组 | `(N,)` | 新策略下各动作的对数概率 |
| `logp_old` | float 数组 | `(N,)` | 旧策略下各动作的对数概率 |
| `advantages` | float 数组 | `(N,)` | 每个样本的优势值，按给定值使用 |
| `eps` | float | | 裁剪幅度，范围为 0 到 1 |

- `ppo_clip_loss` 返回浮点数。
- `clip_fraction` 返回范围为 0 到 1 的浮点数。
- `ppo_clip_grad` 返回形状为 `(N,)` 的浮点数组。

## 约束

- `1 <= N <= 4096`。
- 对数概率范围为 -1000 到 0。
- 不要对优势值进行归一化。
- 不要修改输入数组。
- 仅使用 numpy。

## 示例

```python
logp_old = np.log(np.array([0.5, 0.5, 0.5, 0.5]))
logp_new = np.log(np.array([0.7, 0.55, 0.3, 0.45]))
advantages = np.array([1.0, 2.0, -1.0, -0.5])
ppo_clip_loss(logp_new, logp_old, advantages)
clip_fraction(logp_new, logp_old, advantages)
ppo_clip_grad(logp_new, logp_old, advantages)
```

```text
-0.5375000000000001
0.5
[ 0.     -0.55    0.      0.1125]
```

比率为 `[1.4, 1.1, 0.6, 0.9]`。样本 0 满足 $A > 0$ 且 $r > 1.2$；样本 2 满足 $A < 0$ 且 $r < 0.8$。这两个样本会被裁剪。
