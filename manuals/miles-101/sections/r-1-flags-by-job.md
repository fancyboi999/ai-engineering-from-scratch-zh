# 按用途索引 flag

> 本手册使用的 Miles flag，按用途分组列出。

“本手册的值”一列列出我们实验中设置的参数值。破折号表示实验没有设置该 flag。

## 模型和数据 {#s-ref-flags-by-job-model-and-data}

| Flag | 本手册中的值 | 用途 |
|---|---|---|
| `--hf-checkpoint` | Qwen3-0.6B 目录 | engine 和 FSDP trainer 加载的模型 |
| `--prompt-data` | GSM8K 训练文件 | prompt |
| `--input-key`, `--label-key` | `messages`、`label` | 每行数据的字段 |
| `--apply-chat-template` | 启用 | 使用模型的 chat template 包装每个 prompt |
| `--rollout-shuffle` | 启用 | 打乱 prompt 顺序 |

## Rollout {#s-ref-flags-by-job-rollout}

| Flag | 本手册中的值 | 用途 |
|---|---|---|
| `--num-rollout` | 12、24、48；模型大小测试中为 4 | 训练步数 |
| `--rollout-batch-size` | 32 | 每步的 prompt 数 |
| `--n-samples-per-prompt` | 8 | 每个 prompt 的答案数 |
| `--rollout-max-response-len` | 1,024；模型大小测试中为 256 | 答案的 token 长度上限 |
| `--rollout-temperature` | 1 | 采样 temperature |
| `--rollout-top-p`, `--rollout-top-k` | 一次运行中为 0.95、64 | sampler；设置后会启用 sampling replay |
| `--rollout-num-gpus-per-engine` | 1 | 每个 engine 使用的 GPU 数 |
| `--rollout-seed` | 运行所用的随机种子 | 采样随机种子 |
| `--partial-rollout` | - | 在后续步骤中继续生成长答案 |
| `--over-sampling-batch-size` | - | 已完成组数量不足时新增的 prompt batch |
| `--dynamic-sampling-filter-path` | - | 组过滤函数 |

## Reward 和 loss {#s-ref-flags-by-job-reward-and-loss}

| Flag | 本手册中的值 | 用途 |
|---|---|---|
| `--rm-type` | `math` | 内置 reward |
| `--custom-rm-path` | - | 自定义 reward function |
| `--advantage-estimator` | `grpo` | advantage 计算方法 |
| `--global-batch-size` | 256 | 每次 optimizer step 的样本数 |
| `--eps-clip`, `--eps-clip-high` | 0.2、0.28 | 更新的 clip 范围 |
| `--kl-loss-coef`, `--kl-coef`, `--entropy-coef` | 0 | KL 和 entropy 项 |
| `--lr` | 1e-6 | 固定学习率 |
| `--use-tis`, `--tis-clip` | - | truncated importance sampling |
| `--use-rollout-routing-replay` | - | MoE 模型的 routing replay |

## 布局和内存 {#s-ref-flags-by-job-placement-and-memory}

| Flag | 本手册中的值 | 用途 |
|---|---|---|
| `--colocate` | 启用 | trainer 和 engine 共用 GPU，并启用 offload |
| `--train-backend` | `fsdp` | trainer 类型 |
| `--actor-num-nodes`, `--actor-num-gpus-per-node` | 1、1 | trainer 使用的 GPU 数 |
| `--sglang-mem-fraction-static` | 0.4；三次运行中为 0.25；一次 4B 运行中为 0.2 | engine 使用的 GPU 内存比例 |
| `--offload-rollout-level` | 默认值；一次运行中为 `kv_cache` | 阶段间 engine 释放的内存 |
| `--no-offload-rollout`, `--no-offload-train` | 两次运行和一次运行中分别启用 | 让一端保持加载状态 |
| `--update-weight-buffer-size` | 536870912 | 权重更新 bucket 大小，单位为字节 |
| `--update-weight-transfer-mode` | - | 拆分布局下的权重传输方式 |

## Engine {#s-ref-flags-by-job-engine}

| Flag | 本手册中的值 | 用途 |
|---|---|---|
| `--sglang-attention-backend` | 默认值，或 `triton`、`flashinfer` | engine attention kernel |
| `--sglang-enable-deterministic-inference` | 三次运行中启用 | 确定性 engine kernel |
| `--sglang-enable-metrics` | 启用 | engine 指标 |
| `--use-session-server` | - | agent 的 token 输入、输出 session |
| `--use-miles-router` | - | 使用 Python router 替代默认 router |

## 检查与调试 {#s-ref-flags-by-job-checks-and-debugging}

| Flag | 本手册中的值 | 用途 |
|---|---|---|
| `--seed` | 运行所用的随机种子 | trainer 随机种子 |
| `--save-debug-event-data` | 每次运行一个目录 | 每一步的事件数据 |
| `--save-debug-rollout-data`, `--load-debug-rollout-data` | - | 保存并回放 rollout 样本 |
| `--debug-train-only`, `--debug-rollout-only` | - | 单独运行其中一端 |
| `--check-weight-update-equal` | - | 首次更新后比较 engine 和 trainer 的权重 |
| `--use-fault-tolerance`, `--ft-components` | - | 故障容错 |
| `--save`, `--save-interval`, `--load` | - | checkpoint |

来源：capture/gpu/miles_grpo.py；capture/gpu/out-gb10/engine-settings.txt；Miles main 08752a12 中的参数定义。
