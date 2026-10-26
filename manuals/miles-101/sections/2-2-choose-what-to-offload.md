# 选择在不同阶段卸载什么

> trainer 和 engine 在一张 GPU 上轮流工作，卸载设置决定每一方会释放哪些资源。

读完本节后，你可以决定一方工作时另一方释放哪些内存，也能在不受温度暂停干扰的情况下检查卸载设置的变化。

**我们的结果：**让 engine 保持加载状态后，一次约一分钟的 rollout 节省了 0.6 至 1.8 s。早期一组运行显示节省 12%，但这是因为答案更短。

## 了解两个开关 {#s-choose-what-to-offload-know-the-two-switches}

`--colocate` 会为两端启用 offload。以下两个 flag 可以分别关闭一端的卸载：

- `--no-offload-rollout` 会在 trainer 工作时把 engine 权重和 KV cache 留在 GPU 上。engine 启动时也不会启用内存节省机制。
- `--no-offload-train` 会在 engine 工作时把 trainer 权重和 optimizer 状态留在 GPU 上。

`--offload-rollout-level kv_cache` 会释放 KV cache 和 CUDA graph 内存，但保留 engine 权重。

通过 `MILES_EXTRA_ARGS` 为[第 1.1 节](#s-run-grpo-on-one-gpu)的训练添加开关：

```bash
-e MILES_EXTRA_ARGS="--no-offload-rollout --sglang-mem-fraction-static 0.25"
```

trainer 端还有自己的计时器。`perf/sleep_time` 记录 trainer 在训练后把状态移到主机内存所需的时间，Miles 会在下一步日志中写入该值。`perf/wake_up_time` 记录计算 log probability 前把状态移回来的时间。训练前释放 engine 没有单独的计时器。权重更新后恢复 engine 的耗时记录在 `perf/finalize_and_resume_engines_time`。

## 对齐训练步骤，每次只比较一个改动 {#s-choose-what-to-offload-compare-one-change-at-a-time-on-the-same-steps}

我们在同一天使用随机种子 1 运行了两次，各 12 步，并将两次运行的 engine 内存比例都设为 0.25。唯一差别是是否启用 `--no-offload-rollout`。

| 设置 | clean rollout 步数 | clean rollout 中位数 | 所有步骤的 trainer offload | 所有步骤的 trainer onload | 所有步骤的权重更新 |
|---|---|---|---|---|---|
| default offload | 4 of 12 | 60.7 s | 0.73 s | 0.76 s | 0.62 s |
| engine kept loaded | 3 of 12 | 56.7 s | 0.75 s | 0.82 s | 0.64 s |

表中 clean step 按[前言](#s-front-how-we-tested-it)中的定义统计。

两个中位数对应的步骤不同，而且 rollout 耗时会随答案长度变化。较早的步骤生成约 800 token 的答案，较晚的步骤约 690 token。因此应比较两次运行中都没有暂停影响的相同步骤：

```figure
id: fig-2-2
kind: chart
title: 保持 engine 加载可节省一两秒
claim: 两次运行中都未受暂停影响的步骤，保持 engine 加载为每次 rollout 节省了 0.6 至 1.8 s。
caption: 每对柱表示同一天两次运行的一个步骤，两次生成的答案长度相近。
```

**实际测量结果：**在第 0、1 和 8 步，耗时分别从 69.4 s 降至 68.0 s、从 58.5 s 降至 56.7 s、从 55.8 s 降至 55.2 s，节省 1% 至 3%。两次运行的训练阶段都受到了暂停影响，因此没有可比较的 clean step。全部 12 步的中位数分别为 240.3 s 和 239.1 s，其中包含了暂停时间。

第一组运行显示的收益更大，耗时从 59.1 s 降至 52.0 s。但这组比较同时改变了内存比例，而且两次运行的 clean step 并不相同。[实验记录](#s-ref-lab-notes-results-from-one-run)说明了为什么这组结果不能作为结论。

仅凭一个随机种子不足以判断两种设置的优劣。在 heat guard 暂停的情况下，GB10 的步骤间耗时波动已达到一两秒。

## 如何选择 {#s-choose-what-to-offload-decide}

保留默认的 offload 设置。只有在内存有余量时，才关闭 engine offload。内存比例设为 0.25 时，trainer 工作期间 engine 会占用约四分之一的 GPU 内存。GB10 上的 trainer 也需要这部分内存。[第 2.1 节](#s-pick-a-model-size)展示了 4B 模型几乎不留余量的情况。

```takeaways
- 有测量结果支持调整之前，保留默认 offload 设置。
- 在相同步骤上比较 offload 设置，因为 rollout 耗时会随答案长度变化。
- 测试 offload flag 时保持内存比例不变。
```

来源：capture/gpu/summary/miles-gb10-lab.json (runs.e3e-base-frac025、runs.e3f-no-offload-rollout-frac025、runs.e6a-base、runs.e3c-no-offload-rollout、runs.e3b-offload-kv、runs.e3d-no-offload-train)；capture/gpu/summarize_miles.py；Miles main 08752a12 中的 torch_native actor sleep 和 wake_up。
