# 15 分钟测量你的服务器

> 一轮并发 sweep 可以找到延迟开始增长的位置；四个默认行为会改变测量结果。

你调整了一个参数，想知道它是否有效。读完本节后，你可以运行并发 sweep，找到延迟跃升的位置，并避开四个常见测量错误。

**我们的结果：**在 L4 上，输出吞吐在 32 个用户时接近每秒 275 个 token；增加到 64 个用户后，吞吐下降。

## 运行一轮 sweep {#s-benchmark-your-server-in-15-minutes-run-one-sweep}

本手册的表格使用 SGLang 0.5.22 的 benchmark client，温度设为 0，没有使用 vLLM client。两个 engine 使用同一个客户端，因此[engine 对比](#s-decide-between-vllm-and-sglang-know-what-we-compared)采用同一套测量方法。想把自己的 GPU 与本手册数据对比，也应使用相同的客户端。请将它安装到独立的虚拟环境，避免改动 vLLM 环境：

```bash
uv venv bench --python 3.12 --seed
source bench/bin/activate
uv pip install sglang==0.5.22
```

在一个终端中启动 vLLM server。在另一个终端中，针对每种并发数运行一次客户端。下方命令生成了本手册的数据：

```bash
for c in 1 2 4 8 16 32 64; do
  python -m sglang.benchmark.serving --backend vllm --port 8000 \
    --dataset-name random --random-input-len 512 --random-output-len 128 --random-range-ratio 1.0 \
    --max-concurrency $c --num-prompts $((c * 4 > 16 ? c * 4 : 16)) --seed 1 \
    --output-file sweep-c$c.jsonl --output-details
done
```

这轮循环运行了三次，分别使用 `--seed 1`、`2` 和 `3`，表中报告中位数。`--backend vllm` 会让客户端向 `/v1/completions` 发送请求。客户端先发送一个 warmup 请求，并要求服务器忽略结束序列 token，因此每个回答都会完整生成 128 个 token。

每次运行都会打印四项汇总数据：输出吞吐、首 token 时间（TTFT）、每个输出 token 的耗时（TPOT）和 token 间延迟（ITL）。应同时记录这四项。只看吞吐，无法了解用户感受到的延迟。

## 找到延迟拐点 {#s-benchmark-your-server-in-15-minutes-read-the-knee}

**拐点：**并发继续增加时，延迟开始快速上升，而输出吞吐不再上升的位置。超过拐点后，用户拿到回答更慢，服务器也几乎无法再多生成 token。

下表展示 2026-10-21 在 L4 上使用 BF16 `Qwen/Qwen3-8B` 的 sweep，测试时处于[满时钟时段](#s-front-l4-sessions)。每项数据是三个随机种子的中位数。缓存池容量为 24,096 个 token。

| 用户数，L4 满时钟时段 | 输出 tok/s | TTFT 中位数 | TPOT 中位数 | P99 ITL | SM 时钟中位数 |
|---:|---:|---:|---:|---:|---:|
| 1 | 13.5 | 191 ms | 60.4 ms | 105 ms | 1,275 MHz |
| 8 | 112.8 | 253 ms | 65.8 ms | 67 ms | 1,485 MHz |
| 16 | 201.3 | 288 ms | 69.5 ms | 85 ms | 1,455 MHz |
| 32 | 275.1 | 1,800 ms | 101.8 ms | 613 ms | 1,275 MHz |
| 64 | 242.3 | 11,181 ms | 129.2 ms | 1,233 ms | 1,005 MHz |

并发用户数不超过 16 时，增加用户可以提高输出吞吐，TPOT 只从 60 ms 增至 70 ms。表中，用户数从 16 增至 32 时，TTFT 中位数从 0.3 秒增至 1.8 秒，P99 ITL 从 85 ms 增至 613 ms。

但不能直接把这个上升当作拐点。这轮 sweep 没有在不同并发之间重置 prefix cache，而且每个随机种子在所有并发配置下都重复发送相同的起始提示词。32 个用户以下，不少请求命中了缓存。2026-10-23，我们每轮运行前都清空缓存，并将时钟锁定在 900 MHz 后重新测量：

```listing
title: 清空与未清空缓存时的 Qwen3-8B 首 token 中位耗时，L4 锁频 900 MHz
source: capture/gpu/out-l4/load-flushed-vs-unflushed.txt
lang: text
note: 展示首 token 中位数。满足目标的请求占比与 P99 ITL 数据未展示。
---
median TTFT, flushed against unflushed
users   vLLM                                   SGLang
4       650 / 145 ms (4.5x)                    532 to 645 / 141 ms (3.8 to 4.6x)
8       951 to 978 / 264 to 274 ms (3.6x)      1,174 to 1,273 / 173 to 178 ms (6.6 to 7.3x)
16      1,550 to 1,587 / 294 to 295 ms (5.3x)  1,804 to 1,944 / 218 ms (8.3 to 8.9x)
32      1,982 to 2,084 / 2,012 to 3,091 ms     3,216 to 3,228 / 2,710 to 2,917 ms
…
```

重置缓存后，TTFT 中位数随并发逐步上升：4 个用户时约 0.65 秒，8 个用户时约 1.0 秒，16 个用户时约 1.6 秒。P99 ITL 从 8 个用户时的约 70 ms 跳升至 16 个用户时的 522 ms。因此，这块显卡的拐点位于 8 到 16 个用户之间。缓存掩盖了这个拐点。应通过清空缓存后的实测结果，确定生产并发上限，并将其设在拐点以下。

64 个用户时，输出吞吐下降。两个因素同时出现，现有 sweep 无法区分它们的影响。每个用户需要 640 个 token，64 个用户超出了 24,096-token 缓存池的容量，因此部分请求需要等待。与此同时，GPU 发生降频：时钟中位数从 16 用户时的 1,455 MHz 降到 64 用户时的 1,005 MHz。

```figure
id: fig-5-1
kind: chart
title: 旧 sweep 的吞吐峰值
claim: 缓存未重置时，32 个用户的输出吞吐峰值为每秒 275 个 token；这是吞吐峰值，不是延迟拐点。
caption: 横轴每一步将用户数加倍。区间表示三次运行的最低值和最高值。图表与上表使用 2026-10-21 同一轮未重置缓存的 sweep。重置缓存后的延迟拐点位于 8 到 16 个用户之间，正文给出了详细解释。来源：capture/gpu/summary/l4.json。
```

## 避开四个常见错误 {#s-benchmark-your-server-in-15-minutes-avoid-the-four-mistakes}

1. **重复使用热缓存。**固定 seed 配合随机数据集会重复发送相同的提示词。prefix cache 会再次服务这些提示词，让后续运行看起来更快。下一节介绍重置方法。
2. **允许模型提前停止。**不使用 `--ignore-eos` 时，部分回答会提前结束。这样实际测量的 token 数就少于目标输出长度。
3. **跳过 warmup。**服务器刚启动时，首批请求还需要编译 kernel 并处理冷缓存。使用 `--num-warmups`，或先发送几条请求再测量。
4. **忽略时钟频率。**GPU 降频或被其他任务共享时，运行速度会变慢。测量时记录 `nvidia-smi --query-gpu=clocks.sm,temperature.gpu --format=csv -l 1`。只比较时钟相近的运行。

## 在每轮运行之间重置 prefix cache {#s-benchmark-your-server-in-15-minutes-reset-the-prefix-cache-between-runs}

prefix cache 会保留先前提示词的 KV block。它会改变不同运行之间的速度，有时也会改变 greedy 请求的输出。[可复现输出一节](#s-get-reproducible-outputs)解释了输出变化的原因。

为观察速度变化，我们在 2026-10-22 和 2026-10-23 于 L4 节点的第二块 GPU 上，用同一个 seed 连续运行两次，没有重置缓存。测试模型为 `Qwen/Qwen3-0.6B`，共发出 64 个提示词、并发 16 个用户，输入 512 个 token，输出 128 个 token。该 GPU 由其持有者共享且未锁频，因此应参考变化比例，不要依赖具体耗时。

```listing
title: 同一负载连续运行四次的 TTFT 中位数（ms）
source: capture/gpu/out-l4/prefix-cache-flush.txt
lang: text
note: 显示汇总表中的 vLLM 数据。SGLang 行未展示。
---
engine        fresh   repeat, not flushed   repeat after a flush   repeat, not flushed
…
vLLM 0.6B     925     148                   1,163                  184
```

未重置缓存的重复运行，TTFT 中位数比首次运行低约 6 倍。重置缓存后，TTFT 又回到首次运行的水平。TPOT 变化不到 15%，因为缓存命中减少了 prefill 工作，却没有减少 decode 工作。

每次对比运行都应执行以下步骤：

1. 运行前清空缓存。重启服务器，或调用 `POST /reset_prefix_cache`。该路由只有在设置 `VLLM_SERVER_DEV_MODE=1` 时才存在；启用此模式的服务器不得对外暴露。
2. 每次运行都使用新的 `--seed`，让随机数据集生成不同提示词。
3. 记录缓存 token 数。运行前后分别读取 `vllm:prefix_cache_hits_total` 和 `vllm:prefix_cache_queries_total`。
4. 如需查看每条响应的缓存 token 数，启动服务器时设置 `--enable-prompt-tokens-details`，然后读取响应中的 `usage.prompt_tokens_details.cached_tokens`。
5. 将缓存配置和缓存 token 数记录在结果旁边。

`vllm bench sweep serve` 会在每轮运行之间自动重置服务器缓存。

## 选择闭环负载或固定请求速率 {#s-benchmark-your-server-in-15-minutes-choose-a-closed-loop-or-a-fixed-rate}

`--max-concurrency` 会保持固定数量的用户持续发出请求。服务器变慢后，用户会更晚发出下一个请求，负载会自行下降。这种闭环测试不会积累等待请求。

`--request-rate` 会按固定速率发出请求，不管服务器是否跟得上。超过服务器的处理能力后，队列会持续增长，每个后续请求的首 token 都会更慢。真实流量更接近固定速率。在设定容量上限前，两种方式都要测。

## 使用 vLLM 自带的客户端 {#s-benchmark-your-server-in-15-minutes-use-the-vllm-client}

vLLM 自带 `vllm bench serve` 客户端。它会报告相同的四项指标，无须另行安装客户端。0.31.0 中，设置 `VLLM_USE_RUST_BENCH=1` 会运行使用 Rust 编写的同一客户端。以下循环会用它执行同一轮 sweep：

```bash
for c in 1 2 4 8 16 32 64; do
  vllm bench serve --model Qwen/Qwen3-8B \
    --dataset-name random --random-input-len 512 --random-output-len 128 \
    --max-concurrency $c --num-prompts $((c * 4 > 16 ? c * 4 : 16)) \
    --seed $c --ignore-eos --num-warmups 2 \
    --save-result --result-filename sweep-c$c.json
done
```

2026-10-23，我们按原命令使用共享 L4 节点的第二块 GPU、`Qwen/Qwen3-8B-FP8` 执行了此循环。每次运行都完成并写入结果文件。GPU 发生降频，因此不报告该轮的数值。

2026-10-23，我们在同一 vLLM server 上运行了三个客户端：SGLang client、`vllm bench serve` 及其 Rust 版本。模型为 `Qwen/Qwen3-0.6B`，运行在共享 L4 节点的第二块 GPU 上。GPU 时钟发生降频，但每次运行都保持在 420 到 495 MHz。每次运行前都重置缓存，并在两轮测试中交替使用客户端。

```listing
title: 三种客户端各运行两轮的输出 tok/s
source: capture/gpu/out-l4/bench-client-bias.txt
lang: text
note: 展示吞吐表中并发 64 的行。其余行和 TTFT 表未展示。
---
users   temperature   SGLang client    vllm bench       vllm bench, Rust
…
64      0             359, 348         379, 377         371, 365
64      0.7           331, 343         360, 363         356, 353
```

- **两种 vLLM 客户端结果接近。**`vllm bench serve` 的 Python 与 Rust 版本，在 1、16、64 个用户时的差异都处于噪声范围内。
- **SGLang 客户端测得的服务器较慢。**它的 TTFT 中位数比 `vllm bench serve` 高 3% 到 10%。并发为 16 和 64 个用户时，输出吞吐低 2% 到 8%。单用户时，其中一轮的吞吐高于其他所有轮次，因此我们不报告该场景的吞吐差异。
- **不同客户端使用的提示词不同。**两个客户端从各自的随机数据集中抽取 token，因此小幅差异可能来自提示词本身。
- **temperature 会改变结果。**temperature 为 0.7 时，TPOT 中位数高于 temperature 为 0 的结果。单用户时高 10% 到 13%；并发为 16 和 64 个用户时高 3% 到 6%。

因此，本手册中 temperature 为 0、由 SGLang client 得到的表格数据，可能比使用 `vllm bench serve` 测得的结果慢几个百分点。每轮对比都应使用同一个客户端和相同的 temperature。

```takeaways
- 使用一个客户端逐步提高并发，并一起记录吞吐、TTFT、TPOT 和 ITL。
- 每轮运行都用新 seed、忽略结束 token，并先执行 warmup。
- 对比运行前清空 prefix cache，并记录缓存 token 数。
- 记录 GPU 时钟，只比较时钟接近的运行。
- 设定容量上限前，同时运行固定请求速率和闭环负载测试。
- 在每条结果旁记录客户端和 temperature。
```

Sources: vLLM 0.31.0 文档（docs/benchmarking/cli.md、docs/benchmarking/sweeps.md）；vLLM 0.31.0 源码（vllm/benchmarks/serve.py）；capture/gpu/summary/l4.json（load.vllm-b）；SGLang 101 sweep 工具（capture/gpu/sweep.py）；SGLang 0.5.22 benchmark client 源码（python/sglang/benchmark/serving.py、python/sglang/benchmark/datasets/random.py）；capture/gpu/out-l4/prefix-cache-flush.txt、capture/gpu/out-l4/bench-client-bias.txt、capture/gpu/out-l4/livecheck-2026-10-23.txt、capture/gpu/out-l4/load-flushed-vs-unflushed.txt。
