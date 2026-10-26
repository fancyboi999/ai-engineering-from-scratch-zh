# 故障后恢复长时间运行

> 多机长时间运行可能丢失 engine 或节点，Miles 提供了故障容错和 checkpoint 来应对此类情况。

单 GPU 训练可能因简单故障而失败，重启即可。但使用数百张 GPU 持续数天的训练可能会丢失 engine 或节点。关键在于发生故障时会损失多少进度。

读完本节后，你可以为长时间运行配置 checkpoint 和故障容错，并在依赖它们前进行测试。

我们无法在单 GPU GB10 上测试故障容错。正如[第 1.2 节](#s-add-a-watchdog)所示，单 GPU 上 engine 退出就意味着训练失效。本节内容来自 Miles 源码和发行说明。

## 先保存 checkpoint {#s-survive-failures-save-checkpoints-first}

发生故障后，checkpoint 可以减少重启时损失的工作量。如果存储故障、checkpoint 损坏，或故障发生在最近一次保存之后，checkpoint 都无法提供保护。应优先配置 checkpoint。

容器使用 `--rm` 启动，因此容器内的目录会随着容器一起删除。将主机目录挂载为 checkpoint 存储位置，并按[第 1.1 节](#s-run-grpo-on-one-gpu)的说明添加两项设置：

```bash
-v "$HOME/miles-lab/ckpt:/ckpt" -e MILES_EXTRA_ARGS="--save /ckpt/run-a --save-interval 20 --load /ckpt/run-a"
```

`--save-interval` 按训练步骤计数。根据单步耗时设置该值，使故障造成的进度损失不超过可接受范围。每步耗时五分钟时，间隔 12 步保存最多会损失一小时的工作。

## 从 checkpoint 恢复 {#s-survive-failures-resume-from-a-checkpoint}

发生故障后，用相同命令重新启动，并指定新的日志文件，例如 `> runs/plain-resume.log`。[第 1.1 节](#s-run-grpo-on-one-gpu)中的重定向会清空旧日志，而旧日志可以帮助你查明故障原因。`--load` 应指向父目录，不要指向其中的某个 `iter_` 子目录。Miles 会读取 tracker 文件，找到最近一次保存的步骤。首次运行时目录为空，Miles 会从头开始。

使用本手册中的 FSDP trainer 时，恢复操作会还原以下运行状态：

- 模型权重和 optimizer 状态
- 学习率计划和随机状态
- 训练步骤计数，恢复后从下一步继续
- prompt 数据的位置；rollout 端会将其与 trainer 状态一起保存

恢复运行的日志应显示 `[FSDP] Loaded model from` 和 `[FSDP] Loaded optimizer from`，并带有对应步骤的目录。如果没有这些日志，说明训练是从头启动的。我们的首次运行使用空目录，日志没有提示 checkpoint 缺失。在恢复检查中，加载后的第一条 trainer 日志为 `step 2`。

长时间运行前，先在短跑中测试重启流程。Miles 总会在最后一步后保存，因此先用 `MILES_NUM_ROLLOUT=2` 运行上述命令，再将其改为 `MILES_NUM_ROLLOUT=4` 运行一次。第二次运行的第一条 step 日志应为 `step 2`，而不是 `step 0`。我们在 GB10 上使用 Qwen3-0.6B 通过了此项测试。我们还对 step 2 checkpoint 运行了下面的转换器，成功生成了包含权重和 tokenizer 文件的模型目录。

## 将 checkpoint 转换为部署格式 {#s-survive-failures-convert-a-checkpoint-for-serving}

FSDP trainer 写入 PyTorch distributed checkpoint，其他工具无法直接加载。Miles 提供了转换器，可将其转换为 Hugging Face 模型目录。在容器内运行：

```bash
python3 /root/miles/tools/convert_fsdp_to_hf.py --input-dir /ckpt/run-a/iter_0000020 --output-dir /root/lab/models/run-a-step-20 --origin-hf-dir /root/lab/models/Qwen3-0.6B
```

`--origin-hf-dir` 为转换器提供基础模型的配置和 tokenizer。Megatron trainer 会写入自己的格式，[第 6.1 节](#s-split-rollout-and-training-choose-the-trainer)介绍了对应转换器。

## 启用故障容错 {#s-survive-failures-turn-on-fault-tolerance}

```bash
--use-fault-tolerance --ft-components rollout
```

`--ft-components` 用于选择 Miles 监控和替换的部分：`rollout`、`train` 或两者。不设置时，Miles 会监控 `rollout`。我们运行的 Miles 版本存在以下限制：

- Rollout fault tolerance 不支持独立 eval fleet，也不支持 `--fully-async --colocate`。
- Train fault tolerance 会启用独立的数据并行组，因此需要 Megatron trainer。

2026-10-20 的 Miles main 修改了这些行为，增加 `weight_update` 作为第三个部分，并且只允许拆分布局配合 `p2p` 权重传输启用 rollout fault tolerance。复制命令前，应查看所用镜像中的 flag 帮助信息。

## Miles 团队的报告 {#s-survive-failures-what-the-miles-team-reports}

Miles 团队为测试编写了故障注入器。发行说明报告了一次 rollout engine 崩溃后的训练，其 loss 曲线与未发生崩溃的运行逐位一致。这是他们在自己硬件上的测试。信任该功能前，应在自己的配置上重复崩溃测试。

## 已知问题 {#s-survive-failures-known-problems}

- Miles issue tracker 的一份报告指出，六个 agent 示例启动脚本都会先执行清理操作，停止命令行中包含 `sglang` 的所有进程。设置 `MILES_SCRIPT_EXTERNAL_RAY=1` 后，该操作还会停止你启动的 Ray cluster。使用这些启动脚本时，应删除清理命令，或为 Miles 单独启动 Ray cluster。
- 未启用故障容错时，engine 退出后 trainer 仍会持续发送请求，且不会失败退出。每次运行都应启动 watchdog。

```takeaways
- 为 checkpoint 挂载主机目录，并在短跑中测试重启恢复。
- 长时间运行前，查看所用镜像中的 flag 帮助，确认故障容错限制。
- 长时间运行前，在自己的配置上测试 engine 崩溃恢复。
```

来源：Miles main 08752a12 中的文件 miles/backends/fsdp_utils/checkpoint.py、miles/ray/rollout/rollout_executor.py、miles/rollout/data_source.py、tools/convert_fsdp_to_hf.py、docs/user-guide/training-backend.md、miles/utils/arguments.py、docs/advanced/fault-tolerance.md、miles/ray/placement_group.py、miles/backends/training_utils/checkpoint/io.py、miles/utils/test_utils/fault_injector.py；并与 2026-10-20 的 Miles main ee36bb2a 中 miles/utils/arguments.py 比较；Miles v0.1.2 发行说明；Miles issue 3649；capture/gpu/out-gb10/engine-died-503.log；capture/gpu/out-gb10/resume-check.txt (2023-10-23 实测记录)。
