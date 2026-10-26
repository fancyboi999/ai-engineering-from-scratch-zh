# 用 partial rollout 处理长回答

> partial rollout 可以避免最慢的回答拖长每一步的耗时。

rollout 步骤会一直等到最后一个答案生成完。如果少数答案达到长度上限，整个步骤都必须等待，期间 engine 可能处于空闲状态。

读完本节后，你可以测量长回答的成本，并避免它们拖慢每一步。

我们没有在 GB10 上运行 partial rollout。本节提供的测量数据仅包括基线训练的答案截断比例。

## 先测量长回答 {#s-handle-long-responses-measure-the-long-answers-first}

`rollout/truncated` 用于报告达到 `--rollout-max-response-len` 限制的答案比例。我们的三个基线随机种子都将上限设为 1,024 token。前 8 步中，0.30 至 0.34 的答案达到上限。模型后来学会生成较短答案，因此最后 8 步中只有 0.08 至 0.12 的答案达到上限。[第 5.3 节](#s-repeat-a-run)列出了每个随机种子的具体数据。

截断比例过高会带来两种成本。被截断的答案通常没有生成最终答案，因此 math reward 会给它 0 分。训练步骤也必须等待最长的答案。

## 选择提高长度上限或使用 partial rollout {#s-handle-long-responses-choose-between-a-higher-limit-and-partial-rollout}

如果被截断的答案已经接近正确，可以提高 `--rollout-max-response-len`。这样模型的长答案可以得到正确评分，但每一步会耗时更久。

如果少数很长的答案决定了步骤耗时，可以改用 partial rollout：

```bash
-e MILES_EXTRA_ARGS="--partial-rollout --over-sampling-batch-size 48 --dynamic-sampling-filter-path miles.rollout.filter_hub.common_filters.apply_reward_nonzero_std_filter"
```

此处使用的 filter 与[第 3.2 节](#s-train-with-the-dapo-filter)相同。

启用 partial rollout 后，训练步骤会先使用已完成的组。尚未完成的组会返回数据 buffer，在后续步骤中从已有 token 继续生成。engine 不会重新生成这些 token。

partial rollout 可以与 over-sampling 搭配使用。完成组数量不足时，rollout 会启动下一批 prompt；`--over-sampling-batch-size` 用于设置每批大小。此类训练应保持同步。`--fully-async` 和 session server 都不接受 `--partial-rollout`。多轮和 agent generate function 也不支持它。

## 继续生成答案的成本 {#s-handle-long-responses-the-cost-of-continued-answers}

一个跨步骤继续生成的答案，可能从一组权重开始，在更新后的权重下结束。因此部分 token 来自旧权重。启用 partial rollout 后，要按照[第 5.2 节](#s-check-the-first-step)的方法监测 trainer 和 engine 之间的差距。

## 尚未测量的优化手段：speculative decoding {#s-handle-long-responses-speculative-decoding-a-lever-we-have-not-measured}

speculative decoding 也可以缩短 rollout。轻量 draft 会预测后续几个 token，engine 再通过一次前向计算检查它们。Miles 会给 SGLang speculative flag 添加 `--sglang-` 前缀并传递参数。对于 GLM-4.7 或 DeepSeek-V3 等自带 MTP 层的模型，Miles 文档提供了以下 flag：

```bash
--sglang-speculative-algorithm EAGLE --sglang-speculative-num-steps 3 --sglang-speculative-eagle-topk 1 --sglang-speculative-num-draft-tokens 4
```

可以从两种 draft 开始：

- **MTP draft。**上面的 flag 使用模型自身的 MTP 层作为 draft。没有 MTP 层的模型需要单独指定 draft，并使用 `--sglang-speculative-draft-model-path` 配置。训练会改变策略，因此 draft 会逐渐落后，能通过检查的 token 也会变少。Miles 可以使用当前策略训练 MTP 层，但只支持 Megatron trainer：`--mtp-num-layers 1 --enable-mtp-training`。
- **n-gram draft。**`--sglang-speculative-algorithm NGRAM` 不需要 draft 模型，而是根据 engine 已生成的 token 进行预测。SGLang 仅在 CUDA 上支持该模式，并且会关闭 overlap scheduler。

当 rollout 是瓶颈时，Miles 文档不建议在参数量低于约 13B 的 dense 模型上使用 speculative decoding，因为检查成本可能超过 draft 节省的耗时。我们的 Qwen3-0.6B 属于这个范围，但我们没有测量该模式。如果你要尝试，应使用相同的步骤和随机种子比较 rollout 耗时及差距。

```takeaways
- 更改长度上限前先查看答案截断比例。
- 被截断的答案接近正确时，提高长度上限。
- 少数长回答拖长步骤时使用 partial rollout，并监测差距。
- 小型 dense 模型上的 speculative decoding 应先测量，不要作为默认设置。
```

来源：capture/gpu/summary/miles-gb10-lab.json (runs.plain-48、runs.plain-48-s2、runs.plain-48-s3)；Miles main 08752a12 中的 partial rollout、over-sampling 参数和单轮 generate function；Miles main 08752a12 中的 speculative decoding 文档和 SGLang 参数透传逻辑；SGLang speculative decoding 文档。
