# 用 radixark/miles 镜像在一张 GPU 上运行 GRPO

> 用一个容器、一个小模型和一份启动脚本，就能在一张 GPU 上完成 GRPO 训练步骤并记录日志，整个过程约需十分钟。

从空目录开始，最后得到一个已完成且写入日志文件的 GRPO 训练步骤。模型使用 Qwen3-0.6B，数据集使用 GSM8K，因此训练能在一张 GPU 上运行，每步需要几分钟。

读完本节后，你可以在一张 GPU 上启动 GRPO 训练，并从日志中找到首个训练步骤完成的证据。

**我们的结果：**在一张 GB10 上运行 Qwen3-0.6B 共 12 步，第一步耗时 233 s，中位数为 167 s。

```figure
id: fig-1-1
kind: flow
title: 一张 GPU 上的一个 GRPO 训练步骤
claim: 每一步依次在一张 GPU 上执行 rollout、评分、计算 log probability、训练和权重更新。
caption: 我们在启用 heat guard 前运行了 48 步，图中给出各阶段的中位耗时，因此没有暂停影响。配置为一张 GB10 运行 Qwen3-0.6B。数字顺序与箭头一致。
```

## 检查运行条件 {#s-run-grpo-on-one-gpu-check-what-you-need}

你需要一张 NVIDIA GPU、Docker 和 NVIDIA Container Toolkit。先运行以下检查：

```bash
docker run --rm --gpus all radixark/miles:latest nvidia-smi --query-gpu=name,memory.total --format=csv
```

输出应包含你的 GPU 名称。如果 Docker 提示无法选择设备驱动，请安装 NVIDIA Container Toolkit 并重启 Docker。

```listing
title: 我们机器上的 GPU 检查结果
source: capture/gpu/out-gb10/gpu-check.txt
lang: text
note: GB10 的 CPU 和 GPU 共用一个内存池，因此这里不会显示独立的 GPU 显存。
---
name, memory.total [MiB]
NVIDIA GB10, [N/A]
```

我们使用的是搭载 GB10、拥有 128 GB 共享内存的 DGX Spark。我们没有测试更小的显卡。[第 2.1 节](#s-pick-a-model-size)讨论模型大小和内存。

## 拉取镜像并记录版本 {#s-run-grpo-on-one-gpu-pull-the-image-and-record-what-you-pulled}

`latest` 标签会随时间变化。训练开始前，记录镜像 digest 和 Miles commit，之后才能比较不同运行结果。

```bash
docker pull radixark/miles:latest
docker image inspect --format "{{index .RepoDigests 0}} {{.Architecture}}" radixark/miles:latest
docker run --rm --entrypoint git radixark/miles:latest -C /root/miles log -1 --format="%h %cs %s"
docker run --rm --entrypoint /opt/sglang/bin/python3 radixark/miles:latest -c "import sglang;print(sglang.__version__)"
```

```listing
title: 我们运行的镜像
source: capture/gpu/out-gb10/image-identity.txt
lang: text
note: 记录镜像 digest、CPU 架构、Miles commit，以及镜像内的 SGLang 版本。
---
radixark/miles@sha256:c64fa344e3a86715f03c0a1b6a422c474e0035355591a2f6da87bf52a74c52da arm64
08752a1283 2026-10-15 fix(ci): keep host networks out of the builder disk cleanup (#4130)
0.5.22.dev46+g7b6993a
```

该镜像支持 `arm64` 和 `amd64`。它自带 SGLang，也就是 rollout engine。请使用镜像中的版本，不要再安装另一份 SGLang。

## 创建实验目录 {#s-run-grpo-on-one-gpu-make-a-lab-folder}

容器会从挂载到 `/root/lab` 的目录读取启动脚本、模型和数据。创建该目录，并把本手册的启动脚本下载到其中：

```bash
mkdir -p ~/miles-lab/runs ~/.cache/huggingface
curl -fsSL -o ~/miles-lab/miles_grpo.py https://raw.githubusercontent.com/fancyboi999/ai-engineering-from-scratch-zh/main/manuals/miles-101/capture/gpu/miles_grpo.py
```

如果你已经克隆本仓库，也可以在仓库根目录运行 `cp manuals/miles-101/capture/gpu/miles_grpo.py ~/miles-lab/`。另一个目录是训练挂载的模型缓存。如果它不存在，Docker 会以 root 身份创建它，之后主机上的下载可能失败。

启动脚本首次运行时，会把 `Qwen/Qwen3-0.6B` 和 `zhuzilin/gsm8k` 数据集下载到该目录。随后它会组装 Miles 命令并启动训练。

## 查看启动脚本使用的设置 {#s-run-grpo-on-one-gpu-read-the-settings-the-launcher-uses}

启动脚本会向 Miles 传入 36 个 flag，大多数沿用默认值。以下设置会决定训练方式：

| Flag | Value | 作用 |
|---|---|---|
| `--colocate` | on | trainer 和 rollout engine 共用一张 GPU，轮流执行 |
| `--train-backend` | `fsdp` | trainer 使用 PyTorch FSDP。Miles 默认 trainer 是 Megatron，使用前需要先转换 checkpoint |
| `--rollout-batch-size` | 32 | 每步处理的 prompt 数 |
| `--n-samples-per-prompt` | 8 | 每个 prompt 生成的答案数，这些答案组成一组 |
| `--global-batch-size` | 256 | 每次 optimizer step 使用的样本数，即 32 乘以 8 |
| `--rollout-max-response-len` | 1024 | 答案的最大长度，单位为 token |
| `--rm-type` | `math` | 最终答案正确时 reward 为 1，否则为 0 |
| `--sglang-mem-fraction-static` | 0.4 | rollout engine 为权重和 KV cache 预留的 GPU 内存比例 |

**Group：**一个 prompt 在单步中得到的所有答案。GRPO 会用组内平均 reward 作为基线，对每个答案评分。

rollout batch size 统计 prompt 数，global batch size 统计样本数。32 个 prompt 各生成 8 个答案，一次 rollout 就得到 256 个样本，因此每一步会执行一次 optimizer 更新。

## 为训练添加 flag {#s-run-grpo-on-one-gpu-add-flags-to-a-run}

启动脚本通过环境变量读取设置。在 `docker run` 命令中用 `-e` 设置变量：

| Variable | Default | 作用 |
|---|---|---|
| `MILES_NUM_ROLLOUT` | 12 | 训练步数 |
| `MILES_RUN` | `plain` | 训练名称，也用作 `runs/` 下存放步骤事件的目录名 |
| `MILES_SEED` | 未设置 | trainer 和 rollout 使用的随机种子 |
| `MILES_MODEL` | `Qwen3-0.6B` | 启动脚本下载的 Qwen 模型 |
| `MILES_EXTRA_ARGS` | 空 | 额外的 Miles flag，追加在启动脚本的 36 个 flag 后面 |

本手册中的配置示例都通过 `MILES_EXTRA_ARGS` 添加 flag。例如，下面这行设置了[第 4.4 节](#s-lower-the-logprob-gap)介绍的 top-p 和 top-k：

```bash
-e MILES_EXTRA_ARGS="--rollout-top-p 0.95 --rollout-top-k 64"
```

如果某个 flag 同时出现在启动脚本和 `MILES_EXTRA_ARGS` 中，Miles 会保留最后一个值，因此 `MILES_EXTRA_ARGS` 中的值生效。我们把 engine 内存比例设为 0.25 时就用了这种方式。只有一种例外：当 `MILES_TRUE_ON_POLICY=1` 时，启动脚本会把 true on-policy flag 放在 `MILES_EXTRA_ARGS` 后面，因此启动脚本中的值生效。该模式的 attention backend 应通过 `MILES_SGLANG_ATTENTION` 和 `MILES_FSDP_ATTENTION` 设置。

## 启动训练 {#s-run-grpo-on-one-gpu-start-the-run}

启动容器，并挂载 GPU、实验目录和模型缓存：

```bash
cd ~/miles-lab
docker run --rm --name miles-plain --gpus all --ipc=host --shm-size 32g --ulimit memlock=-1 \
  -v "$HOME/miles-lab:/root/lab" -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  -e MILES_NUM_ROLLOUT=12 -e MILES_RUN=plain \
  radixark/miles:latest python /root/lab/miles_grpo.py > runs/plain.log 2>&1
```

在 GB10 上，我们的 12 步训练从第一条到最后一条日志共耗时 35 分钟。让训练独自运行前，先在另一个终端启动[第 1.2 节](#s-add-a-watchdog)介绍的 watchdog。

如果要提前结束训练，请在另一个终端停止容器：

```bash
docker stop miles-plain
```

为每次训练指定独立的容器名称、`MILES_RUN` 和日志文件，避免多次运行共用同一份日志。

## 查看启动日志 {#s-run-grpo-on-one-gpu-read-the-startup-lines}

在另一个终端运行 `tail -f runs/plain.log` 查看日志。训练会依次启动 Ray、rollout engine 和 trainer。以下日志能确认各部分已经启动：

```listing
title: colocated 训练的启动日志
source: capture/gpu/out-gb10/plain-first-step.log
lang: text
note: 来自我们一次 12 步训练的三条日志。每条长日志的中间部分均已省略。
---
[2026-10-17 15:53:16.726 launcher] common.py:290 - EXEC: export PYTHONUNBUFFERED=1 && ray start --head --node-ip-address 127.0.0.1 --num-gpus 1 …
(CommandActor pid=2546) [2026-10-17 15:54:38] Load weight end. elapsed=5.85 s, type=Qwen3ForCausalLM, avail mem=94.82 GB, mem usage=1.40 GB.
(CommandActor pid=2546) [2026-10-17 15:54:40] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 345645, K size: 18.46 GB, V size: 18.46 GB
```

engine 加载了 1.40 GB 权重，并为 KV cache 留出了 345,645 个 token 的空间。单步最多需要处理 256 个答案，每个答案最长 1,024 token，此外还要容纳对应的 prompt。

如果五分钟内没有出现 `KV Cache is allocated`，rollout engine 就没有启动。向上查找日志中的 `Error` 或 `AssertionError`，并参阅[第 7.1 节](#s-troubleshoot-by-symptom)。

## 找到首个完成的训练步骤 {#s-run-grpo-on-one-gpu-find-the-first-finished-step}

trainer 输出 `step 0` 和 `perf 0` 两行日志后，第一个训练步骤才算完成。用以下命令查找：

```bash
grep -c " - step [0-9]*: {" runs/plain.log
```

计数结果就是已完成的训练步数。我们第一次完成训练步骤时记录了以下日志：

```listing
title: 第一步的 rollout 和计时信息
source: capture/gpu/out-gb10/plain-first-step.log
lang: text
note: 每行仅保留本节使用的字段。
---
(FSDPTrainRayActor pid=2551) [2026-10-17 15:56:48.271 actor_cell00000_rank00000] log_utils.py:125 - rollout 0: {'rollout/response_lengths': 739.92578125, … 'rollout/raw_reward': 0.62890625, …
(FSDPTrainRayActor pid=2551) [2026-10-17 15:58:15.687 actor_cell00000_rank00000] log_utils.py:554 - step 0: { … 'train/train_rollout_logprob_abs_diff': 0.015336457639932632, …
(FSDPTrainRayActor pid=2551) [2026-10-17 15:58:15.688 actor_cell00000_rank00000] perf.py:56 - perf 0: {'perf/sleep_time': 2.1116080284118652, … 'perf/update_weights_time': 0.6647534370422363, … 'perf/step_time': 233.29494333267212, …
```

这次 12 步训练的第一步耗时 233 s，中位数为 167 s。典型步骤中，rollout 耗时 57 s，训练阶段耗时 105 s，其中计算 log probability 用了 25 s。trainer 向 engine 更新权重耗时 0.65 s。

本页的两张图使用相同配置运行 48 步的记录。其中位训练步骤耗时 152.6 s，中位 rollout 耗时 47.5 s。后续步骤生成的答案更短，因此中位耗时更低。

[第 1.3 节](#s-read-your-first-ten-steps)介绍如何解读前十步的这些数据。
```figure
id: fig-1-1b
kind: chart
title: 一个训练步骤的耗时分布
claim: 训练和 rollout 占据一个步骤的大部分时间，交接耗时约 2 s。
caption: 我们在启用 heat guard 前运行了 48 步，图中给出各阶段的中位秒数。log probability 计算和梯度步骤共同构成训练阶段。
```


```takeaways
- 每次训练前记录镜像 digest 和 Miles commit。
- rollout batch 按 prompt 数设置，global batch 按样本数设置。
- 确认出现 KV cache 日志后，再判断 engine 已成功启动。
- 根据日志中的 step 行统计已完成的训练步数。
```

来源：capture/gpu/miles_grpo.py；capture/gpu/out-gb10/gpu-check.txt；capture/gpu/out-gb10/image-identity.txt；capture/gpu/out-gb10/plain-first-step.log；capture/gpu/summary/miles-gb10-lab.json (runs.plain)；Miles main 08752a12 中的参数定义。
