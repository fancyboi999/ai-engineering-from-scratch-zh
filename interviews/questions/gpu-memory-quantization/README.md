# GPU 显存、量化与硬件

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

GPU 显存用在哪里，量化怎样腾出显存，工作怎样拆分到多块 GPU。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [模型现在只有 35 GB，所以装得下](the-kv-cache-trap.md) | 概念 | 1 基础 | 5 |
| [为什么 8B 模型在 24 GB 显卡上启动失败](an-8b-model-on-a-24-gb-card.md) | 估算 | 2 应用 | 8 |
| [根据配置计算每个 token 的 KV 字节数](kv-bytes-per-token.md) | 估算 | 2 应用 | 8 |
| [为 24 GB 显存上的 14B 模型选择 4 位量化格式](pick-a-4-bit-format.md) | 权衡 | 2 应用 | 10 |
| [显存池空了 95% 但服务却崩溃了](an-empty-pool-and-an-oom.md) | 排障 | 3 高级 | 10 |
| [为什么 FP8 让显存池扩容了 4.77 倍而非 2 倍](fp8-grew-the-pool-twice.md) | 估算 | 3 高级 | 8 |
| [从未成功加载的 FP8 KV 缩放因子](kv-scales-silently-at-one.md) | 排障 | 3 高级 | 8 |
| [在两张显卡间切分模型还是部署两份副本](split-or-copy-on-two-cards.md) | 设计 | 3 高级 | 10 |
| [在统一内存架构上选择内存比例](unified-memory-fraction-on-a-gb10.md) | 估算 | 3 高级 | 10 |
| [同一个 KV cache 的八份副本](attention-data-parallel-for-latent-attention.md) | 概念 | 4 架构与规模 | 10 |

[全部主题](../../README.md)
