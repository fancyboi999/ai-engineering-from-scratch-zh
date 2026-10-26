# sgl-model-gateway 与缓存感知路由

> 运行多台服务器时，路由器决定缓存命中率，因此应将每段对话送回已经持有其前缀的服务器。

你启动第二台服务器，希望容量翻倍。吞吐量上升，长对话的首 token 时间却变差。每台服务器都有自己的 KV 缓存，聊天第 5 轮却落到没见过前 1 至 4 轮的服务器，它就要重新 prefill 整段历史。[第 3.4 节](#s-prefix-friendly-prompts)测量了单服务器前缀未命中的代价。忽略前缀的路由器会主动制造这种未命中。

读完本节，你能解释 `sgl-model-gateway` 如何为每个请求选择服务器。你也能按流量选择路由策略，并检查网关能否保持命中率。

## 请求在两个位置被路由 {#s-sgl-model-gateway-two-places-where-requests-get-routed}

SGLang 在两个位置路由请求，默认行为不同。

**单服务器内部：** `--dp-size` 大于 1 时，数据并行控制器把请求交给各副本。其默认方法 `auto` 在非分离模式下解析为 `round_robin` {{code}}。轮询忽略前缀，如[图 6.1b](#fig-6-1b)所示。

**多服务器前方：** `sgl-model-gateway` 是独立的 Rust 程序，向多台 SGLang 服务器路由。它原名 `sgl-router`，PR [#14312](https://github.com/sgl-project/sglang/pull/14312) 于 2025-12-05 为减少混淆而重命名。默认策略为 `cache_aware` {{code}}。

一份实践报告展示了差异。Jarvislabs 发现，默认路由依次把请求发往下一张 GPU，不考虑对话缓存的位置 {{field Jarvislabs 2026-08}}。

他们的流量中，23% 的输入 token 被重复计算。增加一个将对话固定到同一 GPU 的请求头后，缓存命中率从 64.7% 提升至 92.1%，TTFT 中位数减半。[文章](https://jarvislabs.ai/blog/managed-endpoints)没有指出哪个组件执行轮询。服务器内部的默认行为符合其描述。

## cache_aware 如何选择服务器 {#s-sgl-model-gateway-how-cache-aware-picks-a-server}

网关为每个模型保存一棵近似 radix tree。每个节点记录哪些服务器见过该前缀。树保存请求文本的字符，而非 token，因此网关路由时不运行分词器 {{code}}。

**匹配率：** 新请求与树匹配的字符数，除以请求长度。

```figure
id: fig-6-4
kind: decision
title: cache_aware 如何选择服务器
claim: 网关先检查负载均衡，只有请求文本超过 30% 匹配时，才将请求发往匹配最长的服务器。
caption: 从上往下读。琥珀色框表示判断，蓝色框表示结果，两种结果都会将请求文本插入树。默认值来自 v0.5.22 的网关命令行。
```

每个请求的 `select_worker` 执行三步 {{code}}：

1. 检查均衡。最繁忙服务器的负载同时比最空闲者多出 64 以上，且超过其 1.5 倍时，系统判为不均衡。此时请求发往负载最小的服务器。
2. 否则计算匹配率。大于 0.3 时，发往匹配最长的服务器。
3. 小于 0.3 时，发往负载最小的服务器；相同负载之间随机选择。

随后，网关将请求文本插入所选服务器的树下。后台任务每 120 秒删除最久未使用的叶节点，直到每棵树不超过 67,108,864 个节点 {{code}}。

策略文件顶部注释称，低匹配请求会发往树最小的 worker。代码实际选择负载最小的 worker。以代码为准，本手册描述代码行为。

## 树只是估计 {#s-sgl-model-gateway-the-tree-is-a-guess}

网关不会询问服务器缓存了什么。树记录文本发往何处，而服务器之后可能驱逐该前缀。因此，网关可能将请求发往已经不再持有前缀的服务器。该请求就会像其他未命中一样重新 prefill。应通过[第 5.2 节](#s-the-metrics-endpoint)的 `sglang:cache_hit_rate` 检查服务器命中率，不能只看路由决策。

## 关键设置 {#s-sgl-model-gateway-settings-that-matter}

| 参数 | 默认值 | 作用 |
|---|---|---|
| `--policy` | `cache_aware` | 还支持 `random`、`round_robin`、`power_of_two`、`prefix_hash`、`manual` |
| `--cache-threshold` | 0.3 | 超过该匹配率时优先考虑前缀亲和性 |
| `--balance-abs-threshold` | 64 | 判定系统不均衡的负载差 |
| `--balance-rel-threshold` | 1.5 | 判定系统不均衡的负载比 |
| `--eviction-interval` | 120 | 两次树清理间隔秒数 |
| `--max-tree-size` | 67108864 | 每个模型保留的树节点数 |
| `--prometheus-port` | 29000 | 网关自身的指标端口 |
| `--request-timeout-secs` | 1800 | 网关等待单个请求的最长秒数 |

默认值均来自 v0.5.22 发布版中的网关源码 {{code}}。源码版本号为 0.3.2。仓库最新网关标签 `gateway-v0.3.1` 指向 2026-01-08 的提交。应按实际运行的提交固定网关，不能依赖该标签。

源码还包含 `bucket` 和 `consistent_hashing` 策略，但 v0.5.22 命令行不接受它们。两台普通服务器的启动命令为 `python -m sglang_router.launch_router --worker-urls http://127.0.0.1:30000 http://127.0.0.1:30001 --policy cache_aware`。

## 我们的建议 {#s-sgl-model-gateway-our-position}

聊天和 agent 流量的各轮共享长前缀，使用 `cache_aware`。prompt 各不相同的批处理流量使用 `power_of_two` 或 `round_robin`，因为匹配率低于 0.3 本来也不会提供亲和性。不要将多轮流量放在默认轮询的服务器内 `--dp-size` 后面。改为在网关后运行独立服务器，或设置其他 `--load-balance-method`。

SGLang 团队在 v0.4 引入缓存感知路由器 {{team 2024-12}}。团队报告吞吐量最高达到 1.9 倍，命中率达到 3.8 倍。这是他们在自身负载下的数字。你应测量修改前后的自身命中率。

## 将路由器与引擎一起固定 {#s-sgl-model-gateway-pin-the-router-with-the-engine}

一名用户报告，在 GB200 NVL72 上用 SGLang 运行 DeepSeek-R1 时，吞吐量退化两倍（[issue #22095](https://github.com/sgl-project/sglang/issues/22095)）。退化实际来自 SGLang 外部的路由器。同一 SGLang 构建下，Dynamo router 0.8.1 为每秒 132,140 token，1.0.0 为 69,767。应将路由器和引擎作为一个系统测试，并固定两者版本。

第二起事故说明路由会与服务发现相互影响。采用分离模式和 Kubernetes 服务发现时，`cache_aware` 报错 `Failed to select prefill/decode worker`，用户改用轮询（[issue #10608](https://github.com/sgl-project/sglang/issues/10608)）。issue 已关闭，但我们找不到对应修复。依赖一种策略前，先测试自己的具体部署模式。

## 要测量什么 {#s-sgl-model-gateway-what-to-measure}

变更策略前后，比较每台服务器的 `sglang:cache_hit_rate`。查看网关 29000 端口的指标，观察重试和断路器打开情况。网关默认最多重试失败请求 5 次，服务器失败 10 次后打开其断路器 {{code}}。TTFT 上升且命中率下降，表示请求不再到达持有其前缀的服务器。生产网关的更多内容见 [AI 网关课程](phases/17-infrastructure-and-production/19-ai-gateways)。

```takeaways
- 聊天流量应将多台 SGLang 服务器放在采用 cache_aware 的 sgl-model-gateway 后。
- 多轮对话避免使用服务器内部轮询数据并行。
- prompt 不共享长前缀时，使用 power_of_two 或 round_robin。
- 检查服务器的 sglang:cache_hit_rate，因为网关树只是估计。
- 一起测试并固定路由器和引擎。
```

来源：sgl-model-gateway/src/main.rs、sgl-model-gateway/src/policies/cache_aware.rs、sgl-model-gateway/Cargo.toml、python/sglang/srt/arg_groups/serving_hook.py (handle_load_balance_method) 和 python/sglang/srt/managers/data_parallel_controller.py，均为 v0.5.22。PR #14312，issue #22095 和 #10608。Jarvislabs，Managed Endpoints，2026-08-26。LMSYS，SGLang v0.4，2024-12-04。
