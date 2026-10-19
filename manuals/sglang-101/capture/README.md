# SGLang 101 捕获工具

本工具通过 MLX 后端在 Apple silicon 上启动真实的 SGLang 0.5.22 服务，发送请求、运行官方基准，并将观察结果写入 `out/`。手册中的 listing 和实测数字来自这些文件。仓库保留的是上游录制证据，中文维护不将其表述为本次重新实测。

## 要求

- 运行 macOS 14 或更新版本的 Apple silicon Mac。
- 从标签安装 SGLang 0.5.22，带 `srt_mps` extra（见手册前言）。
- `PATH` 中有 `sglang` 命令；首次运行需要网络，将 `mlx-community/Qwen3-0.6B-4bit` 下载到 Hugging Face 缓存。

## 运行

```bash
python3 capture/run.py           # 将全部记录写入 capture/out/
python3 capture/run.py --check   # 记录到临时目录并比较
python3 capture/run.py --only small-pool   # 只记录一种服务器配置
```

使用 SGLang 环境中的 Python。完整运行会启动四个服务器，在上游录制的 Mac 上耗时 20–25 分钟。`--check` 用时相同。缺少 Apple silicon 上的 SGLang 0.5.22 和 MLX 时，`--check` 输出 `skipped` 及原因，以 0 退出。

## 记录内容

| 服务器 | 通用参数之外添加的参数 | 文件 |
|---|---|---|
| default | 无 | `generate.txt`, `cache-experiment.txt`, `bench-random-c1.txt`, `bench-random-c8.txt`, `bench-random-c32.txt`, `bench-shared-prefix.txt`, `metrics.txt` |
| no-radix-cache | `--disable-radix-cache` | `no-radix-cache-bench-shared-prefix.txt`, `no-radix-cache-metrics.txt` |
| no-overlap | `--disable-overlap-schedule` | `no-overlap-bench-random-c8.txt`（服务崩溃，见日志） |
| small-pool | `--max-total-tokens 4096` | `small-pool-bench-long-output-c16.txt`, `small-pool-metrics.txt` |

通用参数为 `--model-path mlx-community/Qwen3-0.6B-4bit --disable-cuda-graph --enable-cache-report --enable-metrics --mem-fraction-static 0.4`，并设置 `SGLANG_USE_MLX=1`。每个服务器写入 `server-<name>.log`，`server-<name>.command.txt` 保存完整命令。`serve-help.txt` 是 `sglang serve --help` 的输出，`environment.json` 记录版本。每个 `.txt` 旁的基准 JSONL 文件保存基准程序写出的单次运行记录。

`one_request.py` 发送一个原生 `/generate` 请求和一个 OpenAI 聊天请求。`cache_experiment.py` 将同一个 3,000-token system prompt 以三种形式各发送五次：保持原样、开头添加随机请求 ID、末尾添加相同 ID。

## `--check` 比较什么

每次计时都会变化，检查只比较应保持稳定的事实：

- 温度为 0 时生成的文本和 token 数；
- 各缓存实验的缓存 token 中位数，以及两个 ID 实验是否分别低于 50、高于 2,900；
- 各基准的成功请求数、输入与输出 token 总数；
- 每个服务日志中的 `bytes_per_slot`、tree cache 行和所有 `RuntimeError` 行；
- 指标名集合与 `sglang serve` 选项集合；
- 服务启动命令。

基准输出中的主目录绝对路径替换为 `~`。

`oom-exploratory.log` 并非由本工具录制。它来自工具编写前使用默认内存比例的一次探索运行，第 3.2 节已注明。

## GPU 工具

`gpu/` 为单张 NVIDIA GPU 提供第二套工具。需要 Linux、NVIDIA 驱动、PyPI 的 `sglang==0.5.22`，以及 `PATH` 中的 `sglang` 命令。上游在自己的机器录制，没有在 CI 运行。首个服务器启动前，`run.py` 和 `sweep.py` 下载模型，以及 `sglang.benchmark.serving` 的 `random` 数据集所需的 ShareGPT 文件，并通过 `--dataset-path` 传入。随后为每个服务器和基准设置 `HF_HUB_OFFLINE=1`，捕获过程中不访问 Hub。运行一次后，或模型已存在 Hugging Face 缓存时，自行设置 `HF_HUB_OFFLINE=1` 即可离线运行。将 `SGLANG_KIT_DATASET` 指向本地 `ShareGPT_V3_unfiltered_cleaned_split.json` 可跳过下载。用 `SGLANG_KIT_PROFILE` 选择硬件配置：

| 配置 | 模型 | 内存比例 | 输出 |
|---|---|---|---|
| `gb10` | `Qwen/Qwen3-30B-A3B-Instruct-2507`、其 FP8 checkpoint，以及 EAGLE-3 草稿模型 `lmsys/SGLang-EAGLE3-Qwen3-30B-A3B-Instruct-2507-SpecForge-Nex` | 0.7 | `gpu/out-gb10/`, `gpu/summary/gb10.json` |
| `l4` | `Qwen/Qwen3-8B`、`Qwen/Qwen3-8B-FP8`，以及 EAGLE-3 草稿模型 `Tengyunw/qwen3_8b_eagle3` | 0.85 | `gpu/out-l4/`, `gpu/summary/l4.json` |

```bash
SGLANG_KIT_PROFILE=gb10 python3 capture/gpu/run.py
SGLANG_KIT_PROFILE=gb10 python3 capture/gpu/run.py --check
python3 capture/gpu/sweep.py --profile gb10 --sweep load --configs default fp8 eagle3 no-cuda-graph
python3 capture/gpu/summarize.py gb10
```

| 文件 | 作用 |
|---|---|
| `gpu/run.py` | 启动八种服务器：默认配置、关闭 CUDA graph、关闭基数缓存、关闭重叠调度、4,096-token 池、FP8 权重与 FP8 KV 缓存、EAGLE-3、确定性推理。`--only eagle3-no-env` 检查 EAGLE-3 上下文长度拒绝；`--only idle-probe` 运行 `ttft_idle_probe.py` |
| `gpu/offline.py` | 一次下载模型与 ShareGPT 文件，随后设置 `HF_HUB_OFFLINE=1`，为每个 `random` 基准添加 `--dataset-path` |
| `gpu/sweep.py` | 使用种子 1、2、3 和 `--output-details` 运行 `load`、`rate`、`prefix`、`waves`、`working-set`、`mixed` 扫描，写入 `gpu/runs/<profile>/<sweep>/<config>/`。`dp2`、`dp2-tokens`、`tp2`、`pd`、`pd-swap` 配置要求 `CUDA_VISIBLE_DEVICES` 中有两张 GPU；`vllm` 在同一显卡上以与 SGLang 相同的 KV 池启动 vLLM |
| `gpu/miles_grpo.py` | 在 `radixark/miles` 镜像中运行短 GRPO 任务，使用普通模式或 `MILES_TRUE_ON_POLICY=1`，运行 `MILES_NUM_ROLLOUT` 步（默认 12），可用 `MILES_SEED` 设置训练和 rollout 种子 |
| `gpu/miles_summary.py` | 将 Miles 日志归约为 `gpu/summary/miles-gb10.json`：每步奖励、响应长度、rollout 时间、rollout 与训练对数概率差，以及阶段计时 |
| `gpu/summarize.py` | 将运行记录归约为 `gpu/summary/<profile>.json`：每个点的中位数、最小值、最大值、goodput，以及 TTFT 和 TPOT 分位数 |
| `gpu/determinism_probe.py` | 将同一个温度为 0 的 prompt 单独发送五次，再放入 16 个请求的批次发送五次，统计不同答案的数量 |
| `gpu/structured_probe.py` | 先不带 schema 发送问题，再使用新 JSON schema、重复使用该 schema 两次，最后使用第二个新 schema |
| `gpu/incidents/` | 手册事故的证据：L4 工具链失败、热降频、GB10 内存保护，以及驱动内存消息 |

每次扫描前，`gpu/sweep.py` 最多等待 900 秒，让 GPU 冷却到 65 C。运行中每秒采样一次 `nvidia-smi`，写入运行记录旁的 `.gpu.csv`。`gpu/summarize.py` 为每个点添加 SM 时钟中位数、最高温度，以及热降速标志置位的样本比例。Goodput 只统计首 token 延迟低于 1 秒且平均每 token 时间低于 100 ms 的请求。

`vllm` 配置要求独立的 vLLM 环境，由 `VLLM_BIN` 指定。它用 `--num-gpu-blocks-override` 固定为 SGLang 在同一显卡上获得的池容量：干净 L4 上为 1,506 个 16-token 块。它还将 `--max-model-len` 限为 8,192，因为池无法容纳一个完整上下文请求时，vLLM 会拒绝启动。它同时设置 `VLLM_USE_FLASHINFER_SAMPLER=0`。在上游 L4 上，`pip install vllm` 带来的 FlashInfer 0.7.0.post1 sampler 无法使用同次安装的 CUDA 13.4 编译器编译，基准则使用贪心采样。

`gb10` 配置的 EAGLE-3 服务需要 `SGLANG_ALLOW_OVERWRITE_LONGER_CONTEXT_LEN=1`，因为草稿声明的上下文为 2,048 token，目标模型为 262,144。工具设置该变量，并写入 `server-eagle3.command.txt`。

GPU 工具的 `--check` 比较每个基准的 token 与请求数、生成 token 数、结构化答案是否合法、温度为 0 单独运行时不同答案的数量、指标名、服务命令，以及每个服务日志的 `max_running_requests` 行。缺少 Linux、CUDA 或对应配置所需的 GPU 内存时，输出 `skipped` 及原因，以 0 退出。跳过不构成 GPU 验证通过。
