# sgl-model-gateway 与缓存感知路由

> 有多台服务器时，路由器决定缓存命中率，应将每段对话送回已经持有其前缀的服务器。

你启动第二台服务器来扩容。吞吐量上升，长对话的 TTFT 却恶化了。每台服务器有独立 KV 缓存，聊天第 5 轮被送到没见过第 1 至 4 轮的服务器，只好重新 prefill 全部历史。[第 3.4 节](#s-prefix-friendly-prompts) 测了单服务器前缀未命中的代价；忽略前缀的路由器，相当于主动制造这种未命中。

读完本节，你能解释 `sgl-model-gateway` 如何为请求选服务器，根据流量选择策略，并检查网关是否保住了命中率。

## 请求在两处被路由

SGLang 在两个位置路由请求，默认值不同。

**单服务器内部：** `--dp-size` 大于 1 时，数据并行控制器向副本分配请求。默认 `auto` 在非分离场景解析为 `round_robin` {{code}}。轮询忽略前缀，见[图 6.1b](#fig-6-1b)。

**多服务器之前：** `sgl-model-gateway` 是独立 Rust 程序，路由到多台 SGLang 服务器。此前名为 `sgl-router`，2025-12-05 的 [PR #14312](https://github.com/sgl-project/sglang/pull/14312) 为“减少混淆”而重命名。默认策略为 `cache_aware` {{code}}。

一份实践报告展示了其中的差异。Jarvislabs 测得其流量有 23% 的输入 token 被重新计算 {{field Jarvislabs 2026-08}}。加入请求头、将每段对话固定到同一 GPU 后，缓存命中率从 64.7% 提高到 92.1%，TTFT 中位数减半。[报告](https://jarvislabs.ai/blog/managed-endpoints)没有说明轮询来自哪个组件，但结果与服务器内部的默认值相符。

## cache_aware 如何选服务器

网关为每个模型维护一棵近似基数树，每个节点记录哪些服务器见过该前缀。树保存请求文本的字符，而非 token，因此路由时无需运行 tokenizer {{code}}。

**匹配率：** 新请求与树中匹配的字符数，除以请求长度。

```figure
id: fig-6-4
kind: decision
title: cache_aware 如何选择服务器
claim: 网关先检查负载均衡，只有文本匹配超过 30% 时，才将请求发给最长匹配服务器。
caption: 从上往下读。琥珀色框为判断，蓝色框为结果。两种结果都会把请求文本插入树。默认值来自 v0.5.22 网关命令行。
```

每个请求的 `select_worker` 做三件事 {{code}}：

1. 检查均衡。两个条件同时成立则视为不均衡：最繁忙服务器负载比最轻者高 64 以上，且超过最轻者的 1.5 倍。此时请求发给负载最轻服务器。
2. 否则计算匹配率。高于 0.3 时，发给匹配最长的服务器。
3. 低于 0.3 时，发给负载最轻服务器，平局则随机选择。

随后网关将请求文本记录到选中服务器名下。后台任务每 120 秒移除最近最少使用的叶子，直到每棵树不超过 67,108,864 个节点 {{code}}。

策略文件顶部注释称，低匹配请求发给“树大小最小的 worker”，代码却发给负载最轻的 worker。以代码为准，本手册描述代码。

## 这棵树只是估计

网关从不向服务器查询实际缓存。它的树记录发过什么文本，而服务器可能已淘汰该前缀。因此网关可能把请求发给已不再持有前缀的服务器，它随后像其他未命中一样做 prefill。检查服务器端的命中率，使用[第 5.2 节](#s-the-metrics-endpoint) 的 `sglang:cache_hit_rate`，不能只看路由决策。

## 重要设置

| 参数 | 默认值 | 作用 |
|---|---|---|
| `--policy` | `cache_aware` | 另有 `random`、`round_robin`、`power_of_two`、`prefix_hash`、`manual` |
| `--cache-threshold` | 0.3 | 匹配率高于此值时，前缀亲和优先 |
| `--balance-abs-threshold` | 64 | 判定不均衡的负载差 |
| `--balance-rel-threshold` | 1.5 | 判定不均衡的负载比 |
| `--eviction-interval` | 120 | 树清理间隔秒数 |
| `--max-tree-size` | 67108864 | 每模型保留的树节点数 |
| `--prometheus-port` | 29000 | 网关自己的指标端口 |
| `--request-timeout-secs` | 1800 | 网关等待请求的最长秒数 |

所有默认值来自 v0.5.22 发布版中的网关源码 {{code}}，其声明版本为 0.3.2。仓库最新网关标签 `gateway-v0.3.1` 指向 2026-01-08 的提交。应按实际运行的 commit 固定网关，不要按这个标签。

源码还有 `bucket` 和 `consistent_hashing` 策略，但 v0.5.22 命令行不接受它们。两台普通服务器的启动命令为 `python -m sglang_router.launch_router --worker-urls http://127.0.0.1:30000 http://127.0.0.1:30001 --policy cache_aware`。

## 我们的建议

聊天和 agent 流量的多轮对话共享长前缀，使用 `cache_aware`。独立 prompt 的批流量使用 `power_of_two` 或 `round_robin`，因为匹配率低于 0.3 本来也没有亲和收益。多轮流量不要直接放在默认轮询的服务器内 `--dp-size` 后面。改用网关后的独立服务器，或设置其他 `--load-balance-method`。

SGLang 团队在 v0.4 引入缓存感知路由器 {{team 2024-12}}，报告最高 1.9 倍吞吐量、3.8 倍命中率。这是他们自己负载上的数字，应测量自己的策略变更前后命中率。

## 网关与引擎一起固定版本

用户报告 GB200 NVL72 上 DeepSeek-R1 的 SGLang 吞吐量回退一半（[issue #22095](https://github.com/sgl-project/sglang/issues/22095)）。问题却在 SGLang 外的路由器。同一 SGLang 构建，Dynamo router 0.8.1 为每秒 132,140 token，1.0.0 为 69,767。应将网关和引擎作为同一系统测量，并同时固定版本。

另一次事故说明路由与服务发现相互影响。分离部署搭配 Kubernetes 服务发现时，`cache_aware` 报“Failed to select prefill/decode worker”，用户改用轮询（[issue #10608](https://github.com/sgl-project/sglang/issues/10608)）。Issue 已关闭，但我们找不到对应修复。依赖某策略前，测试自己的精确部署模式。

## 应该测什么

更改策略前后，比较每台服务器的 `sglang:cache_hit_rate`。观察端口 29000 上的网关指标，检查重试和熔断。网关默认为失败请求最多重试 5 次，服务器失败 10 次后触发熔断 {{code}}。TTFT 上升、命中率下降，意味着请求不再到达持有前缀的服务器。生产网关更全面的介绍见 [AI 网关课程](phases/17-infrastructure-and-production/19-ai-gateways)。

```takeaways
- 聊天流量使用 cache_aware，将多台 SGLang 服务器放在 sgl-model-gateway 后。
- 多轮对话避免使用服务器内默认轮询数据并行。
- Prompt 没有长共享前缀时，使用 power_of_two 或 round_robin。
- 检查服务器上的 sglang:cache_hit_rate，因为网关树只是估计。
- 网关与引擎一起测量、一起固定版本。
```

来源：sgl-model-gateway/src/main.rs, sgl-model-gateway/src/policies/cache_aware.rs, sgl-model-gateway/Cargo.toml, python/sglang/srt/arg_groups/serving_hook.py (handle_load_balance_method), and python/sglang/srt/managers/data_parallel_controller.py, all at v0.5.22. Pull request #14312, issues #22095 and #10608. Jarvislabs, "Managed Endpoints", 2026-08-26. LMSYS, "SGLang v0.4", 2024-12-04.
