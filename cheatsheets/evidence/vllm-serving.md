# Evidence: cheatsheets/vllm-serving.md
upstream_revision: 3f9715c62a3bedcffb68a260f1a65ee2dd9cc10a

本表由中文维护者根据冻结的英文手册整理。路径与行号属于该上游版本，不是中文行号；本次未重新运行这些 GPU 测量。

## 启动服务
- uv venv --python 3.12 --seed   # 创建独立 Python 环境：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:36
- source .venv/bin/activate     # 激活环境：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:37
- uv pip install vllm==0.31.0 --torch-backend=auto   # 固定版本并选择匹配的后端：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:38
- vllm serve Qwen/Qwen3-0.6B --reasoning-parser qwen3 2>&1 | tee server.log   # 保存启动日志：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:67

## 请求与探测
- 检查安装版本 / `vllm --version`：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:58
- 检查服务健康 / `curl -i http://localhost:8000/health`：manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md:12
- 查询已加载模型 / `curl http://localhost:8000/v1/models`：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:148
- 发送对话请求 / `POST /v1/chat/completions`：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:116
- 读取回答 / `choices[0].message.content`：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:121

## 常用服务选项
- `VLLM_API_KEY` / 从环境变量读取 API key，避免出现在进程参数中。：manuals/vllm-101/sections/1-4-set-the-server-options-every-deployment-needs.md:30
- `--api-key` / 对受保护路由要求 Authorization 请求头。：manuals/vllm-101/sections/1-4-set-the-server-options-every-deployment-needs.md:30
- `--max-model-len` / 限制单个请求可用的上下文长度。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:87
- `--num-gpu-blocks-override` / 手动设置 KV 块数；用于固定池大小的对照实验。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:60

## 一次请求的检查顺序
- 版本 确认日志版本与安装时固定的版本一致。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:94
- 模型加载 读取权重内存与加载时间。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:97
- KV 池 读取剩余 KV 内存和池内 token 数。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:98
- 就绪 等待 `Application startup complete.`，然后查询健康端点。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:101
- 生成 发送实际生成请求，核对回答与 token 用量。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:113

## KV 容量计算
- 每个 token 层数 × KV 头数 × 头维度 × 2 × 每个值的字节数。2 表示 K 与 V。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:14
- BF16 与 FP8 BF16 每个值占 2 字节，FP8 KV 每个值占 1 字节。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:17
- 并发容量 KV 池 token 数除以每个用户的 prompt 与输出 token 总数。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:39
- 日志并发数 按完整最大上下文计算；真实请求更短时，可容纳更多用户。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:73

## 冻结测量中的数值
- Qwen3-8B 每 token KV / 144 KiB / 36 层、8 个 KV 头、头维度 128，BF16：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:21
- Qwen3-30B-A3B 每 token KV / 96 KiB / 48 层、4 个 KV 头、头维度 128，BF16：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:22
- L4 固定 KV 池 / 24,096 tokens / 上游用于引擎对照的手动固定池：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:60
- 每个用户 640 tokens / 37 users / 对上述固定池按完整请求长度估算：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:73

## 监控入口
- `/health` 检查服务与引擎是否健康。：manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md:12
- `/metrics` 读取 Prometheus 指标，与 API 使用相同端口。：manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md:64
- `vllm:num_requests_waiting` 观察等待队列；需要结合 KV 使用率判断限制来源。：manuals/vllm-101/sections/1-2-check-that-the-server-is-healthy.md:64

## 故障排查
- `Could not find nvcc` / 主机只有驱动，缺少首次编译所需工具链 / 安装 CUDA toolkit 并设置 `CUDA_HOME`。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:60
- `content` 为 null，`finish_reason` 为 `length` / 推理过程用完 `max_tokens` / 提高 token 上限，或为该请求关闭 thinking。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:123
- 请求返回 404 / 请求中的模型名与服务加载的名称不一致 / 查询 `/v1/models`，使用实际模型名。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:148
- 启动时显存不足 / 其他程序占用显存，或模型过大 / 检查显存、缩小模型或调整容量方案。：manuals/vllm-101/sections/1-1-install-vllm-and-serve-your-first-model.md:145

## 访问边界
- 设置 API key 后所有路由都受保护吗？ 不会。该版本保护 `/v1`、`/v2`、`/inference` 与 `/cohere`。：manuals/vllm-101/sections/1-4-set-the-server-options-every-deployment-needs.md:44
- 哪些入口仍开放？ `/health`、`/metrics` 与 `/invocations`。需要结合网络边界配置访问控制。：manuals/vllm-101/sections/1-4-set-the-server-options-every-deployment-needs.md:44

## 调优提示
-  先根据模型配置计算 KV 字节数，再选择 GPU 与上下文上限。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:93
-  将 KV 池除以真实用户占用的 token 数，勿直接沿用最大上下文的日志并发数。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:94
-  每次启动保留版本、权重内存和 KV 池大小三类信息。：manuals/vllm-101/sections/2-1-count-the-memory-before-you-pick-a-gpu.md:95
