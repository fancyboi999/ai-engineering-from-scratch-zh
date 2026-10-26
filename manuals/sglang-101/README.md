# SGLang 101

从笔记本上的一个请求，到 GPU 集群上的 SGLang 0.5.22 服务，补上参数列表之外的判断。文档解释 `sglang serve` 的 535 个选项各做什么，本手册解释哪些选项重要、每项功能为何存在、哪些默认值假定了你并不具备的机器，以及上游修改设置后测到了什么。中文网页入口是 [aieng-zh.cn/manual-sglang-101.html](https://aieng-zh.cn/manual-sglang-101.html)。本次同步沿用上游的 `ready` 状态，构建后列入手册目录；实际发布状态以部署验证为准。上游课程 release 附带 PDF `aiefs-manual-sglang-101.pdf`。

## 内容

- 7 部分、29 节正文，另有 7 节参考。第 1 部分安装并检查服务，再跟踪请求。第 2 部分讲一个请求经过三个进程与调度器的过程。第 3 部分讲 KV 缓存。第 4 部分加速每次前向传播，第 5 部分测量服务器。第 6 部分把模型分布到多张 GPU，第 7 部分讲生产运行，最后介绍作为 Miles rollout 引擎的 SGLang。参考部分含[本手册的编写与验证方式](sections/r-7-how-this-manual-was-made.md)。
- 每节围绕一个问题展开：成本、直观修法为何失败、SGLang 的做法、测量指标、默认值建议，以及带链接的真实事故。
- 每个数字都标明证据类型：实测、代码、SGLang 团队之外工程师的实践报告，或团队与厂商的主张。
- 封面图、使用图表工具从捕获记录与代码绘制的图，以及由 GPU 运行数据生成的图表。
- `capture/` 中的捕获工具通过 MLX 在 Apple silicon 上启动真实服务器，发送请求、运行官方基准，将观察结果写入 `capture/out/`。
- `capture/gpu/` 中的 GPU 工具会运行服务配置和基准扫描，并记录 GPU 时钟与温度。历史数据来自 NVIDIA L4 和 DGX Spark 上的 GB10。

## 文件

| 路径 | 内容 |
|---|---|
| `manual.json` | manifest：固定版本、各部分、配色、来源、封面图 |
| `front.md`, `sections/` | 正文，每节一个文件 |
| `figures/src/` | 图源，构建为 `figures/*.svg` |
| `capture/` | 捕获工具与 `capture/out/` 中的原始记录 |
| `capture/gpu/` | GPU 工具、`capture/gpu/out-l4/` 与 `capture/gpu/out-gb10/` 中的输出，以及 `capture/gpu/summary/` 中的图表数据 |

## 固定版本

| 项目 | 值 |
|---|---|
| SGLang | 0.5.22，标签 `v0.5.22`，提交 `baa9befa381511cd4d56f83980951e5a45fffc6d`，标签日期 2026-10-13 |
| Miles | v0.1.2，提交 `a22fd824`，仅用于第 7.2 节 |
| 上游核验日期 | 2026-10-16 |

## 上游录制主机

| 项目 | 版本 |
|---|---|
| 主机 | Apple silicon、arm64，macOS 26.2 |
| SGLang | 从标签安装的 0.5.22，带 `srt_mps` extra |
| 框架 | PyTorch 2.13.0、MLX 0.32.4、Python 3.12.12 |
| 模型 | `mlx-community/Qwen3-0.6B-4bit` |

GPU 记录包括 NVIDIA L4 上的 Qwen3-8B 对照，以及 NVIDIA DGX Spark 上的 GB10 实验。后者配备单张 GB10（计算能力 12.1、aarch64），运行 PyPI 的 SGLang 0.5.22、PyTorch 2.14.1+cu130 和 CUDA 13.0，模型为 `Qwen/Qwen3-30B-A3B-Instruct-2507` 及其 FP8 checkpoint。`capture/README.md` 说明如何运行 GPU 工具。中文维护没有重新运行这些 GPU 实验；原始记录保留上游内容。

## 运行捕获工具

```bash
cd manuals/sglang-101
python3 capture/run.py --check
```

使用 SGLang 环境中的 Python。检查会再次启动同样的四个服务器，记录到临时目录，然后比较不应变化的事实：温度为 0 时的文本、token 和缓存 token 数、请求数、每个 token 的 KV 字节数、指标名，以及选项列表。缺少 Apple silicon 上的 SGLang 0.5.22 和 MLX 时，检查输出 `skipped` 及原因，以 0 退出。完整运行需要 20–25 分钟，`capture/README.md` 列出全部产物。

## 构建与检查

从仓库根目录运行：

```bash
node manuals/_shared/figkit.js build manuals/sglang-101
node site/build-manuals.js
node scripts/audit_manuals.js --manual sglang-101
```

安装了捕获环境时，审计会运行约 25 分钟的捕获检查。传入 `--skip-capture` 可跳过。审计必须报告 `TOTAL 0`。契约见 [manuals/AUTHORING.md](../AUTHORING.md)。静态审计通过不等于重新验证了 MLX 或 GPU 运行行为。
