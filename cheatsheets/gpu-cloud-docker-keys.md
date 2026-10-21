---
id: gpu-cloud-docker-keys
title: GPU、云、Docker 与 API 密钥
code: GC
subtitle: 检查 GPU，按显存选择模型，在 Docker 中运行 CUDA，存储 API 密钥并排查 API 错误。
hue: 135
sources: phases/00-setup-and-tooling/03-gpu-setup-and-cloud, phases/00-setup-and-tooling/04-apis-and-keys, phases/00-setup-and-tooling/07-docker-for-ai
source_hash: 4f0c7ea6d2cf88ee
---

## 在哪里运行
type: defaults
from: phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| 本地 NVIDIA GPU | $0 | 安装 CUDA + cuDNN，适合经常使用和大数据集 |
| Google Colab（免费层） | $0 | Runtime > Change runtime type > T4 GPU |
| 云 GPU（Lambda、RunPod、Vast.ai） | $0.20-2.00/小时 | SSH 连接后安装，适合正式训练 |
| CPU | 第 1-3 阶段 | 大多数课程可在 CPU 上顺利运行 |
| fp16 经验规则 | 每个参数 2 字节 | 为激活保留余量 |

## 检查 GPU
type: annotated-code
lang: python
from: phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md, phases/00-setup-and-tooling/03-gpu-setup-and-cloud/code/gpu_check.py

```python
torch.cuda.is_available()                     # False 表示没有 GPU
torch.version.cuda                            # PyTorch 的 CUDA 版本
torch.cuda.get_device_name(0)                 # GPU 名称
props = torch.cuda.get_device_properties(0)
vram_gb = props.total_memory / 1e9            # 显存，单位 GB
params_fp16 = vram_gb * 1e9 / 2               # fp16 最大参数量
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
torch.cuda.synchronize()                      # 在 GPU 计时前后调用
```

## 存储和使用 API 密钥
type: flow
from: phases/00-setup-and-tooling/04-apis-and-keys/docs/zh.md, phases/00-setup-and-tooling/04-apis-and-keys/code/first_api_call.py, phases/00-setup-and-tooling/04-apis-and-keys/code/first_api_call.ts

1. **Shell**：`export ANTHROPIC_API_KEY="sk-ant-..."`。不要将密钥写入代码。
2. **.env 文件**：`ANTHROPIC_API_KEY=sk-ant-...`。将 `.env` 加入 `.gitignore`。
3. **SDK**：`anthropic.Anthropic()` 从环境中读取密钥。
4. **请求**：端点、密钥，以及包含 `model`、`max_tokens`、`messages` 的正文。
5. **响应**：包含 `content`、`usage` 和 `stop_reason` 的 JSON。

## 第一次 SDK 调用
type: annotated-code
lang: python
from: phases/00-setup-and-tooling/04-apis-and-keys/docs/zh.md, phases/00-setup-and-tooling/04-apis-and-keys/code/first_api_call.py

```python
client = anthropic.Anthropic()
MODEL = os.environ.get("LLM_MODEL", "claude-sonnet-5")   # 模型标识
response = client.messages.create(
    model=MODEL,
    max_tokens=256,
    messages=[{"role": "user", "content": "<prompt>"}]
)
print(response.content[0].text)                          # 回复文本
response.usage.input_tokens, response.usage.output_tokens  # 计费 token
```

## 原始 HTTP 调用
type: defaults
from: phases/00-setup-and-tooling/04-apis-and-keys/docs/zh.md, phases/00-setup-and-tooling/04-apis-and-keys/code/first_api_call.py, phases/00-setup-and-tooling/04-apis-and-keys/code/first_api_call.ts

| 设置 | 默认值 | 说明 |
|---|---|---|
| 端点 | `https://api.anthropic.com/v1/messages` | `method="POST"` |
| `x-api-key` | `ANTHROPIC_API_KEY` | 密钥请求头 |
| `anthropic-version` | `2023-06-01` | 版本请求头 |
| `LLM_MODEL` | `claude-sonnet-5` | 不带日期的 Sonnet 别名 |
| `max_tokens` | 256 | 课程中的值 |
| `MOCK` | `"1"` | TypeScript 移植版此时跳过网络 |

## API 错误
type: troubleshooting
from: phases/00-setup-and-tooling/04-apis-and-keys/outputs/prompt-api-troubleshooter.md, phases/00-setup-and-tooling/04-apis-and-keys/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| 401 Unauthorized | 密钥错误或缺失 | 确认 ANTHROPIC_API_KEY 已设置且属于当前服务；不要打印密钥内容 |
| 403 Forbidden | 无端点或模型权限 | 检查密钥权限 |
| 429 Too Many Requests | 触发限流 | 等待重试，或降低频率 |
| 400 Bad Request | 请求正文格式错误 | 检查字段、模型名与消息格式 |
| 500/502/503 | 服务端问题 | 等一分钟后重试 |
| 超时 | 请求耗时过长 | 减少 max_tokens 或使用流式响应 |
| 连接被拒绝 | 基础 URL 或网络错误 | `curl -I https://api.anthropic.com` |

## 安装 Docker 并接入 GPU
type: command-table
from: phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md
span: 2

| 命令 | 作用 |
|---|---|
| `curl -fsSL https://get.docker.com \| sh` | 在 Ubuntu 安装 Docker |
| `sudo usermod -aG docker $USER` | 无需 sudo 使用 Docker，注销后重新登录 |
| `docker run hello-world` | 验证安装 |
| `sudo apt-get install -y nvidia-container-toolkit` | 为 Linux 容器提供 GPU 访问 |
| `sudo nvidia-ctk runtime configure --runtime=docker` | 注册运行时，再执行 `sudo systemctl restart docker` |
| `docker run --rm --gpus all nvidia/cuda:12.4.1-base-ubuntu22.04 nvidia-smi` | 在容器中测试 GPU |

## 基础镜像
type: defaults
from: phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md

| 设置 | 默认值 | 说明 |
|---|---|---|
| `nvidia/cuda:12.4.1-devel-ubuntu22.04` | ~4 GB | 包含 flash-attn、bitsandbytes 所需的 nvcc |
| `nvidia/cuda:12.4.1-runtime-ubuntu22.04` | ~1.5 GB | 预编译代码，不含编译器 |
| `pytorch/pytorch:2.6.0-cuda12.4-cudnn9-runtime` | ~6 GB | 已安装 PyTorch |
| `python:3.12-slim` | ~150 MB | 无 CUDA，仅 CPU |

## 构建并运行开发镜像
type: annotated-code
lang: bash
from: phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md, phases/00-setup-and-tooling/07-docker-for-ai/code/Dockerfile

```bash
docker build -t ai-dev -f phases/00-setup-and-tooling/07-docker-for-ai/code/Dockerfile .
docker run --rm -it --gpus all \
    -v $(pwd):/workspace \               # 你的代码
    -v ~/models:/models \                # 重建后模型仍保留
    -p 8888:8888 \                       # Jupyter 端口
    ai-dev jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser --allow-root
```

## Compose 服务栈
type: architecture
from: phases/00-setup-and-tooling/07-docker-for-ai/code/docker-compose.yml, phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md

```arch
node | host | 1,1 | 主机目录 | ~/models、~/datasets、仓库 | store
node | dev | 2,1 | ai-dev | Jupyter 端口 8888，nvidia GPU | gpu
node | qd | 3,1 | qdrant | qdrant/qdrant:v1.12.5 | store
node | vol | 3,2 | qdrant_data | /qdrant/storage | store
edge | host | dev | 卷
edge | dev | qd | http://qdrant:6333
edge | qd | vol | 卷
```

## Docker 任务
type: task-table
from: phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md

| 任务 | 代码 |
|---|---|
| 启动服务栈 | `docker compose up -d` |
| 停止并删除卷 | `docker compose down -v` |
| 进入服务 Shell | `docker compose exec ai-dev bash` |
| 镜像大小 | `docker images` |
| 回收磁盘空间 | `docker system prune -a` |
| 容器中的 GPU | `docker exec -it <container_id> nvidia-smi` |
| 跟踪日志 | `docker logs -f <container_id>` |

## Docker 问题修正
type: troubleshooting
from: phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `No matching distribution found for torch==2.6.0+cu124` | Mac 选择了 arm64 镜像 | `FROM --platform=linux/amd64` |
| Mac 或 CPU 机器无 GPU | 没有 CUDA | 移除 `--gpus all` 与 NVIDIA 部署区块 |
| 停止后 14 GB 模型消失 | 没有挂载卷 | `-v ~/models:/models` |
| 主机无法访问服务 | 绑定了 localhost | 使用 `host="0.0.0.0"` 和 `-p 5000:5000` |

## 提示
type: tips
from: phases/00-setup-and-tooling/03-gpu-setup-and-cloud/docs/zh.md, phases/00-setup-and-tooling/04-apis-and-keys/docs/zh.md, phases/00-setup-and-tooling/07-docker-for-ai/docs/zh.md

- 计时第二次 GPU 运行，首次包含启动成本。
- 相信基准测试前，先在 Colab 中运行 `!nvidia-smi`。
- 课程需要时再配置相应 API 密钥。
- SDK 调用失败时，阅读原始 HTTP 请求。
- 将新包加入 Dockerfile 后重建，未变的层使用缓存。
