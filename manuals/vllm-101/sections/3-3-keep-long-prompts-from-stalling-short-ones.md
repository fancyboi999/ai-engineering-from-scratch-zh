# 避免长提示词拖慢短请求

> batch token 预算会在首 token 延迟和 token 间隔之间做权衡，应根据你承诺的延迟来设置。

长提示词到来后，短请求却被拖慢。读完本节，你可以根据延迟目标选择 batch token 预算。

**我们的测量结果：**在 DGX Spark 低负载下，将预算设为 16,384 token 会让 P99 ITL 从 574 ms 上升到 798 ms。

## 了解预算 {#s-keep-long-prompts-from-stalling-short-ones-know-the-budget}

vLLM 总会将长提示词拆成多个 chunk。每个步骤先为正在运行的流式请求生成下一个 token，等待中的提示词再使用剩余预算。参数 `--max-num-batched-tokens` 用于设置预算。[Token 预算](#s-why-one-token-budget-replaces-a-prefill-phase)一节解释了调度顺序。

预算越大，长提示词越可能在更少的步骤内完成 prefill，因此首 token 来得更快。但每个步骤也会变长，正在运行的流式请求都要等待。因此，在低负载下，较大预算可能缩短首 token 延迟，却拉长 token 间隔。

## 了解默认值 {#s-keep-long-prompts-from-stalling-short-ones-know-your-default}

vLLM 会根据 GPU 内存设置 token 预算和并发请求上限。`vllm serve` 和离线 `LLM` 类的默认值也不相同。其他手册页面会链接到这张表。

| vLLM 读取到的 GPU 内存 | `vllm serve` 的预算 | `LLM` 类的预算 | 两种方式的 `--max-num-seqs` |
|---|---|---|---|
| 至少 160 GiB | 16,384 | 16,384 | 1,024 |
| 至少 70 GiB，但不是 A100 | 8,192 | 16,384 | 1,024 |
| 少于 70 GiB 或未知 | 2,048 | 8,192 | 256 |

DGX Spark 上 CPU 和 GPU 共用 121.69 GiB 内存，但其启动日志仍显示预算为 2,048，这是小型或未知 GPU 的默认值。修改之前，先查看服务器当前使用的数值。0.31.0 的日志不会直接打印预算参数。请在 engine 配置行中查找 `compile_ranges_endpoints`，列表中的最大数值就是预算。

## 查看我们的测量结果 {#s-keep-long-prompts-from-stalling-short-ones-see-what-our-runs-show}

**我们的测量：**2026-10-21，我们在 DGX Spark 上使用 `Qwen3-30B-A3B`，测试了 2,048 和 16,384 token 两种预算。提示词长度为 1,024 到 4,096 token，每个请求要求生成 64 到 256 token。我们固定请求速率，并对每个数据点使用三个随机种子。

```figure
id: fig-3-3
kind: chart
title: 低负载下增大 token 预算
claim: 每秒 0.5 个请求时，16,384-token 预算会让 P99 ITL 从 574 ms 升至 798 ms。
caption: 每条柱形表示三个随机种子的中位数。两种预算的首 token 延迟区间有重叠。来源：capture/gpu/summary/gb10.json。
```

| 请求速率（每秒） | 预算 | TTFT 中位数 | TPOT 中位数 | P99 ITL |
|---|---:|---:|---:|---:|
| 0.5 | 2,048 | 1,145 ms | 149.3 ms | 574 ms |
| 0.5 | 16,384 | 906 ms | 139.4 ms | 798 ms |
| 1 | 2,048 | 454 ms | 156.5 ms | 405 ms |
| 1 | 16,384 | 477 ms | 156.9 ms | 395 ms |
| 2 | 2,048 | 560 ms | 205.5 ms | 587 ms |
| 2 | 16,384 | 595 ms | 205.1 ms | 586 ms |

每秒 0.5 个请求时，较大的预算让 P99 ITL 增加了 39%，两个随机种子的结果范围没有重叠。首 token 的确更快，但两种预算的结果范围有重叠。因此，代价明确，收益尚未得到确认。

两个预算下，每秒 0.5 个请求的首 token 中位延迟都比每秒 1 个请求更高。使用 2,048 预算时，0.5 速率下的三个随机种子都超过 900 ms；1 速率下则都低于 600 ms，因此不能只用一个慢速随机种子解释。我们没有找到原因。

每秒 1 个和 2 个请求时，两种预算的结果都落在随机种子区间内，差异不明显。在这些速率下，每一步由更多请求共同使用，因此单个长提示词占用的预算较少。

请将结果限定在本次范围内：两种预算、三个低请求速率、一种模型和一台机器。2026 年发表的论文《P-PAS: Prefill-Pressure Adaptive Scheduling for Long-Context LLM Serving》发现，vLLM 的固定预算无法在所有负载下都达到最佳效果。低 prefill 压力时，大预算延迟更低；多个 prefill 与运行中的流式请求竞争时，小预算更好。我们没有自行测量这条交叉点。

不设置预算参数的运行在所有速率下都与 2,048 预算相符。这与启动日志显示的 2,048 一致。所有运行的时钟中位数都在 2,398 到 2,411 MHz 之间。

## 调整预算 {#s-keep-long-prompts-from-stalling-short-ones-tune-it}

1. 读取服务器当前使用的预算。
2. 如果长提示词经常到达且 P99 ITL 过高，降低预算。默认值更大时，可以先试 2,048。
3. 如果长提示词的首 token 太慢，且 P99 ITL 仍有余量，就提高预算。
4. 在实际请求速率下测量，因为我们的测试显示预算效果会随速率变化。
5. 负载改变时重新测量，因为合适的预算会随负载变化。

vLLM 还有一个参数 `--long-prefill-token-threshold`。当其他请求正在等待时，它会限制单个长提示词在一个步骤内获得的 token 数。它默认关闭，我们没有测试。

```takeaways
- 低负载下，较大预算可能缩短首 token 延迟，但拉长 token 间隔。
- 我们在 DGX Spark 上测得，低负载时 16,384 预算让 P99 ITL 增加了 39%。
- 根据 vLLM 读取到的内存查看预算，因为默认值由该内存决定。
- 在实际请求速率下测量，并在负载变化时再次测量。
```

来源：capture/gpu/summary/gb10.json（mixed.vllm、mixed.vllm-mnbt-2048、mixed.vllm-mnbt-16384），capture/gpu/out-gb10/server-load-vllm.log，vLLM 0.31.0 源码（vllm/engine/arg_utils.py、vllm/config/vllm.py、vllm/config/scheduler.py、vllm/platforms/cuda.py），论文《P-PAS: Prefill-Pressure Adaptive Scheduling for Long-Context LLM Serving》（arXiv 2608.15171，2026）。
