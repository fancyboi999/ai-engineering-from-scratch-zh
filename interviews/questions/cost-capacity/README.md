# 成本与容量

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

缓存、路由、批处理 API、冷启动，以及每个请求的成本。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [把工作负载分成交互、异步和 batch 三类](batch-lane-triage.md) | 概念 | 1 基础 | 5 |
| [该交给财务的指标，而不是 token 单价](cost-per-outcome.md) | 概念 | 1 基础 | 5 |
| [两种缓存层级，以及为什么其中一种未能降低账单](two-cache-layers.md) | 概念 | 1 基础 | 5 |
| [防止一个 bug 花光整月预算的控制措施](budget-circuit-breaker.md) | 设计 | 2 应用 | 10 |
| [一个缓存前缀要读几次才回本](cache-break-even.md) | 估算 | 2 应用 | 8 |
| [上线前读懂这个精确匹配缓存](exact-cache-temperature.md) | 代码阅读 | 2 应用 | 10 |
| [哪些网关放得进 20 ms 的尾延迟预算](gateway-latency-budget.md) | 估算 | 2 应用 | 8 |
| [同一次抓取里的两个缓存命中率](hit-rate-gauge-lies.md) | 排障 | 2 应用 | 8 |
| [十个并行工具调用，十次缓存写入，零次读取](parallel-calls-miss-the-cache.md) | 排障 | 2 应用 | 8 |
| [白天负载该按 token 计费还是按分钟计费](per-token-or-per-minute.md) | 权衡 | 2 应用 | 8 |
| [调低缓存阈值，命中更多却答错了](semantic-threshold.md) | 权衡 | 2 应用 | 8 |
| [整夜保留热副本，还是八点冷启动](warm-pool-or-cold-start.md) | 权衡 | 2 应用 | 10 |
| [按队列和缓存信号自动扩缩模型服务](autoscale-on-the-right-signal.md) | 设计 | 3 高级 | 15 |
| [路由器省下一半账单之后，升级率开始攀升](cheap-model-drift.md) | 排障 | 3 高级 | 12 |
| [把八分钟的启动时间拆成各个部分](cold-start-anatomy.md) | 估算 | 3 高级 | 12 |
| [几个停不下来的回答，占满了所有人的缓存池](loops-hold-the-pool.md) | 排障 | 3 高级 | 12 |
| [给缓存了 prompt 的 batch 夜间流水线估价](overnight-pipeline-cost.md) | 估算 | 3 高级 | 12 |
| [第二个副本让前缀缓存失效](router-decides-hit-rate.md) | 设计 | 3 高级 | 15 |
| [扩容后看似毫无收益的 KV 显存池，直到过载来临](size-the-pool-from-peak.md) | 权衡 | 3 高级 | 12 |
| [构建一个成本归因与管控模拟器](cost-attribution-take-home.md) | 课后任务 | 4 架构与规模 | 60 |
| [按层级配置热副本，并算清这笔账](scale-to-zero-policy.md) | 设计 | 4 架构与规模 | 18 |
| [发生提供商故障时无需重新部署的容灾设计](two-provider-minimum.md) | 设计 | 4 架构与规模 | 18 |

[全部主题](../../README.md)
