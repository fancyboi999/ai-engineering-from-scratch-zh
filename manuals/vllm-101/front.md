# 如何阅读本手册

> 本手册帮助你用 vLLM 部署、估算、调优和排查开源模型，并为每项选择提供实测依据。

本手册中的“我们”指上游作者。测量和日志来自冻结的上游版本；本次中文同步未重新运行 GPU 实验。

vLLM 文档会解释每个参数的作用。本手册会告诉你哪些参数对你的 GPU 和负载重要，以及我们调整参数后观察到了什么。

## 从这里开始 {#s-front-start-here}

运行以下命令启动服务器：

```bash
uv venv --python 3.12 --seed
source .venv/bin/activate
uv pip install vllm==0.31.0 --torch-backend=auto
vllm serve Qwen/Qwen3-0.6B --reasoning-parser qwen3 2>&1 | tee server.log
curl http://localhost:8000/v1/models
```

在第二个终端运行 `curl` 命令。[第 1 部分](#s-install-vllm-and-serve-your-first-model)会逐条解释命令，以及你会看到的输出。

## 阅读本手册后，你可以 {#s-front-what-you-can-do-after-this-manual}

- 安装 vLLM、部署模型，并从启动日志读出影响大多数决策的信息。
- 预测 GPU 能容纳多少用户，并修复启动时的内存不足。
- 为实际负载挑出最重要的一两个参数，其余维持默认值。
- 根据测量结果判断 speculative decoding、FP8 或不同编译级别何时值得使用。
- 根据症状排查服务器变慢或故障的问题。

## 适合哪些读者 {#s-front-who-this-manual-is-for}

你已经通过 API 调用过模型，现在想自行部署开源模型。你知道 token 和 GPU 是什么。不需要阅读 serving engine 的源码，也能读懂本手册。

## 各部分的顺序 {#s-front-how-the-parts-are-ordered}

第 1 到第 7 部分按实际工作顺序编排：启动服务器、估算资源、针对负载调优、添加加速功能、测量性能、横向扩展，以及运行与排查。每一节聚焦一个问题，并以检查步骤收尾，用来确认改动是否生效。

第 8 部分解释 vLLM 的内部机制。默认行为令人意外时再阅读这一部分。参考章节提供参数表、指标、事故索引和实验记录。

```parts
```

## 测试环境 {#s-front-what-we-tested-on}

我们在 vLLM 0.31.0 上使用 NVIDIA L4 和 DGX Spark 进行测试。L4 服务 Qwen3-8B，DGX Spark 服务 Qwen3-30B-A3B。本手册中的每个实测数值都注明了使用的机器。[实验记录](#s-ref-lab-notes)列出随机种子、时钟和完整表格。

### L4 的四个测试时段 {#s-front-l4-sessions}

L4 的运行时钟并不固定，它会随温度和节点上的其他工作变化。因此，同样的 Qwen3-8B 负载在不同测试时段会得到不同耗时。本手册每张 L4 表格都会标明测试时段。只能比较同一时段的数据。

| 时段 | 日期 | SM 时钟中位数 | 1 个用户时的 TPOT 中位数 | 32 个用户的输出 token/s |
|---|---|---|---|---|
| 每轮测试前冷却，完整时钟 | 2026-10-17 至 2026-10-21 | 1,000 至 1,560 MHz | 60.4 ms | 273.9 至 275.1 |
| 降频 | 2026-10-22 | 1 个用户时为 210 MHz，32 个用户时为 450 MHz | 104.1 ms | 186.7 |
| 锁定在 900 MHz | 2026-10-22 | 881 至 900 MHz；单用户基线为 210 MHz | 99.0 ms | 208.8 |
| 共享 GPU，缓存池为 2,928 个 token | 2026-10-22 | 368 至 450 MHz | 241.7 ms | 未运行 |

GPU 过热或与其他任务共享功率时，时钟会低于完整频率。`nvidia-smi -lgc` 可以锁定最高时钟，但无法阻止过热 GPU 降到锁定值以下。

来源：vLLM 0.31.0 文档（docs/getting_started/quickstart.md、docs/features/reasoning_outputs.md），capture/gpu/summary/l4.json、capture/gpu/summary/l4-gpu1.json、capture/gpu/summary/gb10.json。
