---
id: stream-filter-catches-late
title: 检测器判为良性，输出流却被截断了
card: safety
kind: debug
level: 3
roles: [agentic-ai-engineer, applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, system-design]
tags: [safety-gate, streaming-filter, prefix-injection, encoding-trick, trace]
minutes: 9
lessons: [phases/19-capstone-projects/87-end-to-end-safety-gate, phases/19-capstone-projects/82-jailbreak-taxonomy]
manuals: []
practice: []
cheatsheet: [guardrails-moderation]
related: [safety/gate-aggregation-table, safety/one-regex-is-not-a-detector]
updated: 2026-11-03
---

你的门控会在模型运行前拦下大多数攻击。在某个请求的 trace 里，检测器判为良性，模型开始回答一段绝不能给出的操作步骤，几个 token 之后回复被截断，作为脱敏后的部分内容发了出去。解释是哪一层起了作用，第一层为什么漏掉，以及这个结果对不对。

## Short answer

起作用的是流式过滤器：它缓冲已输出块的一个短窗口，在里面扫描已知的续写短语，命中就终止输出流，并把输出标记为提前终止；聚合器把这当作 medium 信号，映射为 redact。检测器漏掉，是因为这个 prompt 是编码伎俩或前缀注入，它的表面形式不在输入规则的覆盖范围内。按这个设计，结果是对的：有害的续写没能写完，trace 也为检测器团队记下了这次漏判。

## Full answer

### 起作用的那一层

门控在三个检查点运行。生成前是检测器。生成中是模型输出流上的过滤器：模拟模型每次产出四个 token 的块，过滤器最多保留两个块，在窗口上跑一条匹配续写短语的正则，命中就停止迭代器，返回标记为提前终止的部分输出。生成后，分类器路由器和规则引擎对已经输出的内容运行。

### 检测器为什么漏掉

分类法里有两类攻击就是为了穿过输入规则而设计的。编码伎俩把违禁 token 藏进 base64、rot13、leet speak 或零宽字符里，不解码这种形式的规则集什么也看不到。前缀注入在 prompt 末尾写上回答的开头几个词，模型就会从一个默认的“好”接着往下写，而不是先做决定；prompt 本身看起来可能无害。综合项目的模拟模型故意在这部分攻击上产出一段不完整的有害续写，好让人看到各层如何互相配合。

### 为什么是脱敏而不是拦截

提前终止是一个 medium 信号。生成后对部分文本的检查没有发现 high。最大值是 medium，所以动作是 redact：分类器脱敏器和规则修复器处理这段部分输出，然后连同 trace 一起发出。trace 里有检测器判定、命中的终止模式、生成后的各项判定、最终动作和延迟。

### 拿 trace 做什么

把这个 prompt 作为样本加入分类法，写上类别和严重度。为它所在的家族新增或调整一条检测规则。重新运行指标运行器，看这一类的召回率变化，以及良性列表上的误报变化。trace 的意义在于让一次漏判变成一个样本，而不是一个故事。

### 局限

窗口只装两个块。续写短语拆到更多块里，就能逃过过滤器，这时由生成后检查兜底。如果门控只在生成后检查，前缀注入就能在任何检查之前把操作步骤流式发给用户。

## Follow-ups

- **Level 3:** 为什么过滤器保留两个块，而不是逐块单独扫描？ Expected: 续写短语可能跨越块的边界；窗口让正则能跨边界匹配，代价是一点延迟。
- **Level 3:** 这一层是为分类法里哪些类别而设的？ Expected: 能穿过输入规则的编码伎俩，以及由 prompt 设定回答开头几个词的前缀注入。
- **Level 4:** 检测器团队下一步做什么？怎么知道有效？ Expected: 把这个 prompt 作为带类别的样本加入，新增或调整一条规则，然后从指标运行器读出按类别的召回率和良性误报率。

## Wrong answers

- "检测器判为良性，所以门控失败了。" 门控是分层的，一层漏掉的由下一层抓住；trace 显示设计在正常工作。
- "输出流被截断时，什么都不发。" 设计把提前终止映射为 redact，部分输出经过脱敏器后发出；拦截需要 high 信号。
- "改成生成结束后扫描整段输出。" 只做事后检查，前缀注入就能在检查之前把操作步骤流式发给用户；过滤器就是为了尽早停掉输出流。

## Taught in

[端到端安全门控综合项目](../../../phases/19-capstone-projects/87-end-to-end-safety-gate/)实现了流式过滤器和 trace，[越狱分类法综合项目](../../../phases/19-capstone-projects/82-jailbreak-taxonomy/)定义了会到达这一层的攻击类别。
