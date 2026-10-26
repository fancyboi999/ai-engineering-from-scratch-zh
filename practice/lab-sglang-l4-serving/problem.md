Serving 基准测试会记录不同设置的指标表，需要读表并作出判断。本实验分析 Qwen3-8B 在单张 NVIDIA L4 上使用 SGLang 0.5.22 的真实运行数据，找出吞吐何时停止增长、延迟 SLO 何时失守、FP8 带来多少收益，以及更小的 prefill chunk 是否有帮助。

数据来自本仓库的 `manuals/sglang-101/capture/gpu/summary/l4.json`。`support.py` 保存了本实验所需数据行的副本。各指标是三个随机种子的中位数。`MIXED` 行还保留三个种子的 `min` 和 `max`。

## 任务

编写五个辅助函数和 `answers()`。

1. `gains(ys)` 返回长度为 $n - 1$ 的浮点数组。第 $i$ 项为 $y_{i+1} / y_i - 1$。
2. `saturation_point(xs, ys, min_gain=0.05)` 找出增益严格低于 `min_gain` 的第一步 $i$。返回该步之前的水平 `xs[i]`。若没有步骤的增益低于 `min_gain`，则返回 `xs[-1]`。
3. `largest_within(xs, ys, limit)` 返回满足 `y` 小于或等于 `limit` 的最大 `x`。若没有 `y` 满足限制，则返回 `None`。
4. `pct_change(new, old)` 返回百分比变化 $100 \cdot (new - old) / old$。
5. `ranges_overlap(a, b)` 接收两个含有 `"min"` 和 `"max"` 键的字典。当 $a_{min} \le b_{max}$ 且 $b_{min} \le a_{max}$ 时返回 `True`。

然后在 `answers()` 中使用这些辅助函数完成实验。

1. 遍历 `LOAD["default"]` 中从 1 到 64 的并发数，测量 `output_throughput`。使用 `min_gain = 0.05` 找到饱和点，并写入 `saturation_default`。
2. 对 `LOAD["fp8"]` 重复步骤 1，并将结果写入 `saturation_fp8`。
3. 在 `LOAD["default"]` 中测量各并发数下的 `p99_ttft_ms`。将符合 `SLO["ttft_ms"]` 的最大并发数写入 `slo_concurrency_default`。
4. 在 `LOAD["default"]` 中测量 `goodput_rps`。将 goodput 最大时的并发数写入 `best_goodput_concurrency_default`。若两个水平的 goodput 相同，选择较低并发数。
5. 在并发数 32 时，用 FP8 的 `output_throughput` 除以默认配置的 `output_throughput`，并将比值写入 `fp8_speedup_c32`。
6. 将 prefill chunk 从默认的 4096 token 改为 1024 token。在相同速率下比较 `MIXED["chunk-1024"]` 和 `MIXED["default"]`，使用 `"median"` 字段。对三个速率下 `median_ttft_ms` 的 `pct_change` 求均值，写入 `chunk_ttft_change_pct`。对 `output_throughput` 执行相同计算，写入 `chunk_throughput_change_pct`。新值是 1024 chunk 的结果，旧值是默认结果。
7. 对每个速率，检查两种设置下 `median_ttft_ms` 的种子范围是否重叠。将范围重叠的速率数量写入 `chunk_overlap_rates`。

## 输入和输出

| 名称 | 类型 | 形状 | 含义 |
|---|---|---|---|
| `xs` | 数值列表 | `(n,)` | 变量水平，按升序排列 |
| `ys` | float 列表 | `(n,)` | 每个水平对应的测量值，供 `gains` 使用时都大于 0 |
| `min_gain` | float | 标量 | 作为增长的最小相对增益 |
| `limit` | float | 标量 | SLO 上限，单位与 `ys` 相同 |
| `new`, `old` | float | 标量 | 新值和基准值，`old` 不为 0 |
| `a`, `b` | dict | 包含键 `min`、`max` | 各自的种子范围 |

- `gains` 返回形状为 `(n - 1,)` 的浮点数组。
- `saturation_point` 和 `largest_within` 返回 `xs` 中的一个值。`largest_within` 也可能返回 `None`。
- `pct_change` 返回浮点数。`ranges_overlap` 返回布尔值。
- `answers()` 返回包含以上八个键的字典，每个值都是 Python `float`。

## 约束

- `gains` 和 `saturation_point` 的输入需满足 `2 <= n <= 20`。
- 不要修改输入列表。
- 不要对答案进行舍入。检查接受与参考运行结果之间不超过 `1e-6` 的相对误差。
- 仅使用 `support.py` 中的数据，以及 numpy 和标准库。

## 示例

```python
gains([13.42, 31.2, 61.54])
```

```text
[1.32488823 0.9724359 ]
```

```python
saturation_point([1, 2, 4, 8], [10.0, 20.0, 20.5, 30.0])
```

```text
2
```

从 2 到 4 的增益为 0.025，低于 0.05。虽然数值在 8 时再次上升，但规则会在首次低增益时停止。

```python
largest_within([1, 2, 4, 8], [100.0, 900.0, 1000.0, 1200.0], 1000.0)
```

```text
4
```

```python
pct_change(37411.99, 35999.18)
```

```text
3.9245616150145577
```

`answers()["saturation_default"]` 为 `32.0`。
