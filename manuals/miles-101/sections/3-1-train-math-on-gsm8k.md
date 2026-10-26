# 用 GSM8K 训练数学推理

> 使用二元 reward 的 GSM8K 是能展示 GRPO 学习过程的最小配置，而组大小决定每一步能提供多少学习信号。

读完本节后，你可以用 GSM8K 训练小模型，并选择每个 prompt 要采样多少个答案。

**我们的结果：**训练 24 步后，每个 prompt 生成 4、8 或 16 个答案所带来的 reward 增幅都落在同一个范围内。答案越多，每次 rollout 越久。

## 运行这套配置 {#s-train-math-on-gsm8k-run-the-recipe}

[第 1.1 节](#s-run-grpo-on-one-gpu)中的启动脚本就是这套配置。以下 flag 决定每一步的设置：

```bash
--rollout-batch-size 32 --n-samples-per-prompt 8 --global-batch-size 256 --rm-type math
```

**Group：**engine 为一个 prompt 生成的全部答案。GRPO 会在组内比较各个答案，因此如果所有答案的 reward 都相同，该组就没有学习信号。

`--global-batch-size` 应等于 prompt 数乘以每个 prompt 的答案数，本例为 32 乘以 8。这样每次 rollout 正好对应一次 optimizer step。

## 选择组大小 {#s-train-math-on-gsm8k-choose-the-group-size}

我们只修改 `--n-samples-per-prompt`，并相应调整 `--global-batch-size`。每个 prompt 生成 4 个答案时，在[第 1.1 节](#s-run-grpo-on-one-gpu)的命令中加入：

```bash
-e MILES_NUM_ROLLOUT=24 -e MILES_EXTRA_ARGS="--n-samples-per-prompt 4 --global-batch-size 128"
```

下表比较了每次训练的前 24 步。reward 增幅是第 16 至 23 步的平均值减去第 0 至 7 步的平均值。

| 每个 prompt 的答案数 | 运行次数 | reward 增幅 | 答案长度，前 8 步至后 8 步 | 每步 rollout 耗时 |
|---|---|---|---|---|
| 4 | 1 个随机种子 | +0.053 | 735 至 673 token | 14 个 clean step 耗时 32.5 s |
| 8 | 3 个随机种子 | +0.038 至 +0.098 | 712 至 734，之后降至 580 至 637 | 默认随机种子的 48 步运行中，相同 14 步耗时 59.1 s |
| 16 | 1 个随机种子 | +0.097 | 728 至 591 token | 188.2 s，没有 clean step |

```figure
id: fig-3-1
kind: chart
title: 每个 prompt 的答案更多，24 步内的学习效果相近
claim: 每个 prompt 使用 4 或 16 个答案时的 reward 增幅，都在使用 8 个答案的三个随机种子范围内。
caption: 每次运行前 24 步的 reward 增幅。三个绿色柱表示使用不同随机种子的相同配置。
```

**实际测量结果：**在 24 步内，组大小对 reward 没有明显影响。16 个答案的运行增幅为 +0.097，三个 8 答案随机种子中的一个增幅为 +0.098。8 答案配置的随机种子范围为 0.038 至 0.098，覆盖了所有运行结果。

代价很明确：答案越多，每一步要生成的 token 就越多。4 答案配置在 14 个 clean step 上的 rollout 耗时为 32.5 s。8 答案配置使用默认随机种子运行了 48 步，日期不同，且发生在启用 heat guard 之前，因此没有暂停影响。相同的 14 个步骤耗时为 59.1 s。

16 答案配置的每个步骤都与 heat guard 暂停重叠，因此没有 clean step 耗时。它的中位数为 188.2 s，其中包含暂停时间。

16 答案配置还记录了 22,357 条 `503 Service Unavailable`，错误峰值最长约 60 s。客户端重试了每次请求，训练继续运行。当时有 512 个未完成请求，router 可能短暂找不到空闲的 engine。我们没有确认这一原因。[第 1.2 节](#s-add-a-watchdog)使用 watchdog 回放了这些错误峰值。

解读结果时要留意其限制。4 答案和 16 答案配置都只运行了一个随机种子。16 答案配置完成了全部 24 步。之后，我们的运行队列因达到时间上限而在容器关闭期间停止了它，具体情况见[实验记录](#s-ref-lab-notes)。

## 未运行的测试 {#s-train-math-on-gsm8k-what-we-did-not-run}

我们没有测试每步处理 16 或 64 个 prompt 的 rollout batch size。为控制实验时长，我们停止了这部分测试。

```takeaways
- 从 32 个 prompt、每个 prompt 生成 8 个答案开始。
- 保持 global batch size 等于 prompt 数乘以答案数。
- 至少再使用一个随机种子验证组大小的变化，因为单次运行的结果处于随机种子波动范围内。
```

来源：capture/gpu/miles_grpo.py；capture/gpu/out-gb10/503-bursts.txt；capture/gpu/summary/miles-gb10-lab.json (runs.e2-n4、runs.e2-n16、runs.plain-48、runs.plain-48-s2、runs.plain-48-s3、partial)。
