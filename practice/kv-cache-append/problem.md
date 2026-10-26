decoder 一次生成一个 token。没有缓存时，每生成一个新 token 都要重新计算整个前缀的 key 和 value。KV cache 会保存每个时间步的 key 和 value，之后的新 token 只需用一个 query 查询已存储的数据。

## 任务

编写 `KVCache` 类和 `decode_step` 函数。

`KVCache(max_len, d_k, d_v)` 创建一个空缓存，容量为 `max_len` 个时间步。它提供以下方法：

1. `append(k, v)` 在缓存末尾追加一个或多个时间步。形状为 `(d_k,)` 的一维 `k` 表示一个时间步；形状为 `(n, d_k)` 的二维 `k` 表示 n 个时间步。`v` 也遵循相同规则。
2. `keys()` 按追加顺序返回已存储的 key，形状为 `(len, d_k)`。
3. `values()` 返回已存储的 value，形状为 `(len, d_v)`。
4. `len(cache)` 返回已存储的时间步数量。

在以下两种情况下，`append` 会抛出 `ValueError`：

- 新时间步超出容量，即 `len(cache) + n > max_len`；
- `k` 和 `v` 的时间步数量不同。

`append` 抛出异常时，缓存保持不变。

`decode_step(q, cache)` 计算一个 query 对缓存的 attention。令 $K$ 为 `cache.keys()`，$V$ 为 `cache.values()`。分数为 $s = K q / \sqrt{d_k}$，权重为 $s$ 的 softmax，输出为权重乘以 $V$。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `max_len` | 整数 | | 缓存可容纳的时间步数 |
| `d_k`, `d_v` | 整数 | | 一个 key 和一个 value 的维数 |
| `k` | 浮点数组 | `(d_k,)` 或 `(n, d_k)` | 一个或 n 个新时间步的 key |
| `v` | 浮点数组 | `(d_v,)` 或 `(n, d_v)` | 对应时间步的 value |
| `q` | 浮点数组 | `(d_k,)` | 当前时间步的 query |
| `cache` | `KVCache` | | 至少包含一个时间步的缓存 |

- `append` 返回 `None`。
- `decode_step` 返回元组 `(output, weights)`。
- `output` 是形状为 `(d_v,)` 的浮点数组。
- `weights` 是形状为 `(len(cache),)` 的浮点数组。

## 约束

- `1 <= max_len <= 256` 且 `1 <= d_k, d_v <= 64`。
- 分数可能大于 1000，输出必须保持有限。
- 缓存需要复制输入数据。调用方之后修改 `k` 或 `v` 不应影响缓存。
- 不要修改输入数组。
- 只使用 NumPy。

## 示例

```python
cache = KVCache(4, 2, 2)
cache.append(np.array([[1.0, 0.0], [0.0, 1.0]]), np.array([[1.0, 2.0], [3.0, 4.0]]))
len(cache)
cache.append(np.array([1.0, 1.0]), np.array([5.0, 6.0]))
len(cache)
cache.values()
```

```text
2
3
[[1. 2.]
 [3. 4.]
 [5. 6.]]
```

```python
output, weights = decode_step(np.array([1.0, 0.0]), cache)
```

```text
output
[3. 4.]
weights
[0.40111209 0.19777581 0.40111209]
```

```python
cache.append(np.zeros((2, 2)), np.zeros((2, 2)))
```

```text
ValueError: the cache is full
```

发生错误后，`len(cache)` 仍然是 `3`。
