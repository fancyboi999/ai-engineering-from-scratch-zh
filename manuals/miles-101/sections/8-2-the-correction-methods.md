# 缩小差距的校正方法

> Miles 提供了多种方法处理 trainer 和 engine 之间的差距，每种方法针对不同原因。

[第 8.1 节](#s-why-rl-owns-an-engine)列出了五种差异来源：token、routing、sampling、数值和样本新旧程度。Miles 为每一种都提供了处理方法。有些方法可以消除原因，另一些只能降低它对梯度的影响。

读完本节后，你可以解释每种校正方法针对什么原因，以及哪些方法经过了我们的测量。

## 两类处理方法 {#s-the-correction-methods-two-kinds-of-method}

**消除原因的方法**会让两端执行相同的计算。使用后，这部分差距就会消失。

**重新加权的方法**不会消除差距，只会改变每个 token 在 loss 中的权重，避免两端意见不一致的 token 过度影响更新。

应先消除差异来源，因为重新加权会增加梯度方差。

## 处理方法 {#s-the-correction-methods-the-methods}

| 方法 | 类型 | 针对的原因 | 启用方式 |
|---|---|---|---|
| Sampling replay | 消除差异 | top-p 和 top-k 采样 | 将 `--rollout-top-k` 设为正数，可同时将 `--rollout-top-p` 设为小于 1 的值 |
| Routing replay | 消除差异 | MoE expert 选择 | `--use-rollout-routing-replay` |
| Token 输入输出 session | 消除差异 | 轮次间的文本转换 | `--use-session-server` |
| True on-policy 模式 | 消除差异 | 所有 kernel 差异 | [第 8.3 节](#s-why-true-on-policy-is-a-contract)中的契约 |
| Truncated importance sampling | 重新加权 | 其他残余差距 | `--use-tis --tis-clip 2.0` |
| 自定义 importance 或 rejection function | 重新加权 | 其他残余差距 | `--custom-tis-function-path`；Miles 示例中提供了 masked 版本 |
| 在比值中使用 engine log probability | 更改参考值 | 比值的分母 | `--use-rollout-logprobs` |
| Score centering | 更改 loss | off-policy 样本的分数漂移 | `--loss-type score_centering` |
| 样本年龄上限 | 丢弃样本 | 样本陈旧 | `--max-weight-staleness` |

**Truncated importance sampling：**为每个 token 赋予 trainer 概率与 engine 概率的比值作为权重，并限制权重上限。上限可以防止单个 token 主导更新。

**Score centering：**一种独立的 loss，使用 engine sampler 的 top-k 概率校正 off-policy 样本的分数。它会启用 engine 的 FP32 output layer，增加 serving 的计算和内存成本。

## 我们的测量结果 {#s-the-correction-methods-what-we-measured}

在 GB10 上运行 Qwen3-0.6B 时，我们的训练涉及其中两种方法：

- Sampling replay 将差距从 0.0153 降至 0.0135，下降 11.5%。运行详情见[第 4.4 节](#s-lower-the-logprob-gap)。
- Deterministic inference 不在该列表中，因为它不会消除任何差距来源。它能让 engine 重复自身的结果，但不会改变差距。运行详情见[第 4.5 节](#s-use-deterministic-inference)。

我们没有运行其他方法。多数方法只在 MoE 模型、多轮 rollout、低精度计算、async training 或 Hopper GPU 上才有意义。

## 我们的看法 {#s-the-correction-methods-our-view}

选择处理方法前先查看差距。dense 模型使用普通采样时，约 0.015 的稳定差距来自当前配置下的 kernel。重新加权只能隐藏它。改动后差距扩大，说明引入了新的原因：sampler、MoE 模型、FP8 rollout 或更旧的样本。应根据差距来源选择对应方法。

```takeaways
- 先消除差异来源，再考虑重新加权。
- 根据差异来源选择方法：sampler、routing、token、kernel 或样本新旧程度。
- 使用同一随机种子测量每种方法启用前后的差距。
```

来源：Miles main 08752a12 中的 importance sampling、routing replay、sampling replay、score centering 和 async 参数；Miles train-infer mismatch 示例；capture/gpu/summary/miles-gb10-lab.json (runs.e6a-base、runs.e11-topp-topk、runs.e6b-det-triton、runs.e6c-det-flashinfer)。
