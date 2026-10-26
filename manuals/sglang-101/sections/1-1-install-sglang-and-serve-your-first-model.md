# 安装 SGLang 并运行第一个模型

> 十分钟左右，我们在一张 GPU 上安装 SGLang 并启动服务，再把它的答案与记录中的结果对照。

我们从一台装有 NVIDIA GPU 和驱动的 Linux 机器开始，最后让 30000 端口上的服务同时响应 `curl` 和 OpenAI Python 客户端。

读完本节，你能用 uv 或 Docker 安装 SGLang 并启动服务，也能将第一次得到的答案与记录对照，并排查常见的启动错误。

## 准备环境

- Linux，以及支持 CUDA 13 的 NVIDIA GPU 驱动。SGLang 0.5.22 只发布了 CUDA 13 的 wheel 和镜像 {{docs}}。
- 至少 24 GB GPU 显存，用于运行本节的 `Qwen/Qwen3-8B`。显存更少时可改用 `Qwen/Qwen3-0.6B`。步骤相同，输出中的数值会变化。
- 约 16 GB 可用磁盘空间，用于下载 `Qwen/Qwen3-8B` 权重。
- 已安装 NVIDIA Container Toolkit 的 Docker，或 Python 3.11 及以上版本和 `uv`。

本节的输出记录于一张 24 GB NVIDIA L4。每段输出都标明了对应的捕获文件，可逐行对照。

## 检查 GPU

先确认驱动能识别 GPU：

```bash
nvidia-smi
```

输出会显示 GPU 型号和驱动版本。如果系统找不到该命令，先安装 NVIDIA 驱动。没有驱动，SGLang 无法启动。

## 安装 SGLang

选择一种安装方式。只有 GPU 驱动的机器适合用 Docker；如果机器已安装完整 CUDA 工具包（包括 `nvcc`），可以使用 uv。

在只有驱动的 L4 主机上，`pip install sglang==0.5.22` 虽然没有报错，但随后启动服务时连续遇到四种不同的工具包缺失错误。[第 7.1 节](#s-operating-sglang)列出这四个错误和对应的修复方法。

### 使用 Docker

拉取本手册验证的版本：

```bash
docker pull lmsysorg/sglang:v0.5.22
```

这里固定了版本标签。`latest` 会随新版本移动，而每个新版本都可能改变默认值。

### 使用 uv

创建环境并安装指定版本的 SGLang：

```bash
uv venv --python 3.12
source .venv/bin/activate
uv pip install --prerelease=allow "sglang==0.5.22"
```

保留 `--prerelease=allow`。SGLang 的某些依赖只发布预发行版；较旧的 uv 如果没有这个选项，可能悄悄安装 SGLang 0.5.9 {{docs}}。

检查版本：

```bash
sglang version
```

```listing
title: 已安装的版本
source: capture/gpu/out-gb10/sglang-version.txt
lang: text
---
$ sglang version
sglang version: 0.5.22
git revision: N/A
```

如果显示的是其他版本，说明安装过程选中了别的发布版。重新运行固定版本的安装命令。

## 启动服务

在安装 SGLang 的环境中启动服务。下面是我们记录的 L4 命令：

```bash
sglang serve --model-path Qwen/Qwen3-8B --host 127.0.0.1 --port 30000 \
  --enable-cache-report --enable-metrics --mem-fraction-static 0.85
```

使用 Docker 时，可以在容器中运行相同的服务命令。挂载 Hugging Face 缓存后，权重只需下载一次：

```bash
docker run --rm --gpus all --ipc=host --shm-size 32g -p 127.0.0.1:30000:30000 \
  -v "$HOME/.cache/huggingface:/root/.cache/huggingface" \
  lmsysorg/sglang:v0.5.22 \
  sglang serve --model-path Qwen/Qwen3-8B --host 0.0.0.0 --port 30000 \
  --enable-cache-report --enable-metrics --mem-fraction-static 0.85
```

记录中的运行使用 uv。Docker 命令参考了 SGLang 安装文档 {{docs}}。容器内的服务使用 `--host 0.0.0.0` 才能从容器外访问；`-p` 中的 `127.0.0.1:` 则将端口限制在本机。服务没有配置 API key，因此不要把它暴露到公网网卡。

命令中的三个选项是我们的选择：

- `--enable-cache-report` 会在每个响应中加入 `cached_tokens`。不启用时，客户端无法看到自己的请求命中了多少缓存。
- `--enable-metrics` 会开启 `/metrics` 端点，[第 1.2 节](#s-check-that-the-server-is-healthy)会检查它。
- `--mem-fraction-static 0.85` 用于设置 SGLang 可以使用的 GPU 显存比例。[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)会说明如何选这个值。

首次启动会下载权重。之后服务会规划显存并准备内核。等待日志出现最后一行：

```listing
title: 我们的 L4 服务启动日志
source: capture/gpu/out-l4/server-default.log
lang: text
note: 从启动日志截取五行；其间的导入、下载和警告信息略去。
---
[2026-10-17 14:42:45] KV Cache is allocated. dtype: torch.bfloat16, #tokens: 22939, K size: 1.58 GB, V size: 1.58 GB
…
[2026-10-17 14:43:36] max_total_num_tokens=22939, chunked_prefill_size=4096, max_prefill_tokens=16384, max_running_requests=2048, context_len=40960, available_gpu_mem=1.31 GB
…
[2026-10-17 14:43:36] Tree cache initialized: source=default impl=UnifiedRadixCache hybrid_swa=False hybrid_ssm=False hicache_attached=False
[2026-10-17 14:43:37] Engine startup timings (s): load_weight=3.73, kv_cache_allocation=0.40, scheduler_e2e=59.11, cuda_graph={prefill=48.33, decode=2.61, target_verify=0.00, draft_prefill=0.00, draft_decode=0.00, draft_extend=0.00}, tokenizer_e2e=69.10
…
[2026-10-17 14:43:38] The server is fired up and ready to roll!
```

权重已在磁盘上，所以加载只花了 3.73 秒；但启动仍约需一分钟，其中 48.33 秒用于捕获 prefill 的 CUDA graph。同一台机器再次启动时，可以复用 `~/.cache/sglang` 中编译好的内核。

### 服务启动失败时

查看日志最后一行错误，再按现象排查：

- **日志提到 `Python.h`、`nvcc` 或 `-lcudart`。** 主机缺少完整 CUDA 工具包。使用 Docker，或按[第 7.1 节](#s-operating-sglang)修复四个依赖问题。
- **日志报告 GPU 显存不足。** 模型和缓存放不进显存。调低 `--mem-fraction-static`，或换更小的模型。[第 3.2 节](#s-mem-fraction-static-and-startup-sizing)展示了崩溃和修复过程。
- **下载失败。** 检查网络和模型名称。启用 `HF_HUB_OFFLINE=1` 时，模型必须已在本地缓存。
- **其他程序占用了 30000 端口。** 使用 `--port 30001` 启动，并在下文的每个请求中使用相同端口。

## 用 curl 发送请求

打开第二个终端，将请求发送给 SGLang 原生 API：

```bash
curl -s http://127.0.0.1:30000/generate \
  -H 'Content-Type: application/json' \
  -d '{"text": "The capital of France is", "sampling_params": {"max_new_tokens": 12, "temperature": 0}}'
```

我们的 L4 服务返回了以下结果：

```listing
title: 原生 API 返回的答案
source: capture/gpu/out-l4/generate.txt
lang: json
note: 从 /generate 响应截取；省略 token ID、请求 ID，以及 e2e_latency 之外的计时字段。
---
  "text": " Paris. The capital of Italy is Rome. The capital of",
…
  "meta_info": {
…
    "finish_reason": {
      "type": "length",
      "length": 12
…
    "prompt_tokens": 5,
…
    "completion_tokens": 12,
    "cached_tokens": 2,
…
    "e2e_latency": 0.7252887019421905,
```

温度设为 0 时，`Qwen/Qwen3-8B` 可能会生成与记录完全相同的文本。回答在 12 个 token 后停止，因为请求就要求生成 12 个；`finish_reason` 显示停止原因为 `length`。

五个 prompt token 中有两个已在缓存里。启动时服务先向自己发送了 “The capital city of France is”。我们的请求与预热 prompt 前两个 token 相同，所以前缀缓存跳过了它们。

## 用 OpenAI API 发送相同的问题

大多数客户端使用 OpenAI 聊天 API，SGLang 在同一个端口提供了该接口。先用 curl 发送聊天请求：

```bash
curl -s http://127.0.0.1:30000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model": "default", "messages": [{"role": "user", "content": "Name one planet. Answer in one word."}], "max_tokens": 64, "temperature": 0, "chat_template_kwargs": {"enable_thinking": false}}'
```

```listing
title: OpenAI 聊天 API 返回的答案
source: capture/gpu/out-l4/generate.txt
lang: json
note: 从 /v1/chat/completions 响应截取；省略 ID、时间戳和元数据块。
---
  "model": "default",
…
      "message": {
        "role": "assistant",
        "content": "Earth",
…
      "finish_reason": "stop",
…
  "usage": {
    "prompt_tokens": 21,
    "total_tokens": 23,
    "completion_tokens": 2,
    "prompt_tokens_details": {
      "cached_tokens": 0
    },
    "reasoning_tokens": 0
```

也可以用 OpenAI 客户端发送相同请求：

```python
from openai import OpenAI

client = OpenAI(base_url="http://127.0.0.1:30000/v1", api_key="none")
response = client.chat.completions.create(
    model="default",
    messages=[{"role": "user", "content": "Name one planet. Answer in one word."}],
    max_tokens=64,
    temperature=0,
    extra_body={"chat_template_kwargs": {"enable_thinking": False}},
)
print(response.choices[0].message.content)
```

脚本会打印响应中的 `content` 字段。记录中的捕获使用 Python 标准库发送相同 JSON，也得到了 `Earth`。服务器没有设置 `--api-key`，因此不会检查 key；请求里的值可以是任意字符串。

```takeaways
- 每次启动都检查 KV 池、max_running_requests 和 tree cache 日志。
- 测量性能前先发送预热请求。
- 启动时添加 --enable-cache-report，让客户端看到 cached_tokens。
- 调试请求时对照日志中的 #new-token 和 #cached-token。
```

Sources: capture/gpu/out-l4/server-default.log, capture/gpu/out-l4/generate.txt; SGLang 0.5.22 源码与安装文档。
