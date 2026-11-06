# 编程

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

写出课程里构建的代码。每道题都链接到一个带检查的编程练习。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [点积注意力里的缩放因子](scale-by-sqrt-dk.md) | 代码阅读 | 1 基础 | 6 |
| [softmax 为什么先减去行最大值](softmax-shift-max.md) | 代码阅读 | 1 基础 | 6 |
| [温度对采样做了什么](temperature-knob.md) | 概念 | 1 基础 | 6 |
| [混进梯度的权重衰减](adamw-decoupled-decay.md) | 代码阅读 | 2 应用 | 10 |
| [让两个匹配共用一个符号的合并](bpe-merge-no-overlap.md) | 代码阅读 | 2 应用 | 8 |
| [从词频训练 BPE 合并列表](bpe-train-loop.md) | 课后任务 | 2 应用 | 30 |
| [把 token 自己也遮住的因果掩码](causal-mask-off-by-one.md) | 代码阅读 | 2 应用 | 8 |
| [评估时仍在起作用的 dropout](dropout-off-at-eval.md) | 代码阅读 | 2 应用 | 8 |
| [损失降到零却什么也没学到的训练](loss-shift-flatten.md) | 代码阅读 | 2 应用 | 8 |
| [把可学习的位置表换成固定的正弦表](sinusoidal-table-swap.md) | 课后任务 | 2 应用 | 20 |
| [形状正确、数值错乱的拆头](split-heads-reshape.md) | 代码阅读 | 2 应用 | 8 |
| [写出生成循环的采样步骤](top-k-then-sample.md) | 课后任务 | 2 应用 | 20 |
| [训练最小的语言模型，让它超过基线](bigram-beats-unigram.md) | 课后任务 | 3 高级 | 30 |
| [哪些参数该做权重衰减](decay-split-param-groups.md) | 代码阅读 | 3 高级 | 10 |
| [把 query 头配错组的 GQA](gqa-repeat-not-tile.md) | 代码阅读 | 3 高级 | 10 |
| [丢掉最后一个槽位的 KV cache](kv-cache-capacity-slide.md) | 代码阅读 | 3 高级 | 10 |
| [扫描峰值学习率并标出发散](lr-peak-sweep.md) | 课后任务 | 3 高级 | 25 |
| [从不混合的注意力头](output-projection-missing.md) | 排障 | 3 高级 | 10 |
| [把最后的 LayerNorm 换成 RMSNorm 而不出错](rmsnorm-vs-layernorm.md) | 代码阅读 | 3 高级 | 10 |
| [丢掉了让累积和达到 p 的 token 的核采样](top-p-crossing-token.md) | 排障 | 3 高级 | 10 |
| [把多头检查点转换成分组查询头](gqa-checkpoint-pooling.md) | 估算 | 4 架构与规模 | 15 |
| [保护特殊 token 的字节级分词器](tokenizer-roundtrip-specials.md) | 课后任务 | 4 架构与规模 | 45 |

[全部主题](../../README.md)
