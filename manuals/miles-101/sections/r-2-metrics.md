# 指标

> 本手册使用的指标及其在我们配置中的范围。

范围来自我们的实验：在一张 GB10 上使用 Qwen3-0.6B 和 GSM8K，每批 32 个 prompt，每个 prompt 生成 8 个答案，长度上限为 1,024 token。这些范围只适用于该配置。请用自己的两三个随机种子建立范围。

## Rollout {#s-ref-metrics-rollout}

| 指标 | 含义 | 我们的范围 |
|---|---|---|
| `rollout/raw_reward` | 单步的平均 reward | 0.53 to 0.87 per step over 48 steps |
| `rollout/response_lengths` | 答案平均长度，单位为 token | 396 to 787 |
| `rollout/truncated` | 达到长度上限的答案比例 | 0.02 to 0.43 |

## 训练 {#s-ref-metrics-training}

| 指标 | 含义 | 我们的范围 |
|---|---|---|
| `train/train_rollout_logprob_abs_diff` | trainer 与 engine 每个 token 的 log probability 绝对差值均值 | 0.0136 to 0.0164 with plain sampling |
| `train/train_rollout_kl` | 采样 token 上 engine 与 trainer 概率分布之间的 KL | 0.00063 to 0.00076 |
| `train/grad_norm` | gradient norm | 0.35 至 4.95 |
| `train/pg_clipfrac` | 更新达到 clip 上限的 token 比例 | 0 at every step |
| `train/ppo_kl` | trainer 更新前后概率分布之间的 KL | 0 at step 0 in a healthy run |
| `train/entropy_loss` | loss 中的 entropy 项 | 0 in our runs |

## 耗时 {#s-ref-metrics-time}

| 指标 | 含义 | 我们的数值 |
|---|---|---|
| `perf/step_time` | 完整训练步骤 | 152.6 s median of 48 steps, in a run made before the heat guard |
| `perf/rollout_time` | rollout 阶段 | 47.5 s median of 48 steps, in a run made before the heat guard |
| `perf/log_probs_time` | trainer 为样本评分的过程 | 23.4 s median of 48 steps, in a run made before the heat guard |
| `perf/train_time` | 训练阶段，含样本评分 | 100.3 s median of 48 steps, in a run made before the heat guard |
| `perf/update_weights_time` | 将新权重复制到 engine 的耗时 | 0.63 to 0.65 s for Qwen3-0.6B |
| `perf/sleep_time` | trainer 训练后将状态移到主机内存的耗时 | 0.76 s median over 48 steps for Qwen3-0.6B, and 1.9 to 3.7 s in the first two steps of the same 48-step run |
| `perf/wake_up_time` | 计算 log probability 前 trainer 将状态移回来的耗时 | 0.87 s median over 48 steps for Qwen3-0.6B |
| `perf/train_wait_time` | trainer 等待样本的时间 | logged in every step |

耗时数据只适用于没有受到 heat guard 暂停影响的步骤。判定规则见[实验记录](#s-ref-lab-notes)。

## 评估与 async {#s-ref-metrics-evaluation-and-async}

| 指标 | 含义 |
|---|---|
| `eval/lag_steps` | 独立 fleet 上的 eval 延迟完成的步骤数 |
| the weight version statistics in the rollout metrics | async 运行中样本的权重版本年龄 |

我们没有运行评估或 async training，因此此表没有范围数据。

来源：capture/gpu/summary/miles-gb10-lab.json (runs.plain-48、runs.plain-48-s2、runs.plain-48-s3、runs.e4-0.6b)；capture/gpu/out-gb10/thermostat.log；Miles main 08752a12 中的 loss、指标和评估代码。
