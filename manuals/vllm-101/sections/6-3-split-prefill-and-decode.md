# 拆分 prefill 和 decode

> 只有在长提示词拖慢其他用户的流式输出时，拆分 prefill 和 decode server 才值得付出额外成本。

长提示词会拖慢所有用户的流式输出。读完本节，你可以判断何时值得使用分离式服务。

## 了解要解决的问题 {#s-split-prefill-and-decode-know-the-problem-it-solves}

在一台服务器上，长提示词会与正在运行的流式请求共用每个执行步骤。计算提示词期间，每条流都要多等一会儿才能获得下一个 token。长提示词多时，所有用户的最大 token 间隔都会变长。

分离式服务使用两类服务器：prefill server 计算提示词并创建 KV cache；decode server 接收缓存并生成答案。这样，长提示词就不会和流式生成共用一个执行步骤。

## 了解它不能解决什么问题 {#s-split-prefill-and-decode-know-what-it-does-not-solve}

vLLM 文档指出，分离式 prefill 不会提高吞吐量。它能将首 token 延迟和流式输出延迟作为两个独立指标来控制，也能控制 token 间隔的尾部延迟。代价是每个请求都要传输 KV cache，还要运行更多服务器。

即使是降低尾部延迟，效果也有条件，并非默认收益。论文《Revisiting Disaggregated Large Language Model Serving for Performance and Energy Implications》比较了拆分服务器和同时运行两个阶段的服务器。研究发现，这种方案不保证有收益；效果取决于请求负载以及 KV cache 的传输路径。我们没有自行测量。

如果 token 间隔的 99 百分位数很重要，且长提示词是原因，可以考虑这种方案。不要用它来让相同 GPU 容纳更多用户。保留方案前，应在真实负载下，将它与相同 GPU 上的普通服务器比较。

## 配置分离式服务 {#s-split-prefill-and-decode-set-it-up}

每个服务器都要通过 --kv-transfer-config 设置 KV connector 和角色。常见选择是 NIXL connector。它需要 vLLM wheel 不会安装的 NIXL 库，因此要先将其安装到与 vLLM 相同的环境。vLLM 0.31.0 依赖固定为 1.4.1：

```bash
uv pip install nixl==1.4.1
```

Prefill server 生成 KV cache，decode server 使用该缓存。在同一台有两块 GPU 的主机上，为每个服务器分配独立 GPU、端口和 NIXL side channel 端口：

```bash
CUDA_VISIBLE_DEVICES=0 VLLM_NIXL_SIDE_CHANNEL_PORT=5600 \
vllm serve Qwen/Qwen3-8B --port 8100 \
  --kv-transfer-config '{"kv_connector": "NixlConnector", "kv_role": "kv_producer"}'
```

```bash
CUDA_VISIBLE_DEVICES=1 VLLM_NIXL_SIDE_CHANNEL_PORT=5601 \
vllm serve Qwen/Qwen3-8B --port 8200 \
  --kv-transfer-config '{"kv_connector": "NixlConnector", "kv_role": "kv_consumer"}'
```

两个服务器的启动日志都会出现 Creating v1 connector with name: NixlConnector 和 Initializing NIXL wrapper。如果日志显示 NIXL is not available，说明环境中缺少该库。

接着在前面部署 router。每个请求先发给 prefill server，再从响应中读取 KV 传输参数。随后 router 使用这些参数，将请求发给 decode server，以便后者加载缓存。vLLM 仓库包含这种配置的示例脚本和 proxy，其 CI 会在两块 L4 GPU 上测试。

KV cache 传输失败时，默认策略会让请求失败。也可以将 kv_load_failure_policy 字段设为 recompute，让 decode server 重新计算提示词。

我们没有在自己的硬件上测量，也没有用两块 L4 GPU 运行 vLLM 分离式服务。

```figure
id: fig-6-3
kind: flow
title: 在两台服务器上运行 prefill 和 decode
claim: Prefill server 负责计算提示词，KV connector 将缓存传给 decode server，由后者生成 token。
caption: 青绿色箭头表示 KV cache 的传输；点线箭头表示 token 流。来源：vLLM 0.31.0 文档。
```

## 规划两侧的资源 {#s-split-prefill-and-decode-size-the-two-sides}

Prefill 和 decode server 的数量比例取决于提示词长度和答案长度。长提示词、短答案需要更多 prefill 资源；短提示词、长答案需要更多 decode 资源。分别测量两侧的首 token 和流式生成指标，每次只增加一台服务器。

```takeaways
- 拆分 prefill 和 decode 是为了让长提示词不拖慢流式输出，不是为了提高吞吐量。
- 每台服务器都需要 KV connector 和角色，router 会将请求依次发给两者。
- 设置失败策略，因为默认策略会让请求失败。
- 保留分离式服务前，在真实负载下将它与相同 GPU 上的普通服务比较。
```

来源：vLLM 0.31.0 文档（docs/features/disagg_prefill.md、docs/features/nixl_connector_usage.md），vLLM 0.31.0 源码（vllm/config/kv_transfer.py、vllm/distributed/kv_transfer/），vLLM 0.31.0 CI 配置（.buildkite），论文《Revisiting Disaggregated Large Language Model Serving for Performance and Energy Implications》（arXiv 2601.08833），v0.31.0 的 requirements/kv_connectors.txt，vLLM 0.31.0 源码（vllm/distributed/kv_transfer/kv_connector/factory.py、vllm/distributed/kv_transfer/kv_connector/v1/nixl/base_worker.py）。
