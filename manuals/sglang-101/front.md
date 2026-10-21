# 如何阅读本手册

> SGLang 文档解释每个参数的作用，本手册解释哪些参数重要、它们为何存在，以及修改参数后上游测到了什么。

在 0.5.22 版本，`sglang serve --help` 列出 535 个选项。文档逐一描述，回答的是“这个参数做什么”。

但花钱之前还需要回答：第一天最重要的三个设置是什么？哪些默认值假定了你并不具备的机器？哪份公开基准的负载与你相符？

本手册回答这些问题。SGLang 的每项功能背后都有一笔过高的成本。基数缓存来自重复计算 system prompt 的成本；重叠调度器来自 Python 规划下一批时 GPU 的空等；prefill-decode 分离来自长 prompt 阻塞其他用户的代价。

每节讲清一个这样的故事：成本是什么，直观修法为何失败，SGLang 如何处理，然后说明测量指标与何时修改默认值。

## 适合谁读

你已经通过 API 调用过模型，现在希望自行部署开源模型。你知道 token 和 GPU 是什么，尚未读过推理服务引擎的调度器或缓存，希望在付费前弄清哪些设置重要。

读完后，你能：

- 启动 SGLang，发送请求，读懂调度器为请求写下的每一行日志。
- 计算模型的 KV 缓存成本，有依据地设置池容量，并解释服务器为何耗尽内存。
- 编写能命中前缀缓存的 prompt，用 `cached_tokens` 和 `/metrics` 证明命中率。
- 对服务器做基准测试，找出并发拐点，同时报告 TTFT、TPOT 和吞吐量。
- 根据测量选择张量并行、数据并行、专家并行或 prefill-decode 分离。
- 判断公开 SGLang 基准的版本、负载，以及解释结果的机制。

七节课程进一步介绍这里使用的原理。[服务内部机制课](phases/17-infrastructure-and-production/04-vllm-serving-internals)构建分页注意力和连续批处理。[Goodput 课](phases/17-infrastructure-and-production/08-inference-metrics-goodput)定义指标。[推测解码课](phases/17-infrastructure-and-production/05-eagle3-speculative-decoding)构建 EAGLE-3，[量化课](phases/17-infrastructure-and-production/09-production-quantization)介绍格式。[服务选型课](phases/17-infrastructure-and-production/28-self-hosted-serving-selection)、[推理优化课](phases/10-llms-from-scratch/12-inference-optimization)和 [prompt 缓存课](phases/11-llm-engineering/15-prompt-caching)补齐其余内容。本手册聚焦 SGLang。

## 编写依据

手册固定 SGLang 0.5.22，标签日期 2026-10-13，提交为 `baa9befa381511cd4d56f83980951e5a45fffc6d`。上游于 2026-10-16 核验相关事实。SGLang 约每三周发布一次，0.5.20 到 0.5.22 之间已有多个默认值变化。旧版操作方案在此版本可能不成立，各节会指出区别。中文版保留上游的核验日期与实测记录，不将其表述为中文维护期间重新执行的实验。

事实来自七类来源，按权威性排序。若来源冲突，以更高者为准，并在正文说明。

| 排名 | 来源 | 手册采用的内容 | 引用方式 |
|---|---|---|---|
| 1 | 标签 `baa9befa` 对应的 SGLang 源码 | 每个默认值与机制 | 各节来源行中的文件列表 |
| 2 | `capture/out/` 和 `capture/gpu/` 中的运行记录 | 每段 listing 和标为实测的数字 | 捕获文件名 |
| 3 | SGLang issue 与 PR | 事故和功能的设计历史 | `issue` 及编号 |
| 4 | 论文 | RadixAttention 的原始设计与 SGLang 实现的方法 | `paper` 及标题 |
| 5 | 对应标签的 SGLang 文档 | 文档描述的行为，并与代码核对 | `docs` 及标题 |
| 6 | 独立实践报告 | 上游无法运行的 GPU 配置，例如单服务器多 GPU | `field`、作者与月份 |
| 7 | SGLang 团队与厂商报告 | 始终标明由原作者提出的主张 | `team` 或厂商及月份 |

文档排在代码之后是有意为之。0.5.22 文档仍列出两个已从代码移除的注意力后端，HiCache 预取超时也与代码不同。这里所说的默认值，指代码实际设置的值。

## 四类证据

正文中的每个数字都带以下四类标签之一。

**实测：** 数字来自 `capture/out/` 或 `capture/gpu/`，由上游在下表机器上录制。你可以运行工具核对相同事实。

**代码：** 默认值或机制来自标签对应的 SGLang 源码，来源行列出文件。

**实践报告：** SGLang 团队之外的工程师或公司运行并公开结果。正文注明作者、月份、报告披露的版本，以及调优内容。

**团队报告**或**厂商报告：** SGLang 团队、RadixArk 或硬件厂商发布的数字。手册将其作为作者主张转述，若有独立结果则进行对照。

GPU 工具在一张 NVIDIA GB10 上运行。CUDA graphs、FP8、EAGLE-3、确定性推理，以及单 GPU 上 MoE decode 成本都有上游实测。DeepEP 与 prefill-decode 分离需要多张 GPU。DeepEP 以代码和实践报告支撑论证；第 6.3 节另有两张 L4 的分离部署失败记录，未获得有效的负载性能结果。

## 捕获工具

`capture/` 中的工具通过 MLX 后端在 Apple silicon 上启动真实 SGLang 服务。它发送请求、运行官方基准，将观察结果写入 `capture/out/`。`python3 capture/run.py` 记录全部内容。`python3 capture/run.py --check` 在临时目录重新记录并比较不应变化的事实：温度为 0 时生成的文本、token 和缓存 token 数、请求数、每 token 的 KV 字节数，以及指标名。

每次计时不同，检查不比较时间。

工具要求 Apple silicon 上带 MLX extra 的 SGLang 0.5.22，因此不能在仓库 CI 运行。缺少环境时，`--check` 输出 `skipped` 及原因，以 0 退出。`capture/out/` 中的所有文件来自同一台机器：

| 项目 | 值 |
|---|---|
| 主机 | Apple silicon 笔记本，macOS 26.2，build 25C56，arm64 |
| SGLang | 从标签安装的 0.5.22，带 `srt_mps` extra |
| 框架 | PyTorch 2.13.0、MLX 0.32.4、Python 3.12.12 |
| 模型 | `mlx-community/Qwen3-0.6B-4bit` |
| 服务参数 | `SGLANG_USE_MLX=1`、`--disable-cuda-graph`、`--enable-cache-report`、`--enable-metrics`、`--mem-fraction-static 0.4` |
| 录制日期 | 2026-10-16 |

工具启动四种服务器：默认配置、关闭基数缓存、关闭重叠调度，以及 4,096-token 池。0.5.22 中关闭重叠调度的服务器在首个真实批次崩溃，工具有意记录该崩溃。[第 2.4 节](#s-the-overlap-scheduler)解读它。

## GPU 工具

`capture/gpu/` 在 NVIDIA GPU 上做同类实验。`capture/gpu/run.py` 启动八种服务器配置，写入 `capture/gpu/out-gb10/`。`capture/gpu/sweep.py` 为每个基准点使用三个种子重复运行，并记录每次的 GPU 时钟和温度。`capture/gpu/summarize.py` 写入 `capture/gpu/summary/gb10.json`，本手册的各张图表读取该文件。

`capture/gpu/out-gb10/` 与 `capture/gpu/summary/gb10.json` 中的文件来自同一台机器：

| 项目 | 值 |
|---|---|
| 主机 | NVIDIA DGX Spark，Ubuntu 24.04，aarch64 |
| GPU | NVIDIA GB10，计算能力 12.1，与 CPU 共享 121.7 GiB 内存 |
| SGLang | PyPI 的 0.5.22、sglang-kernel 0.4.9、flashinfer 0.7.1 |
| 框架 | PyTorch 2.14.1+cu130、CUDA 13.0、驱动 580.159.03、Python 3.12.3 |
| 模型 | `Qwen/Qwen3-30B-A3B-Instruct-2507`、其 FP8 checkpoint，以及 EAGLE-3 草稿模型 `lmsys/SGLang-EAGLE3-Qwen3-30B-A3B-Instruct-2507-SpecForge-Nex` |
| 服务参数 | `--enable-cache-report`、`--enable-metrics`、`--mem-fraction-static 0.7` |
| 录制日期 | 2026-10-16 |

工具还提供 NVIDIA L4 上 Qwen3-8B 的 `l4` 配置。上游第一次 L4 扫描因高温降频，[第 5.1 节](#s-sglang-benchmark-serving)将其作为事故说明。随后上游在每次运行前冷却至 72°C 再测。[第 4.3 节](#s-quantization)、[第 4.4 节](#s-speculative-decoding)与第 5.1 节使用这些记录；第 5.1 节也指出冷却后的卡仍在长时间负载中降低时钟。

## 约定

所有命令用 `sglang serve` 启动服务器。旧命令 `python -m sglang.launch_server` 在 0.5.22 仍可用，但输出弃用警告。端口使用默认值 `30000`。记录输出中的 `~` 表示主目录。

引用定位到具体来源。`{{issue #35129}}` 指 SGLang 仓库中的 issue。`{{field Jarvislabs 2026-05}}` 标明实践报告的作者和月份，正文附链接。各节使用的 SGLang 源码文件只在末尾来源行集中列一次。Listing 原样摘录捕获文件；`…` 表示删节，注释说明删去的内容。

网页图支持动画，重放按钮可再次播放步骤。打印和减少动态效果模式显示最终帧。

## 第一次运行

需要运行 macOS 14 或更新版本的 Apple silicon Mac，约 8 GB 可用磁盘。按照 Apple silicon 页面，从标签安装带 MLX extra 的 SGLang：

```bash
git clone --branch v0.5.22 --depth 1 https://github.com/sgl-project/sglang.git
cd sglang
uv venv -p 3.12 .venv && source .venv/bin/activate
cp python/pyproject_other.toml python/pyproject.toml
uv pip install -e "python[srt_mps]"
```

上游录制的 Mac 安装耗时 3 分 15 秒。在一个终端启动服务器：

```bash
SGLANG_USE_MLX=1 sglang serve --model-path mlx-community/Qwen3-0.6B-4bit \
  --disable-cuda-graph --enable-cache-report --mem-fraction-static 0.4
```

等待出现 “The server is fired up and ready to roll!”，然后从第二个终端发送请求：

```bash
curl -s http://127.0.0.1:30000/generate \
  -H 'Content-Type: application/json' \
  -d '{"text": "The capital of France is", "sampling_params": {"max_new_tokens": 12, "temperature": 0}}'
```

捕获记录中的答案如下：

```listing
title: 第一个答案
source: capture/out/generate.txt
lang: json
note: 仅保留 text 和 meta_info 的前几个字段，删去 token ID 与计时字段。
---
  "text": " Paris, and the capital of Germany is Berlin. The capital",
…
  "meta_info": {
…
    "finish_reason": {
      "type": "length",
      "length": 12
    },
    "prompt_tokens": 5,
```

在还承担其他工作的 Mac 上应设置 `--mem-fraction-static`。[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)展示未设置该参数时上游遇到的崩溃。

## 各部分顺序

第 1 部分一页读懂 SGLang。第 2 部分跟踪一个请求经过三个进程与调度器。第 3 部分讲 KV 缓存，它决定单张 GPU 能服务多少用户。

第 4 部分加速每次前向传播，第 5 部分测量服务器。第 6 部分将一个模型分布到多张 GPU。第 7 部分讲 SGLang 的生产运行，以强化学习收尾。参考部分提供查阅表：

```parts
```

## 图中的颜色

每种颜色在所有图中保持同一含义：

```palette
```

[图 0.1](#fig-0-1)用捕获记录中的交互说明箭头样式。

```figure
id: fig-0-1
kind: sequence
title: 如何阅读本手册的时序图
claim: 每种箭头样式表示一种交互；每个标签都是真实名称、消息或录制数字。
caption: 每行按编号从箭尾读到箭头，标签下的注释说明样式。来源：capture/out/cache-experiment.txt、server-default.log，以及第 3.2 节的内存耗尽运行。
```

Sources: manual.json; capture/README.md; capture/run.py; capture/gpu/run.py, capture/gpu/sweep.py, capture/gpu/summarize.py, capture/gpu/out-gb10/environment.json; capture/out/environment.json, generate.txt, cache-experiment.txt, server-default.log, server-no-overlap.log; docs/docs/hardware-platforms/apple_metal.mdx and python/pyproject_other.toml at v0.5.22; python/sglang/srt/managers/io_struct.py at v0.5.22.
