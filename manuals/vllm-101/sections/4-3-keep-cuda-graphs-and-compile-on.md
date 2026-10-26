# 保持 CUDA graph 和编译开启

> 默认编译级别适用于大多数服务器；eager mode 会让 decode 速度下降几个百分点。

启动耗时几分钟，你想让它更快。读完本节，你可以判断各个编译级别和 eager mode 的成本。

**我们的测量结果：**在冷却后的 L4 运行中，eager mode 会让每个 token 的耗时增加约 2%。在降频运行中，单用户时 -O0 的耗时增加约 2%，而 -O3 与默认值相同。

## 了解可选设置 {#s-keep-cuda-graphs-and-compile-on-know-the-switches}

vLLM 用 -O0 到 -O3 的级别统一设置编译和 CUDA graph。默认值为 -O2。[编译级别](#s-how-compile-and-cuda-graphs-are-captured)一节会解释每个部分的作用。

| 设置 | 编译 | CUDA graph | 适用场景 |
|---|---|---|---|
| -O2，默认值 | 开启 | 完整和分段捕获 | 生产环境 |
| -O3 | 在 0.31.0 中与 -O2 相同 | 同 -O2 | 暂无额外用途 |
| -O1 | 开启，但融合更少 | 仅分段捕获 | 希望加快启动，同时保留编译和 graph；我们未测量 |
| -O0 | 关闭 | 关闭 | 快速启动以测试改动 |
| --enforce-eager | 关闭 | 关闭 | 调试 kernel；它也会跳过 kernel 预热 |

## 从日志查看启动耗时 {#s-keep-cuda-graphs-and-compile-on-read-what-the-start-costs}

启动日志会列出每部分耗时。在 DGX Spark 上使用 Qwen3-30B-A3B 时，两轮 graph capture 和编译共用了约 96 秒，而整个启动过程约 8 分钟：

```listing
title: 启动时 graph capture 和编译耗时
source: capture/gpu/out-gb10/server-load-vllm.log
lang: text
note: 前两行是两轮 capture。最后一行显示 engine 总启动时间和编译耗时。
---
(EngineCore pid=143) INFO 10-21 10:59:45 [model_runner.py:1087] Graph capturing finished in 39 secs, took 1.17 GiB
(EngineCore pid=143) INFO 10-21 11:00:51 [model_runner.py:1087] Graph capturing finished in 38 secs, took 0.31 GiB
(EngineCore pid=143) INFO 10-21 11:00:53 [core.py:373] init engine (profile, create kv cache, warmup model) took 127.54 s (compilation: 18.67 s)
```

这次启动中，权重加载约用了 330 秒，远超编译时间。后续启动可以读取编译缓存，因此编译所占时间会减少。

## 查看我们的测量结果 {#s-keep-cuda-graphs-and-compile-on-see-what-our-runs-show}

**我们的测量：**2026-10-21，在 L4[完整时钟时段](#s-front-l4-sessions)中使用 Qwen/Qwen3-8B，对比了 eager mode 和默认值。两次运行使用相同缓存池，测试了七种并发，每个数据点使用三个随机种子，每轮开始前都冷却了 GPU。

```figure
id: fig-4-3
kind: chart
title: eager mode 与默认配置
claim: 在我们的 L4 上，每种并发下 eager mode 的每 token 耗时都比默认配置高 1.2% 到 2.3%。
caption: 带状范围表示三个运行中的最小值和最大值。两条线接近，因为 8B 模型的 decode 步骤主要等待内存，而不是等待 kernel 启动。来源：capture/gpu/summary/l4.json。
```

| 用户数（L4 完整时钟时段） | TPOT 中位数，默认 / eager | SM 时钟中位数，默认 / eager |
|---|---|---|
| 1 | 60.36 / 61.07 ms | 1,275 / 1,290 MHz |
| 8 | 65.75 / 66.98 ms | 1,485 / 1,515 MHz |
| 32 | 101.79 / 103.11 ms | 1,275 / 1,313 MHz |
| 64 | 129.15 / 131.42 ms | 1,005 / 1,020 MHz |

并发为 1 到 32 时，两次运行的随机种子结果范围没有重叠，因此差异可测，但幅度很小。在 DGX Spark 上，eager mode 让每个 token 的耗时增加了 2% 到 6%。

接着，我们在 2026-10-22 的 L4[降频时段](#s-front-l4-sessions)测试了不同编译级别，使用 1 个和 32 个用户。默认值使用三个随机种子，另外两个级别各使用两个。三种设置下 GPU 都处于降频状态：单用户时钟中位数为 210 MHz，32 用户时为 450 到 548 MHz。

| 用户数（L4 降频时段） | TPOT 中位数，默认 / -O0 / -O3 |
|---|---|
| 1 | 104.14 / 106.48 / 104.15 ms |
| 32 | 142.67 / 142.04 / 143.85 ms |

单用户时，-O0 慢了 2.2%，且两者随机种子结果范围不重叠。32 个用户时，三个级别的结果范围重叠。-O3 与默认值相同，符合此版本的代码定义。由于时钟较低，这里只比较同一测试时段内的差异，不代表你会得到相同速度。

## 设置建议 {#s-keep-cuda-graphs-and-compile-on-decide}

生产环境保持默认值。我们在 DGX Spark 上观察到 graph 和编译约占启动的一分半；后续启动使用缓存后会更快。

频繁重启并测试改动时，使用 -O0。它会跳过编译和 graph capture，我们测得 decode 速度损失约 2%。只在调试 kernel 时使用 --enforce-eager，因为它还会跳过预热，导致启动后的首批请求较慢。

```takeaways
- 生产环境保持默认编译级别开启。
- 希望加快启动时使用 -O0，不要使用 eager mode。
- vLLM 0.31.0 中，-O3 与默认值相同。
```

来源：capture/gpu/summary/l4.json（load.vllm-b、load.vllm-eager、load.vllm-fast-b、load.vllm-O0、load.vllm-O3），capture/gpu/summary/gb10.json（load.vllm、load.vllm-eager），capture/gpu/out-gb10/server-load-vllm.log，vLLM 0.31.0 文档（docs/design/optimization_levels.md），vLLM 0.31.0 源码（vllm/config/model.py）。
