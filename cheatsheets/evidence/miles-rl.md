# Evidence: cheatsheets/miles-rl.md
upstream_revision: 3f9715c62a3bedcffb68a260f1a65ee2dd9cc10a

本表由中文维护者根据冻结的英文手册整理。路径与行号属于该上游版本，不是中文行号；本次未重新运行这些 GPU 测量。

## 检查镜像与 GPU
- docker run --rm --gpus all radixark/miles:latest nvidia-smi --query-gpu=name,memory.total --format=csv   # 检查容器能否访问 GPU：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:24
- docker pull radixark/miles:latest   # 拉取镜像：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:46
- docker image inspect --format "{{index .RepoDigests 0}} {{.Architecture}}" radixark/miles:latest   # 记录摘要与架构：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:47

## 配置一次训练
- 设置训练步数 / `MILES_NUM_ROLLOUT`：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:103
- 为本次运行命名 / `MILES_RUN`：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:104
- 设置训练与采样种子 / `MILES_SEED`：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:105
- 选择下载的模型 / `MILES_MODEL`：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:106
- 添加 Miles 参数 / `MILES_EXTRA_ARGS`：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:107

## 内存与放置选项
- `--colocate` / trainer 与 rollout 引擎共用 GPU，并在阶段间卸载。：manuals/miles-101/sections/2-2-choose-what-to-offload.md:11
- `--no-offload-rollout` / trainer 工作时仍将引擎权重与 KV 缓存留在 GPU。：manuals/miles-101/sections/2-2-choose-what-to-offload.md:13
- `--no-offload-train` / 引擎工作时仍将 trainer 权重和优化器状态留在 GPU。：manuals/miles-101/sections/2-2-choose-what-to-offload.md:14
- `--offload-rollout-level kv_cache` / 释放 KV 缓存与 CUDA graph 内存，保留引擎权重。：manuals/miles-101/sections/2-2-choose-what-to-offload.md:16

## 一个 GRPO 步骤
- Rollout 为每个 prompt 生成一组回答。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:15
- 评分 按回答计算奖励。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:15
- 对数概率 计算训练所需的 log probabilities。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:15
- 训练 根据组内相对奖励执行优化器更新。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:15
- 权重更新 将 trainer 的新权重同步给 rollout 引擎。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:15

## 批次单位
- Rollout 批大小 按 prompt 计数，`--rollout-batch-size` 不直接表示样本数。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:95
- 组大小 同一 prompt 的回答数，由 `--n-samples-per-prompt` 指定。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:87
- 全局批大小 一次优化器更新的样本数，由 `--global-batch-size` 指定。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:88
- GRPO 将每个回答的奖励与其所在组的平均奖励比较。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:93

## 教程启动器配置
- `--rollout-batch-size` / 32 / 每步 prompt 数：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:86
- `--n-samples-per-prompt` / 8 / 每个 prompt 的回答数：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:87
- `--global-batch-size` / 256 / 每次优化器更新的样本数：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:88
- `--rollout-max-response-len` / 1024 / 回答 token 上限：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:89
- `--sglang-mem-fraction-static` / 0.4 / 引擎权重与 KV 缓存的显存占比：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:91

## 确认步骤已完成
- `KV Cache is allocated` 引擎已分配 KV 缓存；未见该行时先检查启动错误。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:156
- `step 0` 与 `perf 0` 首步训练结束时写出的日志标志。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:160
- `perf/sleep_time` trainer 训练后将状态移至主机内存的时间，记录在下一步。：manuals/miles-101/sections/2-2-choose-what-to-offload.md:24
- `perf/wake_up_time` 计算对数概率前，将 trainer 状态移回 GPU 的时间。：manuals/miles-101/sections/2-2-choose-what-to-offload.md:24

## 故障排查
- Docker 无法选择 GPU 驱动 / 缺少 NVIDIA container toolkit / 安装容器工具包并重启 Docker。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:27
- 五分钟仍无 KV 分配日志 / rollout 引擎未成功启动 / 查看该行之前的 `Error` 与 `AssertionError`。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:156
- GPU 空闲，日志持续出现 503 / rollout 引擎已退出，但 trainer 仍在重试 / 查看首个错误前的引擎日志，并用 watchdog 停止失效运行。：manuals/miles-101/sections/1-2-add-a-watchdog.md:5
- 短暂 503 后仍完成训练 / 忙碌引擎可能出现短时错误簇 / 按连续时间窗口判断，勿只根据错误总数终止。：manuals/miles-101/sections/1-2-add-a-watchdog.md:54

## 守护规则
- watchdog 为什么默认连续检查十次？ 上游健康运行的回放最多连续命中六次，使用六次会误停；十次没有误停该样本。：manuals/miles-101/sections/1-2-add-a-watchdog.md:74
- Docker 查询失败算一次异常命中吗？ 日志读取失败不计数。无法列出容器时，watchdog 以 2 退出，表示守护失效。：manuals/miles-101/sections/1-2-add-a-watchdog.md:80
- 热暂停后的步骤可以直接比较耗时吗？ 不可以。应读取暂停日志，并比较相同步号中未被暂停的步骤。：manuals/miles-101/sections/1-2-add-a-watchdog.md:174

## 比较运行的提示
-  每次运行记录镜像摘要、Miles 提交和种子；`latest` 标签会改变。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:43
-  对比卸载参数时，保持显存比例一致，并比较相同的干净步骤。：manuals/miles-101/sections/2-2-choose-what-to-offload.md:59
-  训练独立使用容器名、运行名和日志文件，避免两次运行混用记录。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:137
-  长时间运行前，在另一终端启动 watchdog；高温 GPU 还需保留热暂停记录。：manuals/miles-101/sections/1-1-run-grpo-on-one-gpu.md:129
