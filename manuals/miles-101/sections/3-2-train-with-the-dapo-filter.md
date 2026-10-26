# 使用 DAPO filter 训练

> DAPO filter 会丢弃所有答案得分相同的组，让每一步只用能提供学习信号的组训练。

在普通 GRPO 训练中，我们约有一半的组里所有答案都答对或都答错。这些组不提供学习信号。filter 会丢弃这些组，并继续向 engine 请求更多 prompt，直到训练步骤中有足够的有效组。

读完本节后，你可以启用 zero-variance filter，检查它丢弃了多少组，并测量额外 prompt 带来的成本。

**我们的结果：**filter 每步丢弃 16 至 48 组，其中多数答案全对。rollout 耗时增加到原来的 1.5 至 2.8 倍。单个随机种子训练 12 步时，filter 前统计的 reward 高于未使用 filter 的运行。我们认为这是指标偏差，而不是学习效果。

## 启用 filter {#s-train-with-the-dapo-filter-turn-it-on}

通过 `MILES_EXTRA_ARGS` 为[第 1.1 节](#s-run-grpo-on-one-gpu)的训练添加两个 flag：

```bash
-e MILES_EXTRA_ARGS="--dynamic-sampling-filter-path miles.rollout.filter_hub.common_filters.apply_reward_nonzero_std_filter --over-sampling-batch-size 48"
```

我们的实验使用了同一 filter 的旧路径，Miles 已将它标记为 deprecated。在我们测试的版本中，旧路径会调用这里展示的 filter，因此结果相同。

**Over-sampling batch：**rollout 每次发送给 engine 的 prompt 数量。该值不能小于 `--rollout-batch-size`。

rollout 会发送 48 个 prompt。每组完成后，filter 会保留或丢弃该组。如果已保留组数加上等待完成的组数还凑不够 32 组，rollout 就再发送 48 个 prompt。保留 32 组后，剩下的请求会停止，这些请求的答案不会使用。

## 统计丢弃的组 {#s-train-with-the-dapo-filter-count-the-dropped-groups}

rollout 会在 `perf N` 日志行中为 filter 记录三个数字：

| 日志名称 | 统计内容 |
|---|---|
| `rollout/dynamic_filter/drop_zero_std_0` | 所有答案都答错的丢弃组数 |
| `rollout/dynamic_filter/drop_zero_std_1` | 所有答案都答对的丢弃组数 |
| `rollout/raw_reward_unfiltered` | filter 运行前，所有已完成答案的平均 reward |

未启用 filter 时，这些组会保留在 batch 中。查看 `rollout/zero_std/count_0` 和 `rollout/zero_std/count_1`，即可知道它们的数量。

**实际测量结果：**使用随机种子 1，分别启用和关闭 filter 运行 12 步，组数如下：

| 运行配置 | 所有答案 reward 相同的组数 | 其中所有答案都答对的组数 |
|---|---|---|
| 未启用 filter，参与训练 | 384 组中 191 组 | 其中 142 组 |
| DAPO filter，丢弃 | 丢弃 399 组，另保留 384 组 | 其中 306 组 |

未启用 filter 时，trainer 使用的组中有一半没有提供学习信号。启用 filter 后，每步丢弃 16 至 48 组，中位数为 36 组。被丢弃的组大多来自模型已经能全部答对的简单 prompt。

## 测量过采样的成本 {#s-train-with-the-dapo-filter-measure-the-over-sampling-cost}

filter 运行的每次 rollout 都与 heat guard 暂停重叠，因此没有 clean step。比较 rollout 耗时前，我们从每次 rollout 中扣除了暂停时间。未启用 filter 的对照组是随机种子 1 的 12 步运行。扣除暂停后，中位耗时为 58.0 s，与 6 个 clean step 的 59.1 s 接近。

```figure
id: fig-3-2
kind: chart
title: filter 会额外消耗一到两批 prompt
claim: 丢弃 16 组或更少的步骤只需要一批 48 个 prompt，丢弃更多组的步骤需要两批。
caption: 随机种子 1 的 12 步训练中，每步 rollout 扣除暂停后的秒数。
```

有三步丢弃了 16 组或更少，因此一批 48 个 prompt 就够了。这些步骤的 rollout 中位耗时为 88.7 s，是未启用 filter 时 58.0 s 的 1.5 倍。其余九步需要第二批 prompt，中位耗时为 164.4 s，是对照组的 2.8 倍。

一批 48 个 prompt 的工作量是 32 个 prompt 的 1.5 倍，与第一组耗时比相符。第二批会增加更多工作，而且训练步骤必须等待最终保留的最慢组。两次运行都包含 heat guard 暂停；启用 filter 的 12 步总耗时为 113 分钟，未启用时为 60 分钟。

## 比较 reward {#s-train-with-the-dapo-filter-compare-the-reward}

filter 会改变 `rollout/raw_reward` 的含义，因为被丢弃的组不计入其中。要比较两次运行，请读取 filter 运行中的 `rollout/raw_reward_unfiltered`。

```figure
id: fig-3-2b
kind: chart
title: filter 前统计的 reward 更高
claim: 单个随机种子运行 12 步时，filter 前统计的 reward 有 8 步更高。
caption: 随机种子 1 的 12 步训练中，所有已完成答案的每步平均 reward。
```

启用 filter 后，12 步平均值为 0.686；未启用时为 0.657。五次基线运行的 12 步均值为 0.638 至 0.660，因此 0.686 高于所有基线。前四步的均值也更高，为 0.672，对照组为 0.625；此时 filter 还不太可能显著改变模型。

我们认为，原因在于这个数字统计的对象。filter 前的 reward 只统计 rollout 停止前已完成的组。被停止的请求通常最慢，答案也最长。如[第 4.2 节](#s-handle-long-responses)所示，达到长度上限的答案通常得分为 0。因此该数字可能偏高，我们把均值升高视为这种偏差，而非学习效果。

这次结果来自单个随机种子的 12 步运行。filter 运行完成了全部 12 步。随后运行队列达到时间上限，在容器关闭期间停止了它。要判断 reward 是否真的变化，应增加训练步数和第二个随机种子，并与基线随机种子的波动范围比较。

## 如何选择 {#s-train-with-the-dapo-filter-decide}

当很多组的所有答案得分相同时，可以考虑使用 filter，但要接受 rollout 时间变长。根据丢弃比例设置 over-sampling batch。我们约有一半组被丢弃时，32 个保留组只使用 48 个 prompt 对多数步骤而言不够。

```takeaways
- 很多组的答案得分都相同时，再启用 filter。
- 统计每一步丢弃的组，并区分答案全对和全错的组。
- 每增加一批 prompt，都要考虑 rollout 时间会增加。
- 比较 filter 前的 reward，并至少运行第二个随机种子后再报告增幅。
```

来源：Miles main 08752a12 中的 filter hub、common_filters 和 dynamic_sampling_filters；capture/gpu/summary/miles-gb10-lab.json (runs.e2b-dapo-filter、runs.e6a-base、runs.plain、runs.plain-48、runs.plain-48-s2、runs.plain-48-s3)；capture/gpu/summarize_miles.py；Miles main 08752a12 中的 rollout loop 和 filter 指标。
