# vLLM 101

本手册介绍如何从第一次启动服务器，逐步完成 vLLM 0.31.0 模型服务的资源估算、调优和故障排查。它为每个决定提供实测结果。文档解释每个参数的作用；本手册说明哪些参数对你的 GPU 和负载重要，以及我们调整后观察到了什么。中文网页入口：[aieng-zh.cn/manual-vllm-101.html](https://aieng-zh.cn/manual-vllm-101.html)。

## 内容

- 正文分为 8 部分、44 节，另有 8 节参考。第 1 到第 7 部分按实际工作顺序介绍启动服务器、估算资源、针对负载调优、添加加速功能、测量性能、横向扩展、运行和排查。第 8 部分解释 vLLM 内部机制，适合在默认行为令人意外时阅读。
- 每一节聚焦一个问题，并以检查步骤收尾，用来确认改动是否生效。
- 每个实测数值都注明机器、日期、时钟和随机种子数量。无法测量的部分会明确说明。
- 封面图和 26 幅通过图表工具绘制的插图，图表使用 GPU 测试数据。
- 参考章节包含参数表、指标、事故索引、版本固定信息、术语表、来源，以及带完整表格的实验记录。

## 文件

| 路径 | 内容 |
|---|---|
| `manual.json` | manifest：版本信息、各部分、配色、来源和封面图 |
| `front.md`、`sections/` | 正文，每节一个文件 |
| `figures/src/` | 图表源文件，生成 `figures/*.svg` |
| `capture/gpu/summary/` | GPU sweep 汇总；正文表格和图表读取 `l4.json`、`l4-gpu1.json`、`gb10.json` |
| `capture/gpu/out-l4/`、`capture/gpu/out-gb10/` | 服务器日志和实测记录，代码清单从中截取 |
| `capture/gpu/incidents/` | 故障排查章节引用的错误记录 |

## 版本信息

| 项目 | 值 |
|---|---|
| vLLM | 0.31.0，提交 `db9527a46873454610df6dbedf79a36d6bf1a7f6`，发布于 2026-10-05 |
| CUDA wheel 所需的 PyTorch | 2.13.0 |
| 核验日期 | 2026-10-22 |

## 录制主机

| 项目 | NVIDIA L4 | DGX Spark |
|---|---|---|
| GPU | NVIDIA L4，计算能力 8.9，24 GB | NVIDIA GB10，计算能力 12.1，128 GB 统一内存 |
| CPU 架构 | x86_64 | aarch64 |
| 驱动 | 615.71.09 | 580.159.03 |
| vLLM 运行方式 | 虚拟环境中的 pip wheel | 镜像 `vllm/vllm-openai:v0.31.0` |
| 模型 | `Qwen/Qwen3-8B`、其 FP8 checkpoint 和 EAGLE3 draft `Tengyunw/qwen3_8b_eagle3` | `Qwen/Qwen3-30B-A3B-Instruct-2507` |

L4 的时钟会随温度和节点上其他任务变化，因此前言将 L4 测试分成四个时段。只能比较同一时段的数据。

## 如何阅读

先读前言“如何阅读本手册”。其中列出启动服务器的五条命令、各部分的顺序和 L4 的四个测试时段。第 1 部分应完整阅读一次。之后可按问题查阅对应章节。需要核对数值或重现实验时，参考[实验记录](https://aieng-zh.cn/manual-vllm-101.html#s-ref-lab-notes)。

## 重新运行 sweep

GPU 测试使用了 SGLang 101 中的 sweep 工具 `manuals/sglang-101/capture/gpu/sweep.py`。它包含各机器的 profile，以及每张表使用的 vLLM 配置。运行需要 NVIDIA GPU、vLLM 0.31.0 和 SGLang 0.5.22 benchmark client。[实验记录](https://aieng-zh.cn/manual-vllm-101.html#s-ref-lab-notes)列出随机种子、服务器设置、缓存池大小和时钟规则。[性能测试](https://aieng-zh.cn/manual-vllm-101.html#s-benchmark-your-server-in-15-minutes)提供完整的 client 命令。

本手册没有离线 capture 检查。`capture/gpu/` 中保存的日志和汇总文件是上游实验记录；审计会根据这些记录校验每个代码清单。

## 构建与检查

从仓库根目录运行：

```bash
node manuals/_shared/figkit.js build manuals/vllm-101
node site/build-manuals.js
node scripts/audit_manuals.js --manual vllm-101
```

审计应报告 `TOTAL 0`。规则见 [manuals/AUTHORING.md](../AUTHORING.md)。
