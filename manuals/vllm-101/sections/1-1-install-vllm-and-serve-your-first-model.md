# 安装 vLLM 并部署第一个模型

> 用三条命令和一个请求，你就能从一台空机器开始，让自己的 vLLM 服务器流式输出 token。

你有一块 NVIDIA GPU 和一个模型名称，想搭建自己的 OpenAI 兼容接口。读完本节，你可以安装 vLLM、启动服务器、发送请求，并读懂启动日志。

本节所有命令都使用 vLLM 0.31.0。vLLM 大约每两周发布一个次版本，因此安装命令要固定版本。

## 先检查 GPU {#s-install-vllm-and-serve-your-first-model-check-the-gpu-first}

先检查驱动是否能识别 GPU。运行以下命令：

```bash
nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv
```

每块 GPU 会显示一行，其中包括名称和内存。如果系统找不到这个命令，先安装 NVIDIA 驱动。vLLM 不会替你安装驱动。

再根据下表检查机器的其他条件。这些要求来自 vLLM 0.31.0 安装指南。下限部分未经我们的测试。

| 要求 | 0.31.0 版本要求 |
|---|---|
| 操作系统 | 使用 uv 或 pip 时，需要 Linux 或 Windows 上的 WSL。使用 Docker 时，宿主机需要 NVIDIA Container Toolkit |
| GPU | NVIDIA GPU，计算能力至少为 7.5，例如 T4、L4、A100 或 H100 |
| 驱动 | 默认 wheel 需要支持 CUDA 12.9 的驱动；CUDA 13 镜像需要 R580 或更新版本 |
| Python | 3.10 至 3.13 |
| Hugging Face token | 仅访问受限模型时需要，并设置为 `HF_TOKEN` |

## 安装 vLLM {#s-install-vllm-and-serve-your-first-model-install-vllm}

有三种安装方式。没有特殊原因时，优先使用第一种。

**方式一：uv。** uv 会创建干净的 Python 环境，并选择与 CUDA 驱动匹配的 PyTorch 构建。

```bash
uv venv --python 3.12 --seed
source .venv/bin/activate
uv pip install vllm==0.31.0 --torch-backend=auto
```

**方式二：pip。** 使用 Python 3.12 新建虚拟环境，再安装相同版本。

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install vllm==0.31.0
```

**方式三：Docker。** 官方镜像包含 vLLM、PyTorch 和 CUDA。我们在 arm64 架构的 DGX Spark 上拉取并运行了 `vllm/vllm-openai:v0.31.0`。

```bash
docker run --rm --gpus all --ipc=host -p 8000:8000 \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:v0.31.0 Qwen/Qwen3-0.6B --reasoning-parser qwen3
```

Docker 镜像会自动启动服务器，所以使用 Docker 时可以跳过下一步。挂载 Hugging Face cache，否则容器每次启动都会重新下载权重。使用容器的 `docker logs` 命令查看日志。

运行 `vllm --version` 检查安装结果。你应当看到 `0.31.0`。

使用 uv 或 pip 安装时，首次启动会编译 FlashInfer kernel，因此需要带有 `nvcc` 的 CUDA Toolkit，并设置 `CUDA_HOME` 指向该工具包。Docker 镜像已包含工具包。我们曾在一台只安装驱动的主机上用 uv 安装 vLLM 0.31.0，每次启动都因 `Could not find nvcc` 而停止。安装 Toolkit、设置 `CUDA_HOME` 后重新启动。[症状排查](#s-troubleshoot-by-symptom)一节也会介绍此问题及工具包版本不匹配的情况。

## 启动服务器 {#s-install-vllm-and-serve-your-first-model-start-the-server}

现在启动一个小模型。Qwen3-0.6B 有 0.6B 个参数，BF16 权重大约占用 1.2 GB。

```bash
vllm serve Qwen/Qwen3-0.6B --reasoning-parser qwen3 2>&1 | tee server.log
```

服务器监听 8000 端口。首次启动时需要下载权重，因此比后续启动耗时更长。

`tee` 会在终端显示日志，同时将日志写入 `server.log`。后续章节会用 `grep` 搜索该文件，因此每次启动都沿用这个文件名。

Qwen3 是推理模型。它会先在 `<think>` 标签之间输出思考内容，再生成答案。参数 `--reasoning-parser qwen3` 会让 vLLM 把思考内容从答案文本中分离出来。不设置该参数时，思考内容会留在答案开头。[推理模型](#s-serve-reasoning-models)一节会介绍这个 parser。

启动日志很长，但其中六行就能告诉你大部分关键信息。下方清单来自我们在 DGX Spark 上部署较大的 Qwen3-30B-A3B 时的记录。你的日志结构相同，只是数值更小。

```listing
title: 需要查看的六行启动日志，记录来自 DGX Spark
source: capture/gpu/out-gb10/server-load-vllm.log
lang: text
note: 从日志开头截取的六行。横幅、完整 engine 配置和路由列表已省略。
---
(APIServer pid=1) INFO 10-21 10:53:02 [api_utils.py:347]  ▄▄ ▄█ █     █     █ ▀▄▀ █  version 0.31.0
(EngineCore pid=143) INFO 10-21 10:53:14 [gpu_worker.py:479] Using V2 Model Runner
(EngineCore pid=143) INFO 10-21 10:53:17 [cuda.py:526] Using FLASH_ATTN attention backend out of potential backends: ['FLASH_ATTN', 'FLASHINFER', 'TRITON_ATTN', 'FLEX_ATTENTION'].
(EngineCore pid=143) INFO 10-21 10:58:45 [model_runner.py:407] Model loading took 56.93 GiB memory and 330.542793 seconds
(EngineCore pid=143) INFO 10-21 10:59:46 [gpu_worker.py:692] Available KV cache memory: 31.32 GiB
(EngineCore pid=143) INFO 10-21 10:59:46 [kv_cache_utils.py:2464] GPU KV cache size: 234,960 tokens, Maximum concurrency for 8,192 tokens per request: 28.68x
```

按以下顺序查看这些日志：

1. **版本。** 它必须与你固定的版本一致。
2. **Model runner。** vLLM 0.31.0 在 CUDA 上默认使用 V2 model runner。某些功能会切回 V1，这一行能让你确认实际版本。
3. **Attention backend。** vLLM 会为 GPU 选择一个 backend。更改 KV cache 数据类型也可能改变这一行。
4. **模型加载。** 这一行显示权重占用的内存和加载时间。
5. **可用 KV cache 内存。** 这一行显示权重和启动 profile 完成后，剩余多少内存可用于 KV cache。
6. **KV cache 容量。** 这一行显示缓存可容纳的 token 数，以及同时可容纳的满长度请求数。第 2 部分会从这里开始估算。

日志出现 `Application startup complete.` 后，服务器就绪。在我们的 DGX Spark 上，加载 57 GiB 权重后总共约需 8 分钟。模型加载行记录了 330.5 秒，其中 325 秒用于读取权重文件。

```figure
id: fig-1-2
kind: structure
title: 需要查看的六行启动日志
claim: 六行启动日志显示版本、runner、attention backend、权重内存、可用于 KV cache 的内存和缓存池容量。
caption: 从左到右阅读每行：日志内容、DGX Spark 的实测值，以及它说明的事项。来源：capture/gpu/out-gb10/server-load-vllm.log。
```

## 发送第一个请求 {#s-install-vllm-and-serve-your-first-model-send-the-first-request}

打开第二个终端，用 curl 发送一条 chat 请求：

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "Qwen/Qwen3-0.6B", "messages": [{"role": "user", "content": "Name three prime numbers."}], "max_tokens": 64, "chat_template_kwargs": {"enable_thinking": false}}'
```

`chat_template_kwargs` 字段会关闭这次请求的思考过程，因此 64 个 token 足以生成答案。响应是一个 JSON 对象。答案文本在 `choices[0].message.content`，token 数量在 `usage` 中。服务器日志会新增一行，显示请求路径和 `200 OK`。

如果保持思考开启，模型可能会用完全部 64 个 token 来思考。思考内容会放在 `reasoning` 字段中，`content` 为 null，`finish_reason` 为 `length`。我们在 L4 上确实遇到过这种情况。带思考的请求要使用更大的 `max_tokens`。

服务器兼容 OpenAI API，因此无需改动代码就可以使用 OpenAI Python client：

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="EMPTY")
stream = client.chat.completions.create(
    model="Qwen/Qwen3-0.6B",
    messages=[{"role": "user", "content": "Name three prime numbers."}],
    stream=True,
    extra_body={"chat_template_kwargs": {"enable_thinking": False}},
)
for chunk in stream:
    print(chunk.choices[0].delta.content or "", end="", flush=True)
```

服务器会逐个流式返回 token。现在你已经收到了第一个流式 token。

## 输出与预期不同时 {#s-install-vllm-and-serve-your-first-model-when-the-output-is-different}

- **服务器报内存不足后停止。** 可能是其他程序占用 GPU，也可能是模型过大。查看[启动时的内存不足](#s-fix-out-of-memory-at-startup)。
- **答案开头有很长的 `<think>` 内容。** 服务器没有运行 reasoning parser。使用 `--reasoning-parser qwen3` 启动，或在请求中发送 `"chat_template_kwargs": {"enable_thinking": false}`。
- **答案为空，且 `finish_reason` 是 `length`。** 思考过程用完了所有 `max_tokens`。增加 `max_tokens`，或关闭这条请求的思考。
- **请求返回 404。** 请求中的模型名称必须与 `vllm serve` 使用的名称一致。运行 `curl http://localhost:8000/v1/models` 查看模型名称。
- **答案采用的采样设置与你的设置不同。** vLLM 默认使用模型仓库中的采样配置。使用 `--generation-config vllm` 启动服务器可改用 vLLM 默认设置。
- **启动需要很多分钟。** 首次启动会下载权重。0.31.0 在 DGX Spark 上加载大型模型较慢。

```takeaways
- 在每条安装命令中固定 vLLM 版本。
- 使用 `tee server.log` 启动服务器，并在每次启动后检查六行日志。
- 接入应用程序前，先用 curl 发送一个请求。
```

来源：vLLM 0.31.0 文档（docs/getting_started/quickstart.md、docs/getting_started/installation/gpu.md、docs/getting_started/installation/gpu.cuda.inc.md、docs/deployment/docker.md、docs/features/reasoning_outputs.md），capture/gpu/out-gb10/server-load-vllm.log，issue 58726，capture/gpu/out-l4/livecheck-2026-10-23.txt。
