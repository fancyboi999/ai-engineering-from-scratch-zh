---
id: constrained-decoding-how
title: 语法如何改写 logits，为什么还可能更快
card: tokenization-decoding
kind: concept
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [ml-depth, system-design]
tags: [constrained-decoding, logit-processor, json-schema, finite-state-machine, structured-output]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding]
manuals: []
practice: []
cheatsheet: [structured-outputs]
related: []
updated: 2026-11-03
---

一个分类 prompt 要求模型从三个标签里选一个，模型却答了一整段话，解析器随即崩溃。修复手段有三个层次。请在 logits 层面解释最强的那一层怎样工作，以及它为什么常常比自由生成更快，而不是更慢。

## Short answer

prompt 是客气地请求，厂商的结构化输出 API 在服务端做约束，约束解码则在本地直接改写 logits。每一步，logit 处理器算出词表里哪些 token 能推进目标语法（JSON schema、正则或上下文无关语法，编译成状态机），把其余 logit 全部置为负无穷，于是 softmax 只把概率分给合法的续写，非法输出根本到不了。它可能更快，一是搜索空间缩小，二是语法强制的 token（比如固定的键名）不需要模型走一步就能直接输出。

## Full answer

### 三个层次

1. **prompt。** "只返回 JSON 对象。" 课程给出的数字是：强模型约 80% 遵守，小模型更低。这不是契约。
2. **原生结构化输出。** 由提供方在自己那侧执行约束。对支持的 schema 很可靠，但锁死在这家提供方上。
3. **约束解码。** 约束跑在你自己的解码循环里，任何本地模型都能用。

### 循环

```python
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

状态机记录语法已经满足到哪一步。`valid_tokens` 返回能让状态机留在可接受路径上的词表 token；掩码把其余 token 的 logit 置为负无穷。词表约有 10 万个 token，所以每个状态的掩码都提前算好。

### 状态机还是语法引擎

正则或扁平的 JSON schema 可以编译成有限状态机，每个状态查合法 token 只要常数时间。递归的 schema、嵌套注释或语法树需要上下文无关语法引擎；在现在的实现里，它处理递归时几乎不增加解码开销。推理服务器把这两种都作为引导解码（guided decoding）提供出来。

### 为什么可能更快

候选 token 变少，每一步的有效搜索范围就更小。更重要的是，输出里有很长的片段完全由语法决定：开头的大括号、带引号的键、冒号。好的实现对这些 token 直接跳过模型，只在语法留有选择的地方才调用模型。

### 不碰 logits 的库

一种基于重试的客户端把 schema 格式化进 prompt，解析输出，校验失败就重试，默认 3 次。它能跨提供方使用，但每次重试都要付出延迟和费用。这是另一种机制，不是同一机制的弱化版。

## Follow-ups

- **Level 2:** 什么时候有限状态机不够用？ Expected: 遇到递归 schema 时；状态机只能把递归展平到固定深度，这时需要上下文无关语法引擎。
- **Level 3:** 提供方普通的 JSON 模式保证什么，不保证什么？ Expected: 保证 JSON 语法合法，不保证符合你的 schema；始终要传完整的 schema。
- **Level 3:** 重试库和 logit 处理器有什么不同？ Expected: 它从不改变模型的分布；它事后校验再重试，每次失败都增加延迟和费用。
- **Level 4:** schema 里有一个 10,000 个选项的枚举，编译超时了。怎么办？ Expected: 先用检索器预测一个短的候选列表，再把解码约束到这些候选上。

## Wrong answers

- "约束解码能让答案正确。" 它让答案符合语法；格式正确的错误答案照样能通过。
- "每个 token 都检查语法，生成会变慢。" 每个状态的合法 token 集合是预先算好的，被强制的 token 还能跳过模型，所以常常更快。
- "prompt 里示例给得够多，就能完全遵守。" 课程里只靠 prompt 的数字约为 80%；要做成契约，得靠改 logits 或服务端约束。

## Taught in

[结构化输出课程](../../../phases/05-nlp-foundations-to-advanced/20-structured-outputs-constrained-decoding/)实现了 logit 处理器，并对比了这三个层次。
