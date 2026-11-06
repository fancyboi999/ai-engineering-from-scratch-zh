# 推理与服务系统

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

批处理、KV cache、前缀缓存、调度器，以及怎样测量服务引擎。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [为什么“每秒 255 个 token”只是口号](goodput-not-a-slogan.md) | 概念 | 1 基础 | 6 |
| [一个请求的两个阶段](prefill-and-decode.md) | 概念 | 1 基础 | 6 |
| [前缀缓存藏起来的拐点](flush-before-you-compare.md) | 排障 | 2 应用 | 8 |
| [FP8 KV cache 能换来什么，又要付出什么](fp8-kv-cache.md) | 权衡 | 2 应用 | 10 |
| [推测解码怎样保证输出不变](how-speculation-keeps-the-output.md) | 概念 | 2 应用 | 8 |
| [KV 池能装下多少用户](kv-pool-users-fit.md) | 估算 | 2 应用 | 10 |
| [模板稳定，命中缓存的 token 却为零](low-hit-rate-with-a-stable-template.md) | 排障 | 2 应用 | 8 |
| [一台服务器挂多个 LoRA adapter 的代价](multi-lora-serving-cost.md) | 设计 | 2 应用 | 8 |
| [用一个 token 预算代替两个阶段](one-token-budget-per-step.md) | 概念 | 2 应用 | 8 |
| [为什么 KV cache 是一个 16 token 块组成的池](paged-blocks-and-the-hash-chain.md) | 概念 | 2 应用 | 8 |
| [为什么 prompt 开头的一个 ID 会让缓存失效](prefix-cache-order.md) | 排障 | 2 应用 | 8 |
| [看吞吐量之前先看 GPU 频率](read-the-clock-first.md) | 排障 | 2 应用 | 8 |
| [解读三条调度器日志](read-three-scheduler-lines.md) | 代码阅读 | 2 应用 | 8 |
| [为什么 prompt 的共享部分要放在最前面](shared-prefix-first.md) | 概念 | 2 应用 | 8 |
| [RL 循环中的休眠、唤醒与权重更新](sleep-mode-for-rl-rollouts.md) | 概念 | 2 应用 | 8 |
| [temperature 为 0 却给出了两种不同的回答](temperature-zero-two-answers.md) | 概念 | 2 应用 | 8 |
| [选择张量并行、流水线并行还是数据并行](tensor-pipeline-or-data-parallel.md) | 设计 | 2 应用 | 10 |
| [同一台服务器，两个客户端测出两个数字](the-client-is-part-of-the-measurement.md) | 概念 | 2 应用 | 8 |
| [准入上限只决定谁来等待](a-cap-only-chooses-who-waits.md) | 权衡 | 3 高级 | 10 |
| [各 draft 位置的接受率与每次验证提交的 token 数](acceptance-length-on-long-answers.md) | 估算 | 3 高级 | 8 |
| [按并发数选择 EAGLE3 的 draft 深度](eagle3-draft-depth.md) | 权衡 | 3 高级 | 10 |
| [FP8 checkpoint 什么时候划算](fp8-weights.md) | 权衡 | 3 高级 | 10 |
| [吞吐量还在涨时怎样选并发上限](goodput-sets-the-cap.md) | 权衡 | 3 高级 | 12 |
| [prefill 分块应该更小吗](smaller-prefill-chunks.md) | 权衡 | 3 高级 | 10 |
| [为什么推测解码赢了基准测试却输在生产环境](speculation-on-real-prompts.md) | 排障 | 3 高级 | 10 |
| [确定性对线上服务器的代价](the-cost-of-batch-invariance.md) | 权衡 | 3 高级 | 10 |
| [低负载下调大 token 预算](token-budget-at-low-load.md) | 权衡 | 3 高级 | 10 |
| [两个数据并行副本，产出却不如单卡](two-copies-served-less-than-one.md) | 排障 | 3 高级 | 10 |
| [prefill 和 decode 拆分部署什么时候划算](when-to-split-prefill-and-decode.md) | 设计 | 3 高级 | 12 |
| [把空回答也算进去的拆分服务基准测试](a-benchmark-that-counted-empty-answers.md) | 代码阅读 | 4 架构与规模 | 10 |
| [在一批 L4 卡上设计对话服务](design-a-chat-service-on-l4s.md) | 设计 | 4 架构与规模 | 15 |
| [吞吐量相同，池满时的两种选择](same-throughput-two-choices.md) | 权衡 | 4 架构与规模 | 12 |

[全部主题](../../README.md)
