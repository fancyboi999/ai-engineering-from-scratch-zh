# 同时运行 rollout 和训练

> async training 允许在训练期间运行 rollout，但在单 GPU 上这两个阶段仍然需要等待彼此。

普通 Miles 训练步骤会先执行 rollout，再训练，然后再次执行 rollout。在多 GPU 环境中，trainer 工作时 rollout GPU 会等待，rollout GPU 工作时 trainer 也会等待。async training 可以减少这部分等待，但会使用旧权重生成的样本。

读完本节后，你可以判断 async training 是否适合自己的布局，以及哪些设置会影响它的成本。

我们没有在 GB10 上运行 async training。本节内容来自 Miles 源码和文档。

## 两种 async 模式 {#s-run-rollout-and-training-at-once-two-async-modes}

两种模式都使用 `train_async.py`，而不是 `train.py`：

| 模式 | 启动方式 | 并行内容 |
|---|---|---|
| 超前一步 | `train_async.py` | 当前步骤训练时，同时执行下一步的 rollout |
| 完全异步 | `train_async.py --fully-async` | worker 持续生成，trainer 从 buffer 中获取组 |

第一种模式使用默认更新间隔时，每个样本最多只落后一个权重版本。fully async 模式下，样本的新旧程度取决于 trainer 清空 buffer 的速度。

## 单 GPU 上的 async 模式 {#s-run-rollout-and-training-at-once-what-async-gives-on-one-gpu}

启用 `--colocate` 后，trainer 和 engine 会共用 GPU。Miles 只允许 fully async 模式与 colocate 搭配，因此 one-step-ahead 模式需要独立 GPU。fully async 模式可以在单 GPU 上通过 `--colocate` 运行，但只能使用 Megatron trainer，不能使用本手册的 FSDP trainer。此外，训练期间会暂停生成，因此两个阶段仍然轮流运行。

因此，在单 GPU 上 async training 不会节省时间，只会增加旧样本的成本，并不能实现并行。可先在单 GPU 上熟悉相关设置，再用于更大规模的训练。

## 控制样本的新旧程度 {#s-run-rollout-and-training-at-once-control-the-age-of-the-samples}

使用独立 rollout GPU 时，以下设置决定样本最多可以落后多少：

- `--update-weights-interval` 设置每隔多少训练步骤向 engine 更新一次权重。
- `--max-weight-staleness` 丢弃落后超过指定权重版本数的样本。未设置时没有限制。
- `--async-unused-samples-handler` 决定如何处理被丢弃的样本：`drop` 或 `retry`。
- `--async-max-concurrent-samples` 限制 engine 同时生成的样本数。
- `--pause-generation-mode` 决定权重更新期间如何处理正在运行的请求：`abort`、`retract` 或 `in_place`。默认值为 `retract`。fully async 模式不接受 `abort`，也不接受与 `--colocate` 搭配的 `in_place`。

启用 `--fully-async` 时，`--over-sampling-batch-size` 不生效。

## 样本越旧，学习率越低 {#s-run-rollout-and-training-at-once-lower-the-learning-rate-as-samples-get-older}

样本新旧程度和学习率相互影响。2026 年一项针对 1B 和 3B 参数 Llama 模型的 async GRPO 研究同时调整了这两项。[来源列表](#s-ref-sources)将其列为 asynchronous GRPO 崩溃研究。稳定运行的最大学习率会随权重更新间隔的步骤数成比例下降。更新间隔翻倍时，学习率上限约减半。

我们没有测试这条规则。可以先据此开始：增加 `--update-weights-interval` 或样本年龄上限时，按相同比例降低学习率。之后观察差距和 reward。

## 观察指标 {#s-run-rollout-and-training-at-once-what-to-watch}

- 检查每个样本对应的权重版本。rollout 指标会报告样本的新旧程度。
- 查看被丢弃或重试的样本比例。比例过高说明 engine 做了很多无用工作。
- 查看 trainer 和 engine 之间的差距，参见[第 5.2 节](#s-check-the-first-step)。旧样本会增加 kernel 差异以外的偏差。

我们的 GB10 只有一张 GPU，缺少可供并行的第二张 GPU，因此无法测量 async training 带来的并行效果。

```takeaways
- 只有 rollout 和训练运行在不同 GPU 上时才使用 async training。
- 限制样本年龄；允许样本更旧时，应降低学习率。
- 单 GPU 上只用 async 模式熟悉相关设置。
```

来源：Miles main 08752a12 中的 fully async 文档、train_async.py 和 async rollout 参数；Scaling Laws for Collapse in Asynchronous GRPO，arXiv 2607.01083。
