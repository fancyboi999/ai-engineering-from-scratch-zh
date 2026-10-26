# 利于前缀复用的 prompt

> 前缀缓存从第一个 token 开始匹配；prompt 开头附近一个变化的 token，其代价可能超过任何服务参数能省下的时间。

团队在八张 GPU 上运行 DeepSeek-V4 长 agent 会话，开启分层缓存。重复 100,000-token 历史的请求，仪表板却显示 `#cached-token: 0`。调整缓存层与写策略几乎无效，最后发现中继在每个请求的 system prompt 中加入了随机哈希。

读完本节，你能在发送前预测哪些 prompt 能命中，用 `cached_tokens`、调度日志与 `/metrics` 证明命中率。

## 实验：一个标识符，三个位置

工具以三种形式各发送五次同一份 2,999-token system prompt 和短问题。服务器开启 `--enable-cache-report`，每次响应向客户端报告缓存 token。工具先发两个预热请求。

- **稳定：** 每次相同 system prompt。
- **ID 在开头：** system prompt 以 `Request id <random hex>.` 开头，每次换新值。
- **ID 在末尾：** 同一个随机 ID 放在 system prompt 末尾。

```listing
title: 缓存实验汇总
source: capture/out/cache-experiment.txt
lang: json
note: 三行汇总；省略上方十五行逐请求记录。稳定组丢弃用于填缓存的第一轮。
---
…
{"summary": "stable-system-prompt", "median_ttft_ms": 45.1, "min_ttft_ms": 34.0, "max_ttft_ms": 62.5, "median_cached_tokens": 2998.0, "prompt_tokens": 2999}
{"summary": "id-at-start", "median_ttft_ms": 1255.3, "min_ttft_ms": 1102.6, "max_ttft_ms": 2197.3, "median_cached_tokens": 5, "prompt_tokens": 3034}
{"summary": "id-at-end", "median_ttft_ms": 88.2, "min_ttft_ms": 83.7, "max_ttft_ms": 118.1, "median_cached_tokens": 2985, "prompt_tokens": 3028}
```

上游在 Mac 上用 4-bit MLX `Qwen3-0.6B` 实测，ID 放开头时首 token 等待为 1,255 ms，对照 45 ms，长约 28 倍。这个倍数取决于显卡的 prefill 速度，但未命中的 token 数不会变。同一 ID 放末尾只比稳定 prompt 多 43 ms。三种情况 token 几乎相同，仅顺序不同。

缓存数量解释了时间。稳定 prompt 复用 2,999 中的 2,998 个，即[第 3.3 节](#s-radixcache)所说的上限。ID 在开头只匹配随机十六进制之前五个 token。变化之后的每个 token 都属于树的不同分支，即使剩余文本相同。

```figure
id: fig-3-4
kind: comparison
title: 相同 token 的三种顺序
claim: 捕获记录中，prompt 开头的随机 ID 使约 3,027 token 未命中；放到末尾则仅损失约 45 token。
caption: 每条从左向右表示 prompt token，绿色缓存复用，梅紫重新 prefill。条带宽度仅作数量级示意，不代表同一轮的配对总数。来源：capture/out/cache-experiment.txt。
```

汇总中的 `prompt_tokens` 与 `median_cached_tokens` 是两个独立统计值，不能直接相减。逐轮数据的未命中数是 3,031、3,027、3,025、3,025 和 3,028 token；中位数为 3,027 token。

## 顺序为何重要

基数树从第一个 token 开始比较，到首次不同就停止。不同点之后不能再匹配，因为每个后续 token 的注意力值依赖此前所有 token。复用后续 token 的缓存会给出错误答案。因此前缀缓存既必须精确，也不会宽容差异。

聊天请求的各部分同样如此。聊天模板按固定顺序把消息变成单个 token 序列：system prompt、工具列表、历史回合、新消息。System prompt 一改，后面全部失效；只改最新消息，则只让该消息失效。

## 事故

Issue #35129 就是本节开头的故事 {{issue #35129}}。报告者发现三层原因叠加。

1. 中继为每个请求加入会话随机 `cch=` 哈希和轮换 system 消息。移除后引擎命中率从 66.8% 增至 94.4%。
2. 客户端把任务列表快照写在 system prompt 末尾。每次任务更新都改 system prompt，使其后超过 100,000-token 历史失效。
3. 分层缓存回载找不到空间时，淘汰其他会话前缀。报告者统计到 250,000 次 evict，只有 376 次完成回载。

首项修复仅修改 prompt。[第 3.5 节](#s-eviction-policies-and-hicache)任何服务参数都挽回不了哈希损失的 27.6 个百分点。

## 本手册的建议：先修 prompt，再调服务

将 prompt 布局视为服务系统一部分。改缓存参数前，用真实请求核对：

- 永不变化的放最前：system prompt，然后固定顺序的工具列表。
- 按会话变化的放其后，按请求变化的放最后。
- 不要把时间戳、请求 ID、会话哈希或随机采样种子放进 system prompt，改用请求元数据或放末尾。
- 工具与函数定义保持稳定顺序。JSON 对象键顺序变化会产生不同 token 序列。
- 追加会话内容，不要重写早期回合（如摘要），除非接受完整 prefill。

两种服务设置破坏复用时看起来也像 prompt 问题。若从位置 `k` 请求 prompt 对数概率，只能复用前 `k` 个 token {{code}}。不同 LoRA adapter 即使 token 相同，也不共享树节点，因为 adapter 是树键的一部分 {{code}}。

路由也会破坏复用。多个服务器中，请求若到没有该前缀的服务器，prompt 再稳定也会未命中。Jarvislabs 报告把同一会话固定到同一服务器，命中率从 64.7% 升至 92.1% {{field Jarvislabs 2026-08}}。[第 6.4 节](#s-sgl-model-gateway)展示网关按前缀路由。

## 如何证明命中

从最贴近请求到最一般，使用三层测量。

1. **响应。** 启动设置 `--enable-cache-report`，默认关闭 {{code}}。Usage 随后报告 `cached_tokens`。原生 `/generate` 无需参数也在 `meta_info` 返回它。
2. **调度日志。** 每行 `Prefill batch` 报告 `#new-token` 与 `#cached-token`。
3. **指标。** `/metrics` 导出 `sglang:cache_hit_rate`，它是近期 prefill 批次的 gauge。[第 3.3 节](#s-radixcache)共享前缀基准后，默认服务器报告 0.94，`--disable-radix-cache` 服务器报告 0.0。

```listing
title: 调度器视角的三种 prompt
source: capture/out/server-default.log
lang: text
note: 每种形式各一行，顺序与工具发送一致，省略其余十二行。
---
[2026-10-16 13:58:12] Prefill batch, #new-seq: 1, #new-token: 1, #cached-token: 2998, token usage: 0.02, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 7.09
…
[2026-10-16 13:58:14] Prefill batch, #new-seq: 1, #new-token: 3031, #cached-token: 3, token usage: 0.02, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 1937.91
…
[2026-10-16 13:58:20] Prefill batch, #new-seq: 1, #new-token: 45, #cached-token: 2983, token usage: 0.02, #running-req: 0, #queue-req: 0, #pending-token: 0, cuda graph: False, input throughput (token/s): 225.19
```

[Prompt 缓存课](phases/11-llm-engineering/15-prompt-caching)与[缓存和成本课](phases/11-llm-engineering/11-caching-cost)解释托管模型 API 的同一规则。这些 API 对缓存输入 token 收取更低价格。

```takeaways
- 固定内容放最前，每请求变化内容放最后。
- ID、时间戳、哈希不要放进 system prompt。
- 工具定义和 JSON 键保持固定顺序。
- 开启 --enable-cache-report，读响应 cached_tokens。
- Prompt 稳定但命中率低时检查路由。
```

Sources: python/sglang/srt/mem_cache/radix_cache.py (RadixKey, match_prefix), python/sglang/srt/managers/schedule_batch.py (_compute_max_prefix_len), python/sglang/srt/arg_groups/fields/serving.py (enable_cache_report), python/sglang/srt/entrypoints/openai/serving_chat.py at v0.5.22, capture/out/cache-experiment.txt, capture/out/server-default.log, capture/out/generate.txt, capture/out/metrics.txt, capture/out/no-radix-cache-metrics.txt, issue #35129, the Jarvislabs report of 2026-08-26.
