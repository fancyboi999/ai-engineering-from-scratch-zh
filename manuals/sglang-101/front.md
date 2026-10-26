# 如何阅读本手册

> 安装 SGLang、启动模型，再根据自己的流量找出真正重要的少数设置；每项建议都有实测结果作依据。

本手册面向想在自己的 GPU 上部署开源模型的工程师。先启动一个能回答请求的服务，再扩展到可测量、可运维的 GPU 集群。

下面的命令用于创建环境、安装 SGLang、启动服务并发送首个请求：

```bash
uv venv --python 3.12
source .venv/bin/activate
uv pip install --prerelease=allow "sglang==0.5.22"
sglang serve --model-path Qwen/Qwen3-8B --host 127.0.0.1 --port 30000 \\
  --enable-cache-report --enable-metrics --mem-fraction-static 0.85
curl -s http://127.0.0.1:30000/generate -H 'Content-Type: application/json' \\
  -d '{"text": "The capital of France is", "sampling_params": {"max_new_tokens": 12, "temperature": 0}}'
```

[第 1.1 节](#s-install-sglang-and-serve-your-first-model)会逐步说明这些命令、预期输出和常见错误。上面的 uv 安装和服务命令曾在 NVIDIA L4 上运行，SGLang 版本为 0.5.22。Apple silicon 和 Docker 的步骤来自对应记录与文档。每个实测数值都会注明它来自 NVIDIA L4、DGX Spark 还是 Mac。

## 读完后你能做什么

- 安装 SGLang、启动模型，并通过两种 API 获取答案。
- 按 GPU 显存规划 KV 池，排查服务启动失败和显存不足。
- 按共享 prompt、长文档、高并发或 FP8 调整服务。
- 测量自己的服务，并用指标观察生产运行。
- 选择多 GPU 扩展方式，并审读公开基准的条件。

你需要会通过 API 调用模型，理解 token 和 GPU。本手册会从能运行的服务开始，不要求你先研究过推理引擎的调度器或缓存。

## 各部分顺序

第 1 部分安装并检查服务，再逐步跟踪请求。第 2 部分讲请求如何经过三个进程与调度器。第 3 部分讲 KV 缓存；它决定单张 GPU 能服务多少用户。第 4 部分说明如何加速前向传播，第 5 部分介绍测量，第 6 部分说明多 GPU 扩展，第 7 部分介绍运维和强化学习负载。参考部分还说明[本手册的编写方式](#s-ref-how-this-manual-was-made)。

```parts
```

需要今天就做出决定时，可以先读每节的“我们的建议”和实践要点。要了解依据，再读完整内容。

七门课程会深入解释本手册使用的原理：[服务内部机制课](phases/17-infrastructure-and-production/04-vllm-serving-internals)、[Goodput 课](phases/17-infrastructure-and-production/08-inference-metrics-goodput)、[推测解码课](phases/17-infrastructure-and-production/05-eagle3-speculative-decoding)、[量化课](phases/17-infrastructure-and-production/09-production-quantization)、[服务选型课](phases/17-infrastructure-and-production/28-self-hosted-serving-selection)、[推理优化课](phases/10-llms-from-scratch/12-inference-optimization)和[prompt 缓存课](phases/11-llm-engineering/15-prompt-caching)。这些课程讲原理，本手册聚焦 SGLang。

## 图中的颜色

每种颜色在所有图中保持同一含义：

```palette
```

[图 0.1](#fig-0-1)使用捕获记录中的交互说明箭头样式。

```figure
id: fig-0-1
kind: sequence
title: 如何阅读本手册的时序图
claim: 每种箭头表示一种交互；每个标签都是实际名称、消息或记录数字。
caption: 每行按编号从箭尾读到箭头，标签下方的注释说明线条样式。来源：capture/out/cache-experiment.txt、server-default.log 和第 3.2 节的内存耗尽记录。
```

读完本手册的版本、来源、捕获机器和证据约定见[本手册的编写与验证方式](#s-ref-how-this-manual-was-made)。

Sources: manual.json; capture/out/cache-experiment.txt, capture/out/server-default.log; manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md.
