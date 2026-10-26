## 提示 1

先将 `ys` 转为 numpy 浮点数组。切片 `values[1:]` 是各个新值，`values[:-1]` 是对应的前一个值。

## 提示 2

在 `saturation_point` 中，第 `i` 步从 `xs[i]` 到 `xs[i + 1]`。该步增益较低时，结果应为 `xs[i]`，而不是 `xs[i + 1]`。

## 提示 3

使用 `support.py` 中的 `column(rows, key)` 提取各项指标列表。对于 `MIXED` 行，从 `row["median_ttft_ms"]["median"]` 读取指标值，并将完整的内层字典传给 `ranges_overlap`。

## 提示 4

SLO 检查使用 p99 TTFT，而不是中位 TTFT。Goodput 统计满足 SLO 的请求，因此最佳并发数可能高于 p99 仍满足 SLO 的并发数。
