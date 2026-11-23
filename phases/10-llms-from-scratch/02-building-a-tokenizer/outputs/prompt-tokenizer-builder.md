---
name: prompt-tokenizer-builder
description: 为 LLM 项目构建和调试生产级分词器
version: 1.0.0
phase: 10
lesson: 2
tags: [tokenizer, bpe, byte-level, special-tokens, chat-template, multilingual]
---

# 生产级分词器构建指南

为 LLM 项目构建或调试分词器时，按这套框架来做。

## 流水线检查清单

每个生产级分词器都需要下面五个阶段。缺任何一个，上线后都会碰到边界问题。

1. **归一化（Normalize）**：做 NFKC Unicode 归一化。它会合并连字（"fi" -> "fi"）、统一全角字符、规范空白。跳过这一步，同一个词会因为输入方式不同而得到不同的 token ID。

2. **预分词（Pre-Tokenize）**：BPE 之前先把文本切成块。以英文为主的模型用 GPT-2 的正则模式。多语言模型用 SentencePiece 的原始字节方案。这个选择决定了 BPE 能否跨词边界合并。

3. **BPE 合并（BPE Merge）**：在每个块内的字节序列上应用学到的合并表。合并表就是分词器学到的全部知识，其他部分都只是管道。

4. **注入特殊 token（Special Token Injection）**：在 BPE 运行前精确匹配特殊 token。[BOS]、[EOS]、[PAD] 和对话模板标记都有固定 ID，从不参与合并。

5. **ID 映射（ID Mapping）**：把 token 字符串转成整数。模型只看得到整数。

## 调试分词器问题

**症状：模型在对话输入上输出乱码**
- 检查对话模板。每个模型的格式都不一样。Llama 3 用 `<|start_header_id|>` 标记，ChatGPT 用 `<|im_start|>` 标记。模板用错，输入就落到了训练分布之外。

**症状：非英文文本占用 token 过多**
- 检查 fertility（每个词对应的 token 数）。高于 2.0 说明分词器在这种语言上浪费上下文窗口。解决办法：加入更多多语言数据重新训练、增大词表，或改用 Unigram 模式的 SentencePiece。

**症状：数字和算术出错**
- 检查数字是怎么分词的。"1234" 被当成一个 token，模型就没法做逐位运算。在预分词阶段把数字逐位拆开。

**症状：代码 token 效率低**
- 检查缩进的处理方式。GPT-2 的分词器在空格上浪费 token。Codex 和 StarCoder 使用专门的缩进 token（4 个空格 = 1 个 token）。

## 词表大小决策

- 32K token：单语言、小模型、算力有限。嵌入层参数为 32K * d_model。
- 50K-64K：多语言或代码占比高。对大多数项目是不错的平衡点。
- 100K+（GPT-4、Llama 3）：只在训练数据量极大时使用。序列更短，但嵌入参数达到 100K * d_model。

以 4096 维模型为例：32K 词表 = 131M 嵌入参数，128K 词表 = 524M 嵌入参数。光嵌入层就差了 400M 参数。

## 速度要求

- 训练数据分词：用 Rust 后端的库（tiktoken、HuggingFace tokenizers）。纯 Python 要慢 10-100 倍。
- 推理分词：延迟没那么关键（单条序列），但仍应使用编译实现。
- 基准测试：对 1GB 文本分词并测墙钟时间。超过 60 秒就换成 Rust 后端。

## 对话模板验证

部署任何对话模型之前，先验证模板：

1. 用分词器编码一段已知对话
2. 再解码回文本
3. 逐字符对照模型文档里给出的预期格式
4. 重点看：header token 后的换行、内容前的空格、回合结束标记
5. 测试边界情况：空的 system 消息、超长的用户消息、多轮 assistant 回复

对话模板出错，是对话模型效果变差最常见的原因。
