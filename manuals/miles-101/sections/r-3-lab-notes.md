# 实验记录

> 本手册所有实测数据所依据的机器、镜像、随机种子和温控规则。

本页为参考资料，列出本手册各项数值的生成方式，便于你重复运行或评估结果。

## 机器和镜像 {#s-ref-lab-notes-machine-and-image}

| 项目 | 数值 |
|---|---|
| 机器 | NVIDIA DGX Spark，一张 GB10 GPU，128 GB 统一内存 |
| Ray 报告的内存容量 | 121.69 GB |
| 镜像 | `radixark/miles@sha256:c64fa344e3a86715f03c0a1b6a422c474e0035355591a2f6da87bf52a74c52da`，arm64 |
| 镜像中的 Miles | main `08752a1283`，2026-10-15 |
| 镜像中的 SGLang | `0.5.22.dev46+g7b6993a` |
| 模型 | `Qwen/Qwen3-0.6B`，运行名称另有标注时除外 |
| 数据 | GSM8K prompt，使用二元 math reward |

## 默认运行设置 {#s-ref-lab-notes-default-run-settings}

除非运行名称另有说明，每次运行都使用以下设置：

| 设置 | 数值 |
|---|---|
| Prompts per step | 32 (`--rollout-batch-size`) |
| Answers per prompt | 8 (`--n-samples-per-prompt`) |
| Samples per optimizer step | 256 (`--global-batch-size`) |
| Answer limit | 1,024 tokens |
| Temperature | 1 |
| Learning rate | 1e-6, constant |
| Trainer | 单 GPU 上的 FSDP，与 engine colocated 运行 |
| Engine memory fraction | 0.4 |
| Weight update bucket | 536870912 bytes, 512 MiB |

## 运行记录 {#s-ref-lab-notes-runs}

| 运行 | 步数 | 随机种子 | 改动 |
|---|---|---|---|
| plain | 12 | 默认值 | 无改动，运行时间早于 heat guard |
| plain-48 | 48 | 默认值 | 无改动，运行时间早于 heat guard |
| plain-48-s2, plain-48-s3 | 48 | 2, 3 | none |
| e6a-base | 12 | 1 | none |
| e6b、e6c、e6d | 12 | 1 | 分别在 Triton、FlashInfer 和 Triton 上启用 deterministic inference |
| e11-topp-topk | 12 | 1 | top-p 0.95 and top-k 64 |
| e3b、e3c、e3d | 12 | 1 | 仅卸载 KV cache；engine 保持加载且内存比例为 0.25；trainer 保持加载 |
| e4-0.6b、e4-1.7b | 4 | 1 | 答案上限为 256 token，测试模型大小 |
| e2-n4、e2-n16 | 24 | 1 | 每个 prompt 分别生成 4 个和 16 个答案 |
| e3e、e3f | 12 | 1 | 同一天运行的两次训练，内存比例均为 0.25，分别使用默认 offload 和 engine 保持加载 |
| e2b-dapo-filter | 12 | 1 | 使用 DAPO zero-variance filter，每批 48 个 prompt |

四次失败运行没有列入任何表格：两次 true on-policy 运行在启动时停止，两次 Qwen3-4B 运行被 Ray 停止。运行队列为每次任务设置了时限，到期后会停止容器。e2-n16 和 e2b-dapo-filter 已完成所有步骤，当时正在关闭。摘要将它们标记为 partial。

## Heat guard {#s-ref-lab-notes-the-heat-guard}

GB10 持续高负载时会过热，因此脚本会在 GPU 温度达到 84 C 时暂停 Miles 容器。温度降至 74 C 或以下且暂停至少 45 s 后，或者暂停满 120 s 后，脚本会恢复容器。heat guard 首次运行当天的温度限制为 80 C 和 68 C，当天上午调整为 84 C 和 74 C。脚本停止时会先恢复已暂停的容器，避免训练一直停在暂停状态。

截至 2026-10-22，暂停日志记录了 1,005 次暂停，每次都有对应的恢复记录。

## 计时规则 {#s-ref-lab-notes-the-timing-rule}

暂停会增加所在训练阶段的实际耗时。因此，除一项例外外，本手册中的时间都来自没有暂停影响的步骤。第 3.2 节的 DAPO filter 运行没有 clean step，所以其 rollout 时间采用每步耗时减去暂停时间的方式计算：

- **Rollout 耗时：**rollout 时间窗在 rollout 指标日志的时间戳处结束，持续时间由 `perf/rollout_time` 给出。时间窗未与暂停重叠时，该步骤才计入统计。
- **完整步骤耗时：**时间窗在 trainer 指标日志的时间戳处结束，持续时间由 `perf/step_time` 给出。时间窗未与暂停重叠时，该步骤才计入统计。

摘要文件会同时保存所有步骤和 clean step 的中位数，并标出 clean step 数量。启用 heat guard 后，完整步骤很少能避开暂停。因此，本手册中的完整步骤耗时来自 `plain` 和 `plain-48`。这两次运行都在启用 heat guard 前完成，没有暂停影响。`plain-48` 于 2026-10-18 00:11 结束，而 guard 当天 10:57 才首次记录暂停。

## 检查已保存的输出 {#s-ref-lab-notes-check-the-stored-outputs}

无需 GPU，capture kit 就能检查已保存的输出。它会使用 16 答案运行中的错误时间回放 watchdog 规则，根据暂停日志重新标记暂停，并根据存储的步骤重新计算各项中位数。原始运行日志保存在 GB10 上。拿到这些日志后，kit 还可以重新生成摘要并与已保存的摘要比较。

## 对齐相同步骤 {#s-ref-lab-notes-compare-the-same-steps}

只看 clean step 的中位数仍可能产生误导。默认设置在 `plain-48` 中的 rollout 耗时为 47.5 s，在 `e6a-base` 的 6 个 clean step 中为 59.1 s。比较相同的 6 个步骤时，`plain-48` 耗时为 60.9 s。rollout 耗时会随答案长度变化，因此应对齐相同步骤进行比较。

## 单次运行的结果 {#s-ref-lab-notes-results-from-one-run}

以下数据都只来自一次运行。使用这些数据的各节都会说明这一点：

- 第 2.2 节中 engine 保持加载时的 rollout 耗时。同一天的两次运行使用一个随机种子，显示收益为 1% 至 3%。
- 第 4.5 节中的 deterministic inference 成本。
- 第 3.1 节中每个 prompt 使用 4 个和 16 个答案时的结果。
- 第 3.2 节中 DAPO filter 的 reward 和 rollout 成本。由于没有 clean step，rollout 耗时已扣除暂停时间。


## 为什么第一组 offload 比较不能成立 {#s-ref-lab-notes-why-the-first-offload-pair-does-not-hold}

第一组比较使用 `e6a-base` 和 `e3c`。结果显示，默认设置的 clean rollout 中位耗时为 59.1 s，engine 保持加载时为 52.0 s，快了 12%。但两次运行的 engine 内存比例也不同，分别为 0.4 和 0.25，而且 clean step 不是相同步骤。

第 10 步在两次运行中都没有受到暂停影响。engine 保持加载时，答案长度为 599 token，耗时 46.7 s。默认设置下，答案长度为 695 token，耗时 56.3 s。rollout 耗时随答案长度变化，因此更短的答案可以解释大部分差距。之后，同一天运行的 `e3e` 和 `e3f` 只改变了 offload 设置，测得的收益为 1% 至 3%。

来源：capture/gpu/heat-guard.sh；capture/run.py；capture/gpu/watchdog_replay.py；capture/gpu/out-gb10/image-identity.txt；capture/gpu/miles_grpo.py；capture/gpu/summarize_miles.py；capture/gpu/summary/miles-gb10-lab.json；capture/gpu/out-gb10/thermostat.log；capture/gpu/out-gb10/unpaused-timing.txt；capture/gpu/out-gb10/ray-oom-4b.log。
