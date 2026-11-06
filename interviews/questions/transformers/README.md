# Transformer

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

注意力、位置编码、Transformer 块、KV cache 与长上下文的成本。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [数一数生成 100 个 token 的注意力工作量](count-attention-ops-with-cache.md) | 估算 | 1 基础 | 6 |
| [打乱词序，注意力察觉不到](permutation-blind-attention.md) | 概念 | 1 基础 | 6 |
| [一分钟讲清查询、键和值](query-key-value-lookup.md) | 概念 | 1 基础 | 6 |
| [注意力分数为什么要在 softmax 之前做除法](why-scale-by-sqrt-dk.md) | 概念 | 1 基础 | 6 |
| [注意力能跑通，但上下文张量的形状不对](attention-shape-bug.md) | 排障 | 2 应用 | 8 |
| [负无穷三角从何而来](causal-mask-minus-infinity.md) | 概念 | 2 应用 | 8 |
| [为 70B 解码器选择注意力变体](gqa-mla-cache-tradeoff.md) | 权衡 | 2 应用 | 10 |
| [八个头比一个头多花了什么](heads-are-nearly-free.md) | 概念 | 2 应用 | 8 |
| [损失骤降，采样却是乱码](loss-drops-to-zero-no-mask.md) | 排障 | 2 应用 | 8 |
| [三个产品，各选编码器、解码器还是两者都用](pick-encoder-or-decoder.md) | 权衡 | 2 应用 | 8 |
| [norm 为什么挪到了子层前面](pre-norm-vs-post-norm.md) | 权衡 | 2 应用 | 8 |
| [一个 reshape 是对的，另一个打乱了各个头](read-split-and-combine-heads.md) | 代码阅读 | 2 应用 | 8 |
| [跳连路径的作用，以及 dropout 能放在哪里](residual-stream-and-dropout.md) | 概念 | 2 应用 | 8 |
| [绝对的角度，相对的距离](rope-relative-from-absolute.md) | 概念 | 2 应用 | 8 |
| [热力图不是解释](attention-weights-as-proof.md) | 概念 | 3 高级 | 10 |
| [手算一个解码器堆栈的参数量](block-parameter-count.md) | 估算 | 3 高级 | 10 |
| [课后作业：在笔记本上训练字符级解码器](char-level-gpt-take-home.md) | 课后任务 | 3 高级 | 15 |
| [把模型从 8K 扩展到 128K](extend-context-past-training.md) | 设计 | 3 高级 | 12 |
| [分块注意力 kernel 是近似计算吗](flash-attention-is-exact.md) | 概念 | 3 高级 | 10 |
| [对照当今默认做法审查一个 2017 风格的 block](modernize-a-2017-block.md) | 设计 | 3 高级 | 12 |
| [读懂滑动 softmax，找出脆弱的那一行](read-the-tiled-softmax.md) | 代码阅读 | 3 高级 | 12 |
| [为单卡 128K 上下文设计注意力栈](attention-for-128k-context.md) | 设计 | 4 架构与规模 | 15 |
| [在模型规模和 token 数之间分配固定算力](compute-split-params-tokens.md) | 权衡 | 4 架构与规模 | 15 |
| [基准分数在两个模型规模之间跳变](emergence-or-scorer-artifact.md) | 概念 | 4 架构与规模 | 12 |

[全部主题](../../README.md)
