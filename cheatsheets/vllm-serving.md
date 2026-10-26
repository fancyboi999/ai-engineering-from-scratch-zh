---
id: vllm-serving
title: 使用 vLLM 提供 LLM 服务
code: VS
subtitle: 固定 vLLM 0.31.0，启动模型、计算 KV 容量、检查服务并排查常见失败。测量来自上游手册的冻结记录。
hue: 200
sources: manuals/vllm-101
source_hash: 8e09030c4eb96a8f
---

## 启动服务
type: annotated-code
lang: bash
from: manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md

```bash
uv venv --python 3.12 --seed   # 创建独立 Python 环境
source .venv/bin/activate     # 激活环境
uv pip install vllm==0.31.0 --torch-backend=auto   # 固定版本并选择匹配的后端
vllm serve Qwen/Qwen3-0.6B --reasoning-parser qwen3 2>&1 | tee server.log   # 保存启动日志
```

## 请求与探测
type: task-table
from: manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md, manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md

| 任务 | 命令或字段 |
|---|---|
| 检查安装版本 | `vllm --version` |
| 检查服务健康 | `curl -i http://localhost:8000/health` |
| 查询已加载模型 | `curl http://localhost:8000/v1/models` |
| 发送对话请求 | `POST /v1/chat/completions` |
| 读取回答 | `choices[0].message.content` |

## 常用服务选项
type: command-table
from: manuals/vllm-101/sections/1-4-set-the-server-options-every-deployment-needs.md, manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md

| 选项 | 作用 |
|---|---|
| `VLLM_API_KEY` | 从环境变量读取 API key，避免出现在进程参数中。 |
| `--api-key` | 对受保护路由要求 Authorization 请求头。 |
| `--max-model-len` | 限制单个请求可用的上下文长度。 |
| `--num-gpu-blocks-override` | 手动设置 KV 块数；用于固定池大小的对照实验。 |

## 一次请求的检查顺序
type: flow
from: manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md, manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md

1. **版本**：确认日志版本与安装时固定的版本一致。
2. **模型加载**：读取权重内存与加载时间。
3. **KV 池**：读取剩余 KV 内存和池内 token 数。
4. **就绪**：等待 `Application startup complete.`，然后查询健康端点。
5. **生成**：发送实际生成请求，核对回答与 token 用量。

## KV 容量计算
type: concepts
from: manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md

- **每个 token**：层数 × KV 头数 × 头维度 × 2 × 每个值的字节数。2 表示 K 与 V。
- **BF16 与 FP8**：BF16 每个值占 2 字节，FP8 KV 每个值占 1 字节。
- **并发容量**：KV 池 token 数除以每个用户的 prompt 与输出 token 总数。
- **日志并发数**：按完整最大上下文计算；真实请求更短时，可容纳更多用户。

## 冻结测量中的数值
type: defaults
from: manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md

| 配置或测量 | 数值 | 条件 |
|---|---|---|
| Qwen3-8B 每 token KV | 144 KiB | 36 层、8 个 KV 头、头维度 128，BF16 |
| Qwen3-30B-A3B 每 token KV | 96 KiB | 48 层、4 个 KV 头、头维度 128，BF16 |
| L4 固定 KV 池 | 24,096 tokens | 上游用于引擎对照的手动固定池 |
| 每个用户 640 tokens | 37 个用户 | 对上述固定池按完整请求长度估算 |

## 监控入口
type: glossary
from: manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md, manuals/vllm-101/sections/5-2-watch-vllm-in-production.md

- **`/health`**：检查服务与引擎是否健康。
- **`/metrics`**：读取 Prometheus 指标，与 API 使用相同端口。
- **`vllm:num_requests_waiting`**：观察等待队列；需要结合 KV 使用率判断限制来源。

## 故障排查
type: troubleshooting
from: manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md

| 现象 | 原因 | 修正 |
|---|---|---|
| `Could not find nvcc` | 主机只有驱动，缺少首次编译所需工具链 | 安装 CUDA toolkit 并设置 `CUDA_HOME`。 |
| `content` 为 null，`finish_reason` 为 `length` | 推理过程用完 `max_tokens` | 提高 token 上限，或为该请求关闭 thinking。 |
| 请求返回 404 | 请求中的模型名与服务加载的名称不一致 | 查询 `/v1/models`，使用实际模型名。 |
| 启动时显存不足 | 其他程序占用显存，或模型过大 | 检查显存、缩小模型或调整容量方案。 |

## 访问边界
type: qa
from: manuals/vllm-101/sections/1-4-set-the-server-options-every-deployment-needs.md

- **设置 API key 后所有路由都受保护吗？** 不会。该版本保护 `/v1`、`/v2`、`/inference` 与 `/cohere`。
- **哪些入口仍开放？** `/health`、`/metrics` 与 `/invocations`。需要结合网络边界配置访问控制。

## 调优提示
type: tips
from: manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md, manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md

- 先根据模型配置计算 KV 字节数，再选择 GPU 与上下文上限。
- 将 KV 池除以真实用户占用的 token 数，勿直接沿用最大上下文的日志并发数。
- 每次启动保留版本、权重内存和 KV 池大小三类信息。
