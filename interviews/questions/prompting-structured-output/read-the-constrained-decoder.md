---
id: read-the-constrained-decoder
title: 读懂约束生成循环
card: prompting-structured-output
kind: code-reading
level: 2
roles: [applied-ai-engineer, inference-engineer, agentic-ai-engineer]
rounds: [coding, ml-depth]
tags: [constrained-decoding, logit-processor, fsm, code-reading]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding]
manuals: []
practice: []
cheatsheet: [structured-outputs]
related: [prompting-structured-output/answer-before-reasoning, prompting-structured-output/json-mode-is-not-a-schema]
updated: 2026-11-03
---

阅读课程中的这段约束生成循环。解释 mask 对概率做了什么、状态机的状态记录了什么，以及为什么这个循环最终可能比无约束生成更快。

```python
def mask_logits(logits, valid_token_ids):
    mask = [float("-inf")] * len(logits)
    for tid in valid_token_ids:
        mask[tid] = logits[tid]
    return mask


def generate_constrained(model, tokenizer, prompt, fsm):
    ids = tokenizer.encode(prompt)
    state = fsm.initial_state
    while not fsm.is_accept(state):
        logits = model.next_token_logits(ids)
        valid = fsm.valid_tokens(state, tokenizer)
        logits = mask_logits(logits, valid)
        tok = sample(logits)
        ids.append(tok)
        state = fsm.transition(state, tok)
    return tokenizer.decode(ids)
```

## Short answer

mask 把每个非法 token 的 logit 设为负无穷，softmax 之后这些 token 的概率为零，采样器只能选让输出留在语法内的 token。状态机记录到目前为止在语法中走到的位置，`valid_tokens` 返回能让它前进、又不离开可接受路径的 token。它可能更快，一是因为搜索空间缩小了，二是因为只有一个合法 token 的位置根本不需要调用模型。

## Full answer

### 逐步走一遍循环

1. 编码 prompt，让状态机从初始状态开始。
2. 在状态机进入接受状态之前：向模型要整个词表上下一个 token 的 logits。
3. 问状态机当前状态下哪些 token id 合法。
4. 把其他所有 logit 替换为负无穷；合法的保持原值。
5. 从 mask 后的 logits 里采样，追加 token，把状态机推进到下一个状态。
6. 把 id 解码成文本。

夹在模型和采样器之间的这一部分就是 logit 处理器。模型本身没有任何改变；改的只是一步的 logits。

### 合法集合从哪来

来自编译好的语法。由正则或 JSON Schema 构建的有限状态机，能在每个状态以常数时间查出合法 token。上下文无关文法引擎处理有限状态机表达不了的递归。推理服务器把同样的思路做成了引导式解码（guided decoding），提供 JSON、正则、选项和语法几种模式。

### 为什么可能更快

课程给了两个原因。下一个 token 的搜索空间缩小了。巧妙的实现还会对强制 token 跳过模型调用：语法只剩一个合法 token 时，比如键名的固定骨架，直接追加这个 token，不做生成。这段代码还没有这样做。

### 这段代码解决不了的问题

语法太严会让模型编造值，因为没有合法 token 能让它表达「未知」。巨大的枚举编译很慢。递归 schema 放不进有限状态机。生成后再校验的重试库则完全不做这些事；它从不碰 logits。

## Follow-ups

- **Level 2:** `valid_tokens` 的答案从哪来？ Expected: 来自编译好的语法；有限状态机能在每个状态以常数时间查表。
- **Level 2:** 生产实现做了什么这段循环没做的事？ Expected: 跳过强制 token；只有一个 token 合法时，不调用模型就直接追加。
- **Level 3:** 哪些 schema 是有限状态机处理不了的？ Expected: 递归的 schema，比如嵌套注释或语法树，需要上下文无关文法引擎。
- **Level 3:** 语法强制了严格的日期模式，而源文本里没有日期。循环会产生什么？ Expected: 一个格式合法、内容编造的日期，因为没有合法 token 能让模型表达未知；在语法里允许 null 或哨兵值。

## Wrong answers

- "mask 改变了模型权重。" 它不改变模型里的任何东西；它在采样前修改一步的 logits。
- "约束解码总会拖慢生成。" 课程说它常常更快：搜索空间更小，强制 token 还能跳过模型调用。
- "重试库做的是同一件事。" 它把 schema 格式化进 prompt，事后再校验；它不碰 logits。

## Taught in

[约束解码](../../../phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/)一课给出了这个循环、logit 处理器、速度论证和语法陷阱。
