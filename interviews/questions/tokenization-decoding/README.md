# 分词、采样与解码

此文件由 `node scripts/interviews/validate.js --write` 生成，请勿直接编辑。

文本怎样变成 token，模型怎样选出下一个 token，推测解码怎样让解码更快。

| 题目 | 类型 | 难度 | 分钟 |
|---|---|---|---|
| [字节对编码的一步训练及其产物](bpe-training-loop.md) | 概念 | 1 基础 | 6 |
| [同一个 prompt，用韩语要多花 token](multilingual-tax.md) | 概念 | 1 基础 | 6 |
| [为什么语言模型读取子词并以字节为基底](why-subword-tokens.md) | 概念 | 1 基础 | 6 |
| [构建子词词表的三种方法](bpe-wordpiece-unigram.md) | 权衡 | 2 应用 | 8 |
| [notebook 里一切正常，上线后的服务却停不下来](chat-template-garbage.md) | 排障 | 2 应用 | 8 |
| [语法如何改写 logits，为什么还可能更快](constrained-decoding-how.md) | 概念 | 2 应用 | 8 |
| [编码器为什么要按顺序重放合并列表](merge-order-at-encode.md) | 概念 | 2 应用 | 8 |
| [合并之前那一刀切分是做什么的](pre-tokenization-regex.md) | 概念 | 2 应用 | 8 |
| [两个解码函数，一个遇到 emoji 就出错](read-the-decoder-round-trip.md) | 代码阅读 | 2 应用 | 8 |
| [数一数 token 流能切出多少个窗口](sliding-window-dataset.md) | 代码阅读 | 2 应用 | 8 |
| [推测解码在代码上飞快，在创意写作上停滞](temperature-and-acceptance.md) | 权衡 | 2 应用 | 8 |
| [词表扩到 128K，用数字算清代价和收益](vocab-size-tradeoff.md) | 估算 | 2 应用 | 8 |
| [读取隐藏状态的草稿为什么接受率更高](hidden-state-drafts.md) | 概念 | 3 高级 | 10 |
| [哪种多 token 预测设计能白送一个草稿](mtp-sequential-vs-parallel.md) | 概念 | 3 高级 | 10 |
| [读懂一步推测解码，逐行说明理由](read-the-speculative-step.md) | 代码阅读 | 3 高级 | 12 |
| [每条输出都校验通过，答案却是错的](schema-field-order.md) | 设计 | 3 高级 | 10 |
| [从接受率算出每次前向产出几个 token](speedup-from-alpha.md) | 估算 | 3 高级 | 10 |
| [带回家的作业：带测试的字节级分词器](take-home-bpe-tokenizer.md) | 课后任务 | 3 高级 | 15 |
| [权重没变，分数却掉了](tokenizer-drift-ci.md) | 排障 | 3 高级 | 10 |
| [平均延迟变好了，长尾却变差了](acceptance-fell-after-upgrade.md) | 排障 | 4 架构与规模 | 12 |
| [草稿是预训练内置、事后训练，还是借用小模型](choose-the-draft-for-a-new-model.md) | 设计 | 4 架构与规模 | 15 |
| [为多语言代码模型设计分词器](design-tokenizer-for-new-model.md) | 设计 | 4 架构与规模 | 15 |

[全部主题](../../README.md)
