Adam 为每个参数维护两个移动平均值：梯度的平均值和梯度平方的平均值。更新时，用前者除以后者平方根，让每个参数都有自己的步长。AdamW 还会加入不经过这两个平均值的权重衰减。你要把一次 Adam 更新写成纯函数：输入当前状态，返回新状态。

## 任务

编写两个函数。

1. `init_adam_state(params)` 返回初始状态：字典中的 `"m"` 和 `"v"` 是与 `params` 同形状的浮点零数组，`"t"` 是整数 `0`。
2. `adam_step(params, grads, state, lr, beta1, beta2, epsilon, weight_decay)` 执行一次更新，并返回 `(new_params, new_state)`。

每一步按以下顺序计算：

$$t \leftarrow t + 1$$
$$m \leftarrow \beta_1 m + (1 - \beta_1) g, \qquad v \leftarrow \beta_2 v + (1 - \beta_2) g^2$$
$$\hat m = \frac{m}{1 - \beta_1^t}, \qquad \hat v = \frac{v}{1 - \beta_2^t}$$
$$\theta \leftarrow \theta (1 - \eta \lambda) - \eta \frac{\hat m}{\sqrt{\hat v} + \epsilon}$$

偏差修正前先递增计数器，因此第一步使用 $t = 1$。所有运算都逐元素进行。衰减因子乘以旧参数，与课程代码中的 `AdamW` 类一致。`weight_decay = 0` 时，这一步就是普通 Adam。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `params` | float 数组 | 任意形状 | 更新前的参数 $\theta$ |
| `grads` | float 数组 | 与 `params` 相同 | 梯度 $g$ |
| `state` | dict | | `"m"` 和 `"v"`：与 `params` 同形状的浮点数组。`"t"`：已执行的步数（整数） |
| `lr` | float | 标量 | 学习率 $\eta$，默认值为 `0.001` |
| `beta1` | float | 标量 | 默认值为 `0.9` |
| `beta2` | float | 标量 | 默认值为 `0.999` |
| `epsilon` | float | 标量 | 默认值为 `1e-8`，加在平方根外 |
| `weight_decay` | float | 标量 | 解耦衰减系数 $\lambda$，默认值为 `0.0` |

- `adam_step` 返回一个元组。第一项是与 `params` 形状相同的浮点数组。第二项是新字典，包含 `"m"`、`"v"` 和 `"t"`。

## 约束

- 数组最多包含 100 个元素。
- 不要修改 `params`、`grads` 或 `state` 中的数组。请返回新数组。
- 仅使用 numpy。

## 示例

```python
params = np.array([1.0, -2.0, 0.5])
grads = np.array([0.1, -0.3, 2.0])
state = init_adam_state(params)
params, state = adam_step(params, grads, state, lr=0.1)
params
state
```

```text
array([ 0.90000001, -1.9       ,  0.4       ])
{'m': array([ 0.01, -0.03,  0.2 ]), 'v': array([1.e-05, 9.e-05, 4.e-03]), 't': 1}
```

```python
params, state = adam_step(params, np.array([0.2, 0.1, -1.0]), state, lr=0.1)
params
state
```

```text
array([ 0.80348181, -1.85997815,  0.3733663 ])
{'m': array([ 0.029, -0.017,  0.08 ]), 'v': array([4.999e-05, 9.991e-05, 4.996e-03]), 't': 2}
```

```python
params = np.array([1.0, -2.0, 0.5])
adam_step(params, np.array([0.1, -0.3, 2.0]), init_adam_state(params), lr=0.1, weight_decay=0.5)[0]
```

```text
array([ 0.85000001, -1.8       ,  0.375     ])
```
