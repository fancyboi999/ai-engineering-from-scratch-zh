# 在 Kubernetes 上运行 vLLM

> vLLM 上层的平台会提供路由和扩缩容功能，应按需要的功能选择。

你需要在集群中运行多个 vLLM server。读完本节，你可以选择适合在 Kubernetes 上运行 vLLM 的上层平台。

## 从单个 Deployment 开始 {#s-run-vllm-on-kubernetes-start-with-what-one-deployment-gives-you}

vLLM 文档展示了一个基础 Kubernetes 配置：使用 volume 保存权重、使用 Secret 保存 Hugging Face token、使用 Deployment 运行 vllm serve，再配置一个 Service。vLLM 仓库中的小型 Helm chart 将这些组件打包在一起，并可选地添加下载模型的 job 和 Kubernetes autoscaler。

下面是我们编写的单 GPU、单模型最简示例。我们没有在集群上运行它。集群中的 NVIDIA device plugin 必须提供 nvidia.com/gpu 资源。若要访问受限模型，请创建名为 hf-token、包含 token 键的 Secret。再创建名为 vllm-api-key、包含 key 键的 Secret，以保护 /v1 路由。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-qwen3-8b
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm-qwen3-8b
  template:
    metadata:
      labels:
        app: vllm-qwen3-8b
    spec:
      terminationGracePeriodSeconds: 120
      containers:
        - name: vllm
          image: vllm/vllm-openai:v0.31.0
          args: ["Qwen/Qwen3-8B", "--max-model-len", "8192", "--reasoning-parser", "qwen3"]
          ports:
            - containerPort: 8000
          env:
            - name: HF_TOKEN
              valueFrom:
                secretKeyRef:
                  name: hf-token
                  key: token
                  optional: true
            - name: VLLM_API_KEY
              valueFrom:
                secretKeyRef:
                  name: vllm-api-key
                  key: key
          resources:
            limits:
              nvidia.com/gpu: 1
          startupProbe:
            httpGet:
              path: /health
              port: 8000
            periodSeconds: 10
            failureThreshold: 90
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            periodSeconds: 30
            failureThreshold: 3
          volumeMounts:
            - name: hf-cache
              mountPath: /root/.cache/huggingface
            - name: shm
              mountPath: /dev/shm
      volumes:
        - name: hf-cache
          emptyDir: {}
        - name: shm
          emptyDir:
            medium: Memory
            sizeLimit: 2Gi
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-qwen3-8b
spec:
  selector:
    app: vllm-qwen3-8b
  ports:
    - port: 8000
      targetPort: 8000
```

镜像会启动 vllm serve，因此 args 只需包含模型和参数。启动探针每隔 10 秒检查一次，最多 90 次，共 15 分钟。我们的 DGX Spark 首次启动约需 8 分钟，所以应根据自己的冷启动测量设置上限。权重加载期间，这些探针会阻止 Kubernetes 向 Pod 发送流量或重启 Pod。

将 emptyDir 缓存替换为 PersistentVolumeClaim，避免新 Pod 再次下载权重。/dev/shm 上的内存卷提供进程间共享内存，其作用类似 Docker 的 --ipc=host。API key 不会保护 /health 或 /metrics，因此还要用 NetworkPolicy 限制可访问该 Service 的 Pod。

这足以运行同一模型的少量副本。普通 Service 会随机分配请求，所以用户下一轮可能被分配到未缓存前几轮内容的副本。根据 CPU 使用率进行扩缩容也会依赖错误信号，因为 GPU 负载不等于 CPU 负载。

## 按需要的功能选择上层平台 {#s-run-vllm-on-kubernetes-pick-a-layer-for-the-features-you-need}

| 层 | 新增功能 | 适用场景 |
|---|---|---|
| vLLM production stack | Helm chart、保持会话固定到同一副本的 router、通过 LMCache 卸载 KV cache，以及 Grafana dashboard | 希望使用 vLLM 项目提供的参考配置 |
| llm-d | 读取 vLLM 指标和 KV cache 事件来选择副本的 router、prefill 与 decode 拆分、宽规模 expert parallelism | 运行大模型，或要在集群中拆分 prefill 和 decode |
| KServe | 带 vLLM runtime 的模型服务平台，以及基于 llm-d 构建的 LLM resource | 公司已使用 KServe 部署其他模型 |
| AIBrix | 提供路由、LoRA 管理和基于 engine 指标扩缩容的控制平面 | 需要用一个控制平面管理许多模型和 adapter |
| Ray Serve LLM | 在 Ray Serve 中运行 vLLM，并支持多模型服务 | 现有技术栈已使用 Ray |

llm-d 于 2026-10-20 发布 1.0 版本，并于 2026 年 3 月以 sandbox 项目身份加入 CNCF。它的 router 遵循 Gateway API Inference Extension，这是一个用于将请求路由到模型服务器的 Kubernetes 项目。

## 了解上层平台使用的 vLLM 功能 {#s-run-vllm-on-kubernetes-know-which-vllm-features-the-layers-use}

这些平台会读取 vLLM 提供的接口。检查你的 vLLM 版本是否支持平台所需的接口：

- **指标。** Router 会读取 vllm:num_requests_waiting、vllm:num_requests_running 和 vllm:kv_cache_usage_perc 来选择副本。
- **KV cache 事件。** 设置 --kv-events-config 后，vLLM 会发布每个 block 的写入和移除事件。Router 可根据这些事件，将请求发送到缓存了对应前缀的副本。
- **KV connector。** Prefill 和 decode 拆分及共享缓存会使用 --kv-transfer-config。
- **健康检查。** /health 可供启动、存活和就绪探针使用。

我们没有在自己的硬件上测量，没有运行 Kubernetes 集群，也没有应用上方的 manifest。

```takeaways
- 从一个 Deployment、GPU 资源上限和长于冷启动时间的启动探针开始。
- 少量副本可以使用普通 Deployment，但请求会随机路由，扩缩容也会依赖错误信号。
- 根据所需功能选择平台：会话路由、prefill 与 decode 拆分，或多 adapter 管理。
- 检查 vLLM 版本是否支持上层平台使用的指标、事件和 connector。
```

来源：vLLM 0.31.0 文档（docs/deployment/k8s.md、docs/deployment/frameworks/helm.md、docs/deployment/integrations/），llm-d v1.0.0 发布说明和架构文档（2026-10-20），CNCF 关于 llm-d 的公告（2026-03-24），production-stack、AIBrix 和 KServe 文档（2026-10-21 查阅），GB10 启动日志 capture/gpu/out-gb10/server-load-vllm.log（10:53:02 的参数记录，11:00:59 服务就绪），vLLM 0.31.0 源码 vllm/entrypoints/serve/middleware/authenticate.py（密钥只保护 /v1、/v2、/inference 和 /cohere 路径）。
