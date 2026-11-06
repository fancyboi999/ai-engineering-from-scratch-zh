---
id: bpe-merge-no-overlap
title: 让两个匹配共用一个符号的合并
card: coding
kind: code-reading
level: 2
roles: [applied-ai-engineer, ai-data-engineer, inference-engineer]
rounds: [coding, debugging]
tags: [bpe, tokenization, off-by-one]
minutes: 8
lessons: [phases/10-llms-from-scratch/01-tokenizers, phases/19-capstone-projects/30-bpe-tokenizer-from-scratch]
manuals: []
practice: [bpe-merge-step]
cheatsheet: [tokenization]
related: [coding/bpe-train-loop]
updated: 2026-11-03
---

选定一次 BPE 合并后，这个函数改写一个词。对词 `(7, 7, 7)` 和字符对 `(7, 7)`，它返回 `(300, 300, 7)`。找出 bug，并给出正确输出。

```python
def apply_merge(symbols, pair, new_id):
    out = []
    i = 0
    while i < len(symbols):
        if i + 1 < len(symbols) and symbols[i] == pair[0] and symbols[i + 1] == pair[1]:
            out.append(new_id)
            i += 1
        else:
            out.append(symbols[i])
            i += 1
    return tuple(out)
```

## Short answer

匹配后扫描只前进一位而不是两位，所以匹配中的第二个符号被再读一次：它要么开始下一次匹配，要么被复制到输出。两个匹配不能共用一个符号。正确结果是 `(300, 7)`：前两个 7 变成一个新 id，第三个 7 保留。

## Full answer

### 这个 bug 做了什么

匹配后只前进一位，扫描在位置 0 和 1 看到字符对，输出新 id，然后看位置 1 和 2，它们也匹配。词里多出一个原本没有的符号，合并后的语料就错了，之后每一步都在损坏的词上统计字符对。推理时编码复用同一个函数，所以任何含重复符号的文本解码后得到的字节都和输入不同。

### 修复

```python
        if i + 1 < len(symbols) and symbols[i] == pair[0] and symbols[i + 1] == pair[1]:
            out.append(new_id)
            i += 2
```

从左到右扫描，跳过匹配的第二个符号后再继续。分词器章节里的合并循环就是这样写的，练习里有一个只前进一步的变异体，它在 `[a, a, a]` 上失败。

### 为什么从左到右的规则重要

从左开始、不重叠地替换是一种约定，训练循环和编码器必须共用它。如果训练时从左合并，编码器从右合并，同一个词在训练和推理时会得到不同的 id。合并表只有在两边用同一种方式应用时才有效。

### 一个相关检查

函数返回新的元组。它不能写入调用方的序列，因为训练循环在构建新语料时还持有旧语料。

## Follow-ups

- **Level 2:** 同一个 bug 对下一步训练的字符对计数有什么影响？ Expected: 它会统计真实语料里不存在的字符对，之后的合并就按错误的数字来选。
- **Level 2:** 给一个这个 bug 也能得出正确结果的输入。 Expected: 只有不含这个字符对匹配的词，比如 `(7, 8, 7)` 配 `(7, 7)`；每次匹配都会多留一份第二个符号。
- **Level 3:** 往返测试怎样发现这个 bug？ Expected: 编码一个含重复字节的字符串，解码这些 id 再比较字节；多出来的合并符号会展开成比输入更多的字节。

## Wrong answers

- "把符号拼起来，用字符串方法替换字符对。" id 是整数不是字符，拼接后 id 之间的边界就看不出来了。
- "改成从右边匹配。" 单看哪个方向都行，但训练和推理必须用同一个方向；从左到右是约定。
- "返回列表而不是元组，速度更快。" 这些词是字典的键，必须保持可哈希。

## Taught in

[分词器课](../../../phases/10-llms-from-scratch/01-tokenizers/)用前进两位的步长写合并循环，[从零实现 BPE 课](../../../phases/19-capstone-projects/30-bpe-tokenizer-from-scratch/)解释了共用的合并契约，[BPE 练习](../../../practice/bpe-merge-step/)测试了重叠的情况。
