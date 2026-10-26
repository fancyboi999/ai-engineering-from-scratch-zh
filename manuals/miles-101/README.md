# Miles 101

本手册介绍如何使用 Miles 进行语言模型强化学习：从单 GPU 上启动一次 GRPO 训练，到运行可以信任的任务。手册先带你启动训练，再介绍如何估算规模、检查训练是否正确，并在失败时查明原因。网页版本位于 [aieng-zh.cn/manual-miles-101.html](https://aieng-zh.cn/manual-miles-101.html)，每次课程发行都会附上 PDF 文件 `aiefs-manual-miles-101.pdf`。

## 手册内容

- 全手册分为 8 个部分，共 34 节，另有 5 节参考资料。第 1 部分介绍如何在单 GPU 上运行 GRPO、添加 watchdog 并读取前十步。第 2 部分估算训练规模；第 3 部分提供配置示例；第 4 部分介绍速度和稳定性；第 5 部分检查训练；第 6 部分扩展训练；第 7 部分排查故障；第 8 部分解释 Miles 的内部机制。
- 所有实测数据均来自一台 DGX Spark 的运行记录。每节会说明结果的适用范围。单 GPU 无法展示的内容会注明哪些信息仅来自源码。
- 一幅封面图和 18 幅使用 figure kit，根据运行记录和代码绘制的图表。
- `capture/` 下的采集工具包，无需 GPU 即可检查已保存的输出。
- `capture/gpu/` 下的 GPU 工具包，用于在 DGX Spark 上启动训练。

## 文件结构

| 路径 | 内容 |
|---|---|
| `manual.json` | 清单：版本、部分、色板、来源和封面图 |
| `front.md`、`sections/` | 手册正文，每节一个文件 |
| `figures/src/` | 图表源文件，构建为 `figures/*.svg` |
| `capture/run.py` | 采集工具包：`--check` 比较已保存的输出；直接运行则根据原始日志重新生成摘要 |
| `capture/gpu/` | GPU 工具包：`miles_grpo.py` 启动训练；`watchdog.sh` 停止 engine 退出的任务；GPU 过热时 `heat-guard.sh` 暂停容器；`summarize_miles.py` 写入摘要 |
| `capture/gpu/out-gb10/`、`capture/gpu/out-l4/` | listing 所依据的日志和检查结果 |
| `capture/gpu/summary/miles-gb10-lab.json` | 表格和图表使用的逐步数据与中位数 |

## 版本信息

| 项目 | 数值 |
|---|---|
| 镜像 | `radixark/miles@sha256:c64fa344e3a86715f03c0a1b6a422c474e0035355591a2f6da87bf52a74c52da`，arm64 |
| 镜像中的 Miles | main `08752a1283`，2026-10-15 |
| 镜像中的 SGLang | `0.5.22.dev46+g7b6993a` |
| 核验日期 | 2026-10-22 |

## 记录数据的主机

| 项目 | 数值 |
|---|---|
| 机器 | NVIDIA DGX Spark，一张 GB10 GPU，CPU 和 GPU 共用 128 GB 内存 |
| 模型 | `Qwen/Qwen3-0.6B`，运行名称另有标注时除外 |
| 数据 | GSM8K prompt，使用二元 math reward |
| Trainer | 单 GPU 上的 FSDP，与 SGLang engine colocated 运行 |

GB10 持续高负载数小时后会过热，因此 heat guard 会在温度达到 84 C 时暂停容器。耗时数据来自未受暂停影响的 clean step，或来自启用 heat guard 前的运行。两项 logprob 检查在 Miles 镜像之外运行，使用 NVIDIA L4 和 SGLang 0.5.22；对应文件中注明了该信息。

## 阅读方式

先读前言“如何阅读本手册”。其中列出了首次运行需要的五条命令、会影响操作的五项结果，并定义了 heat guard、pause 和 clean step 三个术语。运行第 1.1 节时，应在另一个终端启动第 1.2 节的 watchdog，因为 engine 退出后训练不会自行停止。如需核对数值或重复运行，请参考[实验记录](https://aieng-zh.cn/manual-miles-101.html#s-ref-lab-notes)。

## 运行工具包

```bash
cd manuals/miles-101
python3 capture/run.py --check
```

检查过程无需 GPU 或网络。工具包会根据 16 答案运行中保存的错误时间回放 watchdog 规则，根据暂停日志标记暂停，并根据已保存的步骤重新计算所有中位数。随后，它会检查每个引用数值是否仍存在于对应文件。原始运行日志保存在 DGX Spark 上。缺少这些日志时，检查会将新摘要标为 `skipped`，只比较已存输出。将 `MILES_LAB_RUNS` 设置为包含 `status.txt` 的 runs 目录后，还可以重新构建摘要并比较。使用该目录运行 `python3 capture/run.py` 会替换已保存的摘要和暂停日志。

## 构建与检查

从仓库根目录运行：

```bash
node manuals/_shared/figkit.js build manuals/miles-101
node site/build-manuals.js
node scripts/audit_manuals.js --manual miles-101
```

审计会运行采集检查，最终必须报告 `TOTAL 0`。手册编写契约见 [manuals/AUTHORING.md](../AUTHORING.md)。
