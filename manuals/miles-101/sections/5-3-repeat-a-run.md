# 重复运行并进行比较

> 一次运行无法区分效果和噪声，因此应使用第二个随机种子验证改动，再判断结果是否可信。

我们用相同的 GRPO 配置运行了三次。第一次使用默认随机种子，engine 将其记录为 1234；另外两次使用随机种子 2 和 3。其他设置没有变化，但三次运行仍以不同结果结束。

读完本节后，你可以区分真实效果和随机种子噪声，也可以在 GPU 过热时正确计时。

**我们的结果：**随机种子 1 的 12 步运行中，所有步骤的 rollout 中位耗时为 83.9 s；只看 6 个 clean step 时为 59.1 s。

## 了解配置的波动范围 {#s-repeat-a-run-know-the-noise-of-your-setup}

每次运行都使用 32 个 prompt、每个 prompt 生成 8 个答案，在 GSM8K 上训练 Qwen3-0.6B 共 48 步。下表比较前 8 步与最后 8 步的均值：

| 随机种子 | Reward，前 8 步 | Reward，最后 8 步 | 答案长度，前 8 步 | 答案长度，最后 8 步 | 截断比例，前 8 步 | 截断比例，最后 8 步 |
|---|---|---|---|---|---|---|
| default (1234) | 0.636 | 0.758 | 724 | 447 | 0.33 | 0.08 |
| 2 | 0.653 | 0.736 | 712 | 480 | 0.30 | 0.12 |
| 3 | 0.614 | 0.766 | 734 | 456 | 0.34 | 0.09 |

**Length：**答案的平均 token 长度。**截断比例：**达到 1,024-token 上限的答案比例。

三个随机种子都学到了内容：reward 上升，答案变短。最终 reward 仍在 0.736 至 0.766 之间波动，因此此配置中小于 0.03 的差异属于噪声范围。

三次运行中，trainer 和 engine 的差距在每一步都保持在 0.0136 至 0.0164 之间。

## 将改动与波动范围比较 {#s-repeat-a-run-compare-a-change-against-the-spread}

报告改动带来收益前：

1. 至少使用两个随机种子运行改动后的配置。
2. 与基线随机种子的波动范围比较，不要只对比一次基线运行。
3. 只有改动结果落在波动范围之外时，才报告变化。

在此配置中，单个随机种子的 reward 变化 0.01 并不能说明问题。两个随机种子都变化 0.05 时，值得再运行第三个种子。

## 只对 clean step 计时 {#s-repeat-a-run-time-only-clean-steps}

我们的 GB10 长时间运行后会过热。[第 1.2 节](#s-add-a-watchdog-guard-the-gpu-heat)介绍的 heat guard 会在温度达到 84 C 时暂停容器。GPU 降温后恢复运行，最长暂停两分钟。暂停会增加所在步骤的阶段耗时。我们预计暂停不会改变样本和 loss，但尚未测试这一点。

因此，我们只报告 rollout 未与任何暂停重叠的训练步骤的耗时。摘要脚本会根据暂停日志和步骤时间戳识别这些步骤。[实验记录](#s-ref-lab-notes)说明了判定规则。

仅有 clean step 数据仍然不够。相同设置在第一次 48 步运行中得到 47.5 s 的 rollout 中位耗时。该次运行早于 heat guard，因此没有暂停影响。四天后，随机种子 1 的 12 步运行中，6 个 clean step 耗时为 59.1 s。比较相同的 6 个步骤时，48 步运行耗时为 60.9 s。

rollout 耗时随答案长度变化，而 48 步运行的中位数包含了后期答案较短的步骤。因此应对齐相同步骤进行比较，并使用第二个随机种子重复测试。
```figure
id: fig-5-3
kind: chart
title: heat pause 增加的耗时不属于计算工作
claim: 与 heat pause 重叠的训练步骤比 clean step 多耗时约 45 s。
caption: 一次 12 步运行中每一步 rollout 的秒数。
```


```takeaways
- 每项准备报告的改动至少运行两个随机种子。
- 只有改动结果超出基线随机种子的波动范围时才报告。
- 只对未受暂停影响的步骤计时，并比较相同步骤。
```

来源：capture/gpu/summary/miles-gb10-lab.json (runs.plain-48、runs.plain-48-s2、runs.plain-48-s3、runs.e6a-base、median_unpaused)；capture/gpu/summarize_miles.py；capture/gpu/out-gb10/thermostat.log；capture/gpu/out-gb10/unpaused-timing.txt。
