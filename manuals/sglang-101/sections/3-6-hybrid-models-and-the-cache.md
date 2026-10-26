# 混合模型与缓存

> 滑动窗口和 Mamba 层保存的状态，无法像逐 token 树那样在任意位置拆分，因此 v0.5.22 中许多缓存失败报告都来自混合模型。

团队部署混合线性注意力和全注意力层的模型，开启 HiCache，运行二十个命中主机层的请求。二十个答案都流畅，却回答了另一个 prompt。Usage 显示全量缓存 token，日志没有警告。

读完本节，你能解释混合模型为何打破[基数树](#s-radixcache)的简单图景，并在用户替你试错前验证模型缓存。

## 三种层状态 {#s-hybrid-models-and-the-cache-three-kinds-of-layer-state}

[第 3.3 节](#s-radixcache)的基数树可行，是因为全注意力每 token 保存一份 key/value。任意长度缓存前缀都有效，因此能在任何 token 拆节点。另外两种层打破了规则。

**滑动窗口注意力（SWA）：** 只读取最近几千 token。SWA 只需窗口，SGLang 为这些层维护更小的池，丢弃窗口外 KV。缓存前缀只有在窗口 KV 仍存在处才有用。

**Mamba 层：** 状态空间或线性注意力层，每个序列保留一个固定大小的递归状态，逐 token 更新。第 2,000 token 的状态总结全部 2,000 token，不能裁回第 1,500。只有 SGLang 保存了状态快照的位置，前缀才能恢复。

本手册捕获模型两者都没有，启动日志明确说明：

```listing
title: 只有全注意力层的模型
source: capture/out/server-default.log
lang: text
note: 默认配置启动日志两行。
---
[2026-10-16 13:58:06] Tree cache initialized: source=default impl=UnifiedRadixCache hybrid_swa=False hybrid_ssm=False hicache_attached=False
…
[2026-10-16 13:58:08] Attention KV pool initialized: pool_size=181574 (buffer size 181575 incl. padding slot 0), 28 full-attention layers (0 sliding-window layers stay per-request), 8 kv_heads, 128 head_dim
```

新模型先读这两行。`hybrid_swa=True` 或 `hybrid_ssm=True` 表示本节内容适用。

## SGLang 如何处理 {#s-hybrid-models-and-the-cache-how-sglang-handles-each-kind}

`UnifiedRadixCache` 用一棵树，为每类状态配一个 component {{code}}。节点保存全注意力数据，需要时再保存 SWA 与 Mamba 数据。只有所有 component 都确认当前位置状态有效，匹配才继续。

SWA 的树记录窗口 KV 被丢弃的位置，匹配在那里停止。`--swa-full-tokens-ratio` 设置 SWA 池相对完整池大小，默认为 `None`，由模型特定覆盖值设定。DeepSeek-V4 覆盖值为 0.1 {{code}}。

Mamba 的树在部分节点存状态快照，请求复用时复制它。`--mamba-radix-cache-strategy` 选择快照保留方式：默认 `auto`，另有 `no_buffer`、`extra_buffer`、`extra_buffer_lazy` {{code}}。`--mamba-track-interval` 设置 decode 保存快照频率，默认每 256 token。

```figure
id: fig-3-6
kind: tree
title: Mamba 前缀只能从快照恢复
claim: 新请求匹配 Mamba 模型 1,800 token，从最后 1,792-token 快照恢复，再 prefill 八个 token。
caption: 从根向下读。按 --mamba-track-interval 默认值每 256 decode token 保存快照。Token 数为示例，并非捕获。
```

## Issue 中的问题 {#s-hybrid-models-and-the-cache-what-goes-wrong-in-the-issues}

v0.5.22 中有许多混合模型缓存问题报告。我们没有亲自运行混合模型。以下四个 issue 展示了不同故障类型。

1. **主机层命中返回错误答案。** Issue #39830 是开头故事 {{issue #39830}}。开启 HiCache 的混合线性注意力模型，20 次主机命中全部流畅回答另一个 prompt。冷请求和 GPU 命中正确。
2. **相同 prompt 完全不复用。** Issue #22935 中，重复 prompt 的匹配在边内结束，拆分节点没有 Mamba 状态 {{issue #22935}}，因此只能停在最后一个有状态节点，相同 prompt 也无法复用。
3. **一种策略让首 token 慢 4.7 倍。** Issue #37834 中，某选项强制 `no_buffer` {{issue #37834}}。快照深度是后续请求无法到达的。检索负载命中率从 88.2% 降至 65.9%，平均 TTFT 从 226 ms 增至 1,063 ms。
4. **默认值拖慢 decode。** Issue #36131 报告释放窗口外 SWA 槽位的新默认值 {{issue #36131}}，使 DGX Spark 和 Thor 上混合 SWA 模型的单流 decode 吞吐量下降。

## 本手册的建议：先验证混合模型缓存 {#s-hybrid-models-and-the-cache-our-position-test-the-cache-on-a-hybrid-model-before-you-trust-i}

全注意力模型错误命中足够少见，通常保持缓存开启即可。混合模型上，上生产前做三项检查，每项只需几分钟。

1. **正确性。** 同一 prompt 分别冷运行、GPU 命中、以及使用 HiCache 时的主机层命中，比较温度 0 的输出。测试时用 `--kv-canary log` 检查槽位损坏，同时保持服务运行 {{code}}。
2. **复用。** 重复 prompt，读取 `#cached-token`。相同 prompt 缓存数很少，表明遇到 issue #22935 的拆分问题。
3. **延迟。** 比较 `--mamba-radix-cache-strategy auto` 与部署指南推荐策略的 TTFT。只有命中率仍保持时，才选择更快策略。

每次升级前阅读模型家族的开放 issue。从 2026-09-01 到 v0.5.22 标签，`python/sglang/srt/mem_cache` 路径有约 330 个提交。混合模型的新版本可能修一个 bug，又引入另一个。

```takeaways
- 每个新模型都读 hybrid_swa 与 hybrid_ssm。
- 生产前比较温度 0 的冷运行、GPU 命中与主机命中输出。
- 混合模型缓存测试中运行 --kv-canary log。
- 检查相同 prompt 是否报告高缓存 token 数。
- 每次升级前读模型家族的开放缓存 issue。
```

来源： python/sglang/srt/mem_cache/unified_radix_cache.py, python/sglang/srt/mem_cache/unified_cache/components/README.md, python/sglang/srt/arg_groups/fields/exec_.py (mamba_radix_cache_strategy, mamba_track_interval), python/sglang/srt/arg_groups/fields/schedule.py (swa_full_tokens_ratio), python/sglang/srt/arg_groups/model_overrides/deepseek_v4.py, python/sglang/srt/arg_groups/fields/observability.py (kv_canary)，v0.5.22, capture/out/server-default.log, issue #39830, #22935, #37834, 和 #36131; GitHub 提交列表，路径 python/sglang/srt/mem_cache，2026-09-01 至 v0.5.22 标签（333 个提交，计数日期 2026-10-22）
