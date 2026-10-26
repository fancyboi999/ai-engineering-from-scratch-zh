# 在生产环境运行 vLLM

> vLLM 每两周左右发布一次，因此要固定镜像版本，并为冷启动和升级做好计划。

你的服务器必须能够应对重启和升级。读完本节，你可以部署启动更快、升级更安全的服务器。

## 固定镜像版本 {#s-run-vllm-in-production-pin-the-image}

固定使用明确版本，例如 vllm/vllm-openai:v0.31.0，不要使用 latest。vLLM 大约每两周发布一个次版本，每次发布都可能改变默认值或移除参数。例如，在 0.30 到 0.32 之间：

- 0.31 中，--enforce-eager 也会跳过 kernel 预热。
- 0.31 将一个 Mamba 前缀缓存参数改了名称，并移除了慢速 tokenizer 模式。
- 0.32 移除了 Python 3.10 支持，并将默认 CORS 来源从允许所有来源改成不允许任何来源。

最后一项会导致直接调用服务器的浏览器客户端失败。升级到 0.32 后，应使用 --allowed-origins 设置可信来源。

## 规划冷启动 {#s-run-vllm-in-production-plan-for-the-cold-start}

启动的三个主要耗时阶段是权重加载、编译和 CUDA graph 捕获。在我们的 DGX Spark 上，加载 57 GiB 权重就用了 330 秒。

- **权重。** 将权重放在本地磁盘。网络挂载或首次下载都会让每次启动变慢。
- **编译。** vLLM 会将编译后的代码缓存在 ~/.cache/vllm。将该目录放在持久卷上，让重启时可以复用缓存。
- **预加载。** 0.31 新增 vllm preload，可在服务器需要模型前先加载并预热。

vllm bench startup 可以分别测量冷启动和热启动。每个新镜像都应运行一次。

我们没有在自己的硬件上测量，也没有测试保留编译缓存后的热启动时间。

## 接收流量前检查健康状态 {#s-run-vllm-in-production-check-health-before-traffic}

使用 /health 作为存活探针。就绪检查则发送一个简短的真实请求，确认 engine 能生成内容。两个探针的启动延迟都要长于实际测得的冷启动时间。

## 安全关闭服务器 {#s-run-vllm-in-production-shut-down-cleanly}

向服务器进程发送 SIGTERM，不要强制结束进程。关闭前先从负载均衡器中移除 Pod，阻止新请求到达。为 Pod 设置的宽限期至少要与最长请求一样长。强制结束会中断所有正在运行的请求。

## 按顺序调整设置 {#s-run-vllm-in-production-change-settings-in-this-order}

每次只调整一项设置，每次调整后都测量：

1. 内存：最大长度和内存比例。
2. 并发量：--max-num-seqs 和 token 预算。
3. 数据类型：先试 FP8 KV cache，再试 FP8 权重。
4. 加速功能：speculative decoding 和编译级别。

后面的步骤依赖前面的设置。如果服务器内存不足，在这种服务器上测量加速功能，测到的其实是内存不足的影响。

## 查看安全公告 {#s-run-vllm-in-production-read-the-security-advisories}

0.31 和 0.32 前后几周，vLLM 项目发布了数十条安全公告，其中多条评级较高。许多问题与多模态输入有关，另有一些涉及 KV transfer connector。不要在没有 gateway 的情况下将服务器暴露到互联网。应像[服务器选项](#s-set-the-server-options-every-deployment-needs)一节所示设置 --api-key，并在选择版本前阅读安全公告。

```takeaways
- 固定镜像的准确版本，每次升级前阅读破坏性变更。
- 将权重和编译缓存放在本地持久存储中。
- 使用 /health 检查存活状态，用真实请求检查就绪状态；排空流量后再发送 SIGTERM。
- 选择版本前阅读安全公告。
```

来源：v0.30.0、v0.31.0 和 v0.32.0 发布说明，vllm-project/vllm GitHub 安全公告（2026-09-21 至 2026-10-21），vLLM 0.31.0 文档（docs/design/torch_compile.md、docs/serving/online_serving/openai_compatible_server.md），vLLM 0.31.0 源码（vllm/benchmarks/startup.py），capture/gpu/out-gb10/server-load-vllm.log。
