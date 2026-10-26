---
id: miles-rl
title: 使用 Miles 进行强化学习后训练
code: MI
subtitle: 在单 GPU 上组织 GRPO、设置批次与卸载策略、检查训练日志并守护失败任务。数值来自上游冻结运行记录。
hue: 280
sources: manuals/miles-101
source_hash: d195c56afe38636b
---

## 检查镜像与 GPU
type: annotated-code
lang: bash
from: manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md

```bash
docker run --rm --gpus all radixark/miles:latest nvidia-smi --query-gpu=name,memory.total --format=csv   # 检查容器能否访问 GPU
docker pull radixark/miles:latest   # 拉取镜像
docker image inspect --format "{{index .RepoDigests 0}} {{.Architecture}}" radixark/miles:latest   # 记录摘要与架构
```

## 配置一次训练
type: task-table
from: manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md

| 任务 | 配置 |
|---|---|
| 设置训练步数 | `MILES_NUM_ROLLOUT` |
| 为本次运行命名 | `MILES_RUN` |
| 设置训练与采样种子 | `MILES_SEED` |
| 选择下载的模型 | `MILES_MODEL` |
| 添加 Miles 参数 | `MILES_EXTRA_ARGS` |

## 内存与放置选项
type: command-table
from: manuals/miles-101/sections/2-2-choose-what-to-offload.md, manuals/miles-101/sections/r-1-flags-by-job.md

| 选项 | 作用 |
|---|---|
| `--colocate` | trainer 与 rollout 引擎共用 GPU，并在阶段间卸载。 |
| `--no-offload-rollout` | trainer 工作时仍将引擎权重与 KV 缓存留在 GPU。 |
| `--no-offload-train` | 引擎工作时仍将 trainer 权重和优化器状态留在 GPU。 |
| `--offload-rollout-level kv_cache` | 释放 KV 缓存与 CUDA graph 内存，保留引擎权重。 |

## 一个 GRPO 步骤
type: flow
from: manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md

1. **Rollout**：为每个 prompt 生成一组回答。
2. **评分**：按回答计算奖励。
3. **对数概率**：计算训练所需的 log probabilities。
4. **训练**：根据组内相对奖励执行优化器更新。
5. **权重更新**：将 trainer 的新权重同步给 rollout 引擎。

## 批次单位
type: concepts
from: manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md

- **Rollout 批大小**：按 prompt 计数，`--rollout-batch-size` 不直接表示样本数。
- **组大小**：同一 prompt 的回答数，由 `--n-samples-per-prompt` 指定。
- **全局批大小**：一次优化器更新的样本数，由 `--global-batch-size` 指定。
- **GRPO**：将每个回答的奖励与其所在组的平均奖励比较。

## 教程启动器配置
type: defaults
from: manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md

| 配置 | 数值 | 含义 |
|---|---|---|
| `--rollout-batch-size` | 32 | 每步 prompt 数 |
| `--n-samples-per-prompt` | 8 | 每个 prompt 的回答数 |
| `--global-batch-size` | 256 | 每次优化器更新的样本数 |
| `--rollout-max-response-len` | 1024 | 回答 token 上限 |
| `--sglang-mem-fraction-static` | 0.4 | 引擎权重与 KV 缓存的显存占比 |

## 确认步骤已完成
type: glossary
from: manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md, manuals/miles-101/sections/2-2-choose-what-to-offload.md

- **`KV Cache is allocated`**：引擎已分配 KV 缓存；未见该行时先检查启动错误。
- **`step 0` 与 `perf 0`**：首步训练结束时写出的日志标志。
- **`perf/sleep_time`**：trainer 训练后将状态移至主机内存的时间，记录在下一步。
- **`perf/wake_up_time`**：计算对数概率前，将 trainer 状态移回 GPU 的时间。

## 故障排查
type: troubleshooting
from: manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md, manuals/miles-101/sections/1-2-add-a-watchdog.md

| 现象 | 原因 | 修正 |
|---|---|---|
| Docker 无法选择 GPU 驱动 | 缺少 NVIDIA container toolkit | 安装容器工具包并重启 Docker。 |
| 五分钟仍无 KV 分配日志 | rollout 引擎未成功启动 | 查看该行之前的 `Error` 与 `AssertionError`。 |
| GPU 空闲，日志持续出现 503 | rollout 引擎已退出，但 trainer 仍在重试 | 查看首个错误前的引擎日志，并用 watchdog 停止失效运行。 |
| 短暂 503 后仍完成训练 | 忙碌引擎可能出现短时错误簇 | 按连续时间窗口判断，勿只根据错误总数终止。 |

## 守护规则
type: qa
from: manuals/miles-101/sections/1-2-add-a-watchdog.md

- **watchdog 为什么默认连续检查十次？** 上游健康运行的回放最多连续命中六次，使用六次会误停；十次没有误停该样本。
- **Docker 查询失败算一次异常命中吗？** 日志读取失败不计数。无法列出容器时，watchdog 以 2 退出，表示守护失效。
- **热暂停后的步骤可以直接比较耗时吗？** 不可以。应读取暂停日志，并比较相同步号中未被暂停的步骤。

## 比较运行的提示
type: tips
from: manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md, manuals/miles-101/sections/2-2-choose-what-to-offload.md, manuals/miles-101/sections/1-2-add-a-watchdog.md

- 每次运行记录镜像摘要、Miles 提交和种子；`latest` 标签会改变。
- 对比卸载参数时，保持显存比例一致，并比较相同的干净步骤。
- 训练独立使用容器名、运行名和日志文件，避免两次运行混用记录。
- 长时间运行前，在另一终端启动 watchdog；高温 GPU 还需保留热暂停记录。
