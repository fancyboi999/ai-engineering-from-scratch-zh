---
id: read-the-decoder-round-trip
title: 两个解码函数，一个遇到 emoji 就出错
card: tokenization-decoding
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [coding, debugging]
tags: [bpe, decoding, utf-8, round-trip, code-reading]
minutes: 8
lessons: [phases/19-capstone-projects/30-bpe-tokenizer-from-scratch, phases/10-llms-from-scratch/01-tokenizers, phases/10-llms-from-scratch/02-building-a-tokenizer]
manuals: []
practice: []
cheatsheet: [tokenization]
related: [tokenization-decoding/merge-order-at-encode]
updated: 2026-11-03
---

代码评审收到了字节级分词器解码函数的两个版本。`vocab` 把每个 ID 映射到一个 `bytes` 对象。

```python
def decode_a(self, ids):
    byte_sequence = b"".join(self.vocab[t] for t in ids)
    return byte_sequence.decode("utf-8", errors="replace")

def decode_b(self, ids):
    return "".join(self.vocab[t].decode("utf-8") for t in ids)
```

两个都通过了英文测试。如果一个 emoji 的字节被分到了两个 token 里，哪个版本是对的？为什么正确的那个总能终止？`errors="replace"` 是做什么用的？

## Short answer

先把所有字节拼起来，再一次性解码，也就是 `decode_a` 的做法。emoji 这类多字节字符在 UTF-8 里占 4 个字节，可能被分到两个或更多 token 里，单独解码每个 token 的字节会碰到不完整的序列，要么抛异常，要么输出替换字符。拼接之所以可行，是因为每个 ID 要么是 256 个原始字节之一，要么是两个更早 ID 的拼接，所以把 ID 展开成字节最终一定落到原始字节上；只要输入是合法 UTF-8，完整的字节串就是合法 UTF-8。`replace` 选项让解码器在模型于流末尾输出半个字符时不抛异常。

## Full answer

### 为什么会被分开

字节级词表从单个字节起步，从语料中学合并。训练中罕见的 emoji 可能没有一条合并能覆盖它全部 4 个字节，编码器就把它留成两个 token，比如 3 个字节加 1 个字节。每个 token 单独看都不是合法的 UTF-8。只要合并只覆盖了字符的一部分，用 3 字节字符的文字也有同样的问题。

### 拼接为什么能终止并精确往返

综合项目写明了这条保证：先编码再解码，得到的字节与输入完全一致。解码器按顺序拼接每个 ID 展开后的字节。每个 ID 要么是原始字节，要么是两个已知 ID 的拼接，所以递归展开最终落到原始字节上，所有 token 拼起来就是原来的字节串。再做一次 UTF-8 解码就得到文本。测试集用三类输入锁住这个性质：一个没见过的句子、一个带 emoji 的句子，以及一个包含特殊 token 字面字符串的句子。

### 解码输出时的特殊 token

综合项目的解码器先查特殊 token 表，命中就追加该标记的 UTF-8 字节，没命中再查词表，两边都没有就抛异常。这样保留 ID 不会被当成一条合并去查。

### `errors="replace"` 是做什么的

模型可能停在一个字符的中间，流也可能断在共享一个字符的两个 token 之间。严格解码会抛异常；`replace` 输出替换字符并继续。流式解码器里更好的做法是缓存末尾的字节，直到凑成完整字符，只在最后一次刷出时用 `replace`。

## Follow-ups

- **Level 2:** `decode_b` 为什么能通过英文测试？ Expected: ASCII 字符都是单字节，没有哪个 token 会装着半个字符，每一段都能单独解码。
- **Level 3:** 用两句话设计流式解码器。 Expected: 累积字节，只输出最长的完整 UTF-8 前缀，剩下的留着；流结束时用替换字符刷出剩余部分。
- **Level 3:** 为什么词级分词器给不了往返保证？ Expected: 没见过的词映射到 unknown ID，而 unknown ID 映射不回原文。
- **Level 3:** 综合项目的测试集用哪三种输入检查往返？ Expected: 一个没见过的句子、一个带 emoji 的句子，以及一个包含特殊 token 字面字符串的句子。

## Wrong answers

- "每个 token 解码成字符串，再把字符串拼起来。" 一个 token 可能只装着字符的一部分，不完整的 UTF-8 不是字符串。
- "让解码器忽略错误，就永远不会抛异常。" 忽略会悄悄丢掉字节，往返不再精确；替换字符至少标出了丢失的位置。
- "往返只对训练数据有意义。" 每个生成的回答都要经过解码，遇到 emoji 就抛异常的服务会丢掉这个请求。

## Taught in

[BPE 综合项目](../../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/)提出并测试了往返保证，[分词器课程](../../../phases/10-llms-from-scratch/01-tokenizers/)给出了先拼接再解码的函数，[分词器构建课程](../../../phases/10-llms-from-scratch/02-building-a-tokenizer/)给出了 emoji 和其他文字的字节数。
