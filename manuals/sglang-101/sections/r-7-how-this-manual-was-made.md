# 本手册的编写与验证方式

> 本页记录了本手册所依赖的版本、来源、机器和捕获工具，以及文中每项事实和数值的出处。

## 版本

本手册固定使用 SGLang 0.5.22。该版本于 2026-10-13 发布，对应提交 `baa9befa381511cd4d56f83980951e5a45fffc6d`。事实于 2026-10-16 核验。SGLang 大约每三周发布一次；0.5.20 到 0.5.22 之间有多个默认值发生变化。旧版本的操作步骤在本版本中可能有误，相关章节会指出差异。

## 来源及其优先级

本手册的事实来自七类来源，并按权威性排序。来源冲突时，以优先级更高的来源为准，正文会说明冲突。

| 排名 | 来源 | 用途 | 标记方式 |
|---|---|---|---|
| 1 | 标签对应的 SGLang 源码，`baa9befa` | 默认值和机制 | 各节来源行列出的文件 |
| 2 | [Mac 捕获记录](manuals/sglang-101/capture/out)和 [GPU 捕获记录](manuals/sglang-101/capture/gpu) | 输出和所有标记为实测的数值 | 捕获文件 |
| 3 | SGLang issues 和 pull requests | 事故和功能设计历史 | `issue` 及其编号 |
| 4 | 论文 | RadixAttention 的原始设计及 SGLang 实现的方法 | `paper` 及论文标题 |
| 5 | 标签对应的 SGLang 文档 | 与代码核对过的文档行为 | `docs` 及文档标题 |
| 6 | 独立实测报告 | 本团队未运行的硬件配置，例如多 GPU 服务器 | `field`、作者和月份 |
| 7 | SGLang 团队和硬件厂商报告 | 始终注明为发布者的主张 | `team` 或厂商名称及月份 |

文档的优先级低于代码。SGLang 0.5.22 的文档仍列出了代码已删除的两个 attention backend；HiCache 预取超时的文档值也与代码不同。本手册所说的“默认值”指代码实际设置的值。

## 四类证据

本手册中的数值会标注以下四类证据之一：

**我们测得：** 数值来自 [Mac](manuals/sglang-101/capture/out)或 [GPU](manuals/sglang-101/capture/gpu)捕获记录，记录中注明了机器。你可以运行捕获工具复现其中的事实。

**代码所示：** 默认值或机制来自对应标签的 SGLang 源码。各节的来源行列出具体文件。

**独立实测：** SGLang 团队之外的工程师或公司运行了 SGLang 并发布结果。正文会注明发布者、月份、当时的版本和所用调优。

**团队或厂商报告：** SGLang 团队、RadixArk 或硬件厂商发布的数值。我们会标明发布者的主张，并在有独立结果时进行对照。

DeepEP 和跨多 GPU 的 prefill-decode 分离需要我们当时没有的硬件。相关章节的论据来自代码和独立实测报告，正文会注明证据类型。

## Mac 捕获工具

[Mac 捕获工具](manuals/sglang-101/capture)通过 MLX backend 在 Apple silicon 上启动真实的 SGLang 服务。工具会发送请求、运行官方基准，并将结果写入[输出目录](manuals/sglang-101/capture/out)。运行 `python3 capture/run.py` 会记录全部结果。运行 `python3 capture/run.py --check` 会在临时目录重新捕获，并比较不应改变的事实：温度为 0 时生成的文本、token 数量、缓存 token 数量、请求数、每 token 的 KV 字节数和指标名称。

计时会因每次运行而变化，因此检查不会比较计时结果。

该工具要求在 Apple silicon 上安装带 MLX extra 的 SGLang 0.5.22，无法在仓库 CI 运行。缺少环境时，`--check` 会说明原因、报告 `skipped` 并以状态码 0 退出。Mac 捕获记录来自同一台机器：

| 项目 | 配置 |
|---|---|
| 主机 | Apple silicon 笔记本，macOS 26.2，build 25C56，arm64 |
| SGLang | 0.5.22，从对应标签安装并启用 `srt_mps` extra |
| 框架 | PyTorch 2.13.0、MLX 0.32.4、Python 3.12.12 |
| 模型 | `mlx-community/Qwen3-0.6B-4bit` |
| 服务参数 | `SGLANG_USE_MLX=1`、`--disable-cuda-graph`、`--enable-cache-report`、`--enable-metrics`、`--mem-fraction-static 0.4` |
| 记录日期 | 2026-10-16 |

工具会启动四种服务配置：默认配置、关闭基数缓存、关闭 overlap scheduler，以及使用 4,096-token 显存池的配置。0.5.22 下，关闭 overlap scheduler 的服务在首个真实批次崩溃；工具会刻意保留这次崩溃记录。[第 2.4 节](#s-the-overlap-scheduler)分析了这一记录。

## GPU 捕获工具

[GPU 捕获工具](manuals/sglang-101/capture/gpu)在 NVIDIA GPU 上执行相同类型的检查。[运行脚本](manuals/sglang-101/capture/gpu/run.py)会启动八种服务配置，并写入 [GB10 运行日志](manuals/sglang-101/capture/gpu/out-gb10)。[扫描脚本](manuals/sglang-101/capture/gpu/sweep.py)对每个基准点使用三个随机种子重复测量，并记录每次运行的 GPU 时钟和温度。[汇总脚本](manuals/sglang-101/capture/gpu/summarize.py)为每台机器生成独立汇总：[GB10 数据](manuals/sglang-101/capture/gpu/summary/gb10.json)、[L4 数据](manuals/sglang-101/capture/gpu/summary/l4.json)和[发生降频的 L4 数据](manuals/sglang-101/capture/gpu/summary/l4-throttled.json)。[Miles 汇总脚本](manuals/sglang-101/capture/gpu/summarize_miles.py)会生成 [Miles 数据](manuals/sglang-101/capture/gpu/summary/miles-gb10.json)。图表会读取这四个文件。

下表中的每一行代表一次 GPU 扫描。链接会打开相应汇总文件，各节会注明使用的运行日期和时钟频率。

```lab-runs
```

GB10 的所有运行日志和汇总数据来自同一台机器：

| 项目 | 配置 |
|---|---|
| 主机 | NVIDIA DGX Spark，Ubuntu 24.04，aarch64 |
| GPU | NVIDIA GB10，compute capability 12.1，与 CPU 共享 121.7 GiB 内存 |
| SGLang | 从 PyPI 安装的 0.5.22，sglang-kernel 0.4.9，flashinfer 0.7.1 |
| 框架 | PyTorch 2.14.1+cu130、CUDA 13.0、驱动 580.159.03、Python 3.12.3 |
| 模型 | `Qwen/Qwen3-30B-A3B-Instruct-2507`、其 FP8 checkpoint，以及 EAGLE-3 draft `lmsys/SGLang-EAGLE3-Qwen3-30B-A3B-Instruct-2507-SpecForge-Nex` |
| 服务参数 | `--enable-cache-report`、`--enable-metrics`、`--mem-fraction-static 0.7` |
| 记录日期 | 2026-10-16 |

工具还有一个 `l4` 配置，用于在 NVIDIA L4 上运行 Qwen3-8B，并写入 [L4 运行日志](manuals/sglang-101/capture/gpu/out-l4)和 [L4 汇总数据](manuals/sglang-101/capture/gpu/summary/l4.json)。第一部分的日志示例使用 L4 服务。首次 L4 扫描时 GPU 过热并发生降频，[第 5.1 节](#s-sglang-benchmark-serving)记录了这起事故。之后我们把卡温降到 72°C 再开始每次运行。[第 4.3 节](#s-quantization)、[第 4.4 节](#s-speculative-decoding)和第 5.1 节使用了这些数据；第 5.1 节还显示卡在长时间负载下仍会降低时钟频率。

## 约定

本手册中的命令都用 `sglang serve` 启动服务。旧入口 `python -m sglang.launch_server` 在 0.5.22 中仍可使用，但会打印弃用警告。端口使用默认值 `30000`。捕获输出中的 `~` 表示 home 目录。

文中的来源标记会指出证据位置。`{{issue #35129}}` 表示 SGLang 仓库中的 issue；`{{field Jarvislabs 2026-05}}` 表示 Jarvislabs 于对应月份发布的报告，正文会链接该报告。各节末尾的来源行会列出所依据的 SGLang 源码。listing 内容来自捕获文件，`…` 表示按说明截去了部分内容。

网页上的图表可以播放，按 Replay 会重新展示步骤。打印版和减少动态效果的设置会显示最终画面。

Sources: manual.json; capture/README.md, capture/run.py; capture/gpu/run.py, capture/gpu/sweep.py, capture/gpu/summarize.py, capture/gpu/summarize_miles.py, capture/gpu/out-gb10/environment.json, capture/gpu/out-l4/environment.json; capture/out/environment.json, capture/out/server-no-overlap.log.
