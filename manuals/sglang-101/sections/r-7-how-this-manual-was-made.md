# 本手册如何编写

> 本页记录支撑手册各项事实和数字的版本、来源、机器及捕获工具。

## 版本 {#s-ref-how-this-manual-was-made-the-version}

本手册固定 SGLang 0.5.22，该标签发布于 2026-10-13，提交为 `baa9befa381511cd4d56f83980951e5a45fffc6d`。事实核验日期为 2026-10-16。SGLang 大约每三周发布一次，0.5.20 至 0.5.22 间已有多个默认值变化。旧版配置可能不适用于此版，各节会指出差异。

## 按权威性排序的来源 {#s-ref-how-this-manual-was-made-the-sources-ranked}

事实来自七类来源，按权威性排序。来源冲突时，以更高等级为准，正文会说明。

| 等级 | 来源 | 手册采用的内容 | 引用方式 |
|---|---|---|---|
| 1 | 标签对应的 SGLang 源码，`baa9befa` | 全部默认值和机制 | 各节来源行的文件列表 |
| 2 | [Mac](manuals/sglang-101/capture/out) 与 [GPU](manuals/sglang-101/capture/gpu) 的运行记录 | 全部 listing 和标为实测的数字 | 捕获文件名 |
| 3 | SGLang issue 与 PR | 事故和各功能的设计历史 | `issue` 及编号 |
| 4 | 论文 | RadixAttention 原始设计及 SGLang 实现的方法 | `paper` 及标题 |
| 5 | 标签对应的 SGLang 文档 | 与代码核对过的文档行为 | `docs` 及标题 |
| 6 | 独立实践报告 | 我们无法运行的 GPU 配置，例如单服务器多 GPU | `field`、作者及月份 |
| 7 | SGLang 团队和供应方报告 | 主张，始终注明来自作者 | `team` 或供应方及月份 |

文档低于代码是有意的。0.5.22 文档仍列出代码已删除的两个注意力后端，HiCache 预取超时也与代码不同。我们说默认值时，指代码实际设置的值。

## 四类证据 {#s-ref-how-this-manual-was-made-four-kinds-of-evidence}

手册每个数字在正文中都带有四种标签之一。

**我们测得：** 数字来自下面机器表所列设备上的 [Mac 运行](manuals/sglang-101/capture/out)或 [GPU 运行](manuals/sglang-101/capture/gpu)。你可以运行工具，得到相同事实。

**代码显示：** 默认值或机制来自标签对应的 SGLang 源码，来源行列出文件。

**实践报告：** SGLang 团队之外的工程师或公司运行 SGLang 并公布结果。正文注明作者、月份、其提供的版本，以及调优内容。

**团队报告**或**供应方报告：** SGLang 团队、RadixArk 或硬件供应方发布数字。我们将其作为作者主张引用，有独立结果时会进行对照。

DeepEP 和跨多 GPU 的 prefill-decode 分离，需要我们没有的硬件。这些章节依赖代码与实践报告论证，标签会说明。

## 捕获工具 {#s-ref-how-this-manual-was-made-the-capture-kit}

[捕获工具](manuals/sglang-101/capture)在 Apple silicon 上通过 MLX 后端启动真实 SGLang 服务器，发送请求、运行官方基准，将观察写入[输出目录](manuals/sglang-101/capture/out)。`python3 capture/run.py` 记录全部内容。`python3 capture/run.py --check` 在临时目录重新记录，再比较不应变化的事实：温度 0 下的生成文本、token 与缓存 token 计数、请求计数。每 token 的 KV 字节数和指标名也是事实。

每次运行时间都会变化，因此检查不比较时间。

工具需要 Apple silicon 上安装 SGLang 0.5.22 的 MLX extra，无法在仓库 CI 运行。缺少该环境时，`--check` 打印 `skipped` 及原因，以代码 0 退出。全部 Mac 运行文件均录制于同一台机器：

| 项目 | 值 |
|---|---|
| 主机 | Apple silicon 笔记本，macOS 26.2，构建 25C56，arm64 |
| SGLang | 0.5.22，从标签安装，包含 `srt_mps` extra |
| 框架 | PyTorch 2.13.0、MLX 0.32.4、Python 3.12.12 |
| 模型 | `mlx-community/Qwen3-0.6B-4bit` |
| 服务器参数 | `SGLANG_USE_MLX=1`、`--disable-cuda-graph`、`--enable-cache-report`、`--enable-metrics`、`--mem-fraction-static 0.4` |
| 录制日期 | 2026-10-16 |

工具启动四台服务器：默认配置、关闭 radix cache、关闭重叠调度器，以及 4,096 token 池。0.5.22 关闭重叠调度器后，服务器在首个真实 batch 崩溃，工具有意记录此故障。[第 2.4 节](#s-the-overlap-scheduler)解释该记录。

## GPU 工具 {#s-ref-how-this-manual-was-made-the-gpu-kit}

[GPU 工具](manuals/sglang-101/capture/gpu)在 NVIDIA GPU 上采用同样方法。[运行脚本](manuals/sglang-101/capture/gpu/run.py)启动八种服务器配置，写入 [GB10 运行日志](manuals/sglang-101/capture/gpu/out-gb10)。[扫描脚本](manuals/sglang-101/capture/gpu/sweep.py)以三个 seed 重复每个基准点，并记录每次运行的 GPU 时钟与温度。[汇总脚本](manuals/sglang-101/capture/gpu/summarize.py)为每台机器写一份汇总：[GB10 汇总数据](manuals/sglang-101/capture/gpu/summary/gb10.json)、[L4 汇总数据](manuals/sglang-101/capture/gpu/summary/l4.json)和[降频 L4 汇总数据](manuals/sglang-101/capture/gpu/summary/l4-throttled.json)。[Miles 汇总脚本](manuals/sglang-101/capture/gpu/summarize_miles.py)写入 [Miles 汇总数据](manuals/sglang-101/capture/gpu/summary/miles-gb10.json)。图表读取这四个文件。

下表每行是 GPU 工具的一次扫描，链接打开汇总文件，各节注明所用运行的日期和时钟。

```lab-runs
```

全部 GB10 运行日志和 GB10 汇总数据均录制于同一台机器：

| 项目 | 值 |
|---|---|
| 主机 | NVIDIA DGX Spark，Ubuntu 24.04，aarch64 |
| GPU | NVIDIA GB10，计算能力 12.1，与 CPU 共享 121.7 GiB 内存 |
| SGLang | PyPI 的 0.5.22，sglang-kernel 0.4.9，flashinfer 0.7.1 |
| 框架 | PyTorch 2.14.1+cu130、CUDA 13.0、驱动 580.159.03、Python 3.12.3 |
| 模型 | `Qwen/Qwen3-30B-A3B-Instruct-2507`、其 FP8 checkpoint，以及 EAGLE-3 草稿 `lmsys/SGLang-EAGLE3-Qwen3-30B-A3B-Instruct-2507-SpecForge-Nex` |
| 服务器参数 | `--enable-cache-report`、`--enable-metrics`、`--mem-fraction-static 0.7` |
| 录制日期 | 2026-10-16 |

工具还有在 NVIDIA L4 上运行 Qwen3-8B 的 `l4` 配置，写入 [L4 运行日志](manuals/sglang-101/capture/gpu/out-l4)与 [L4 汇总数据](manuals/sglang-101/capture/gpu/summary/l4.json)。第 1 部分的 listing 来自该 L4 服务器。首次 L4 扫描过热降频，[第 5.1 节](#s-sglang-benchmark-serving)将其作为事故解释。随后我们在每次运行前冷却至 72°C，重跑 L4。[第 4.3 节](#s-quantization)、[第 4.4 节](#s-speculative-decoding)和第 5.1 节使用这些运行，第 5.1 节还展示了冷却后的卡在长负载下仍会降低时钟。

## 约定 {#s-ref-how-this-manual-was-made-conventions}

所有命令均用 `sglang serve` 启动服务器。旧的 `python -m sglang.launch_server` 在 0.5.22 仍有效，但打印弃用警告。端口使用默认 `30000`。记录输出中的 `~` 表示主目录。

引用指出一个位置。`{{issue #35129}}` 指 SGLang 仓库的一个 issue。`{{field Jarvislabs 2026-05}}` 通过作者和月份指向实践报告，正文提供链接。各节所依据的 SGLang 源码文件，只在节末来源行列一次。listing 原样复制捕获文件中的行，`…` 标记删节，note 说明删去了什么。

网页中的图可以播放动画，Replay 按钮重新播放步骤。打印和减少动态效果模式显示最后一帧。

来源：manual.json；capture/README.md；capture/run.py；capture/gpu/run.py、capture/gpu/sweep.py、capture/gpu/summarize.py、capture/gpu/summarize_miles.py、capture/gpu/out-gb10/environment.json、capture/gpu/out-l4/environment.json；capture/out/environment.json、server-no-overlap.log。
