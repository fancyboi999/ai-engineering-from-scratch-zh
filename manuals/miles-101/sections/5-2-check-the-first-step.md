# 信任训练前先检查第一步

> 第 0 步中 trainer 和 engine 使用相同权重，因此第一步能检验配置是否正确。

第 0 步是成本最低的测试。训练尚未发生，因此 trainer 和 engine 之间的所有差异都来自配置，而不是学习过程。

读完本节后，你可以检查训练的第一步，并在它基于错误数值训练前停止异常运行。

## 检查第 0 步的两个值 {#s-check-the-first-step-check-two-values-at-step-0}

第 0 步中，trainer 使用与 engine 相同的权重计算样本 log probability。因此，step-0 指标日志中的两个值应为 0：

- `train/ppo_kl`：trainer 更新前后的概率分布之间的 KL。第一次更新之前，两者相同。
- `train/pg_clipfrac`：被裁剪 token 的比例。第一次更新之前不会发生裁剪。

Miles 在自己的测试中检查这两个值：`train/ppo_kl` 小于 1e-9，`train/pg_clipfrac` 小于 1e-10。只有使用 Megatron trainer 并启用 `--ci-test` 时，该检查才会在每次 rollout 的首个 optimizer step 运行。`--ci-disable-kl-checker` 可以关闭检查。使用 FSDP trainer 或未设置该 flag 时，应自行读取这两个值。

我们的所有训练在第 0 步都记录了 0 的 clip fraction。

## 将差距与自己的范围比较 {#s-check-the-first-step-compare-the-gap-with-your-range}

除 true on-policy 模式外，trainer 和 engine 总会有差距，因为两端使用不同 kernel。第 0 步的差距仍应处于正常运行范围内：

| 我们的运行配置 | 第 0 步的差距 |
|---|---|
| Qwen3-0.6B，不使用 top-p 或 top-k，共 17 次运行 | 0.0148 至 0.0157 |
| Qwen3-0.6B，top-p 0.95、top-k 64 | 0.0136 |
| Qwen3-1.7B | 0.0109 |

差距取决于模型和 sampler，因此应为自己的配置建立范围。第 0 步差距达到正常范围的数倍，说明两端计算的模型不一致。常见原因包括某一端的 checkpoint 路径错误，或两端以不同方式读取模型格式。

## 直接检查权重 {#s-check-the-first-step-check-the-weights-directly}

按[第 1.1 节](#s-run-grpo-on-one-gpu)启动短跑时，添加 `-e MILES_NUM_ROLLOUT=2 -e MILES_EXTRA_ARGS="--check-weight-update-equal"`。第一次权重更新后，Miles 会比较 engine 和 trainer 的权重。使用 FP8 或其他低精度 engine 时，应添加 `--check-weight-update-allow-quant-error`，让检查容许预期的舍入误差。

每种新模型或新镜像运行一次检查即可，不必在每次长跑中都执行。

```takeaways
- 读取第 0 步的 train/ppo_kl 和 train/pg_clipfrac，并确认两者为 0。
- 将第 0 步差距与正常训练范围比较。
- 每种新模型或镜像都用 --check-weight-update-equal 运行一次短测试。
```

来源：capture/gpu/summary/miles-gb10-lab.json (各次运行的 per_step[0])；Miles main 08752a12 中的指标检查、Megatron 模型循环和权重更新检查参数。
