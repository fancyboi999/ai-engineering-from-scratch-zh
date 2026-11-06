---
id: gate-aggregation-table
title: 让三个请求走一遍门控聚合器
card: safety
kind: code-reading
level: 3
roles: [agentic-ai-engineer, applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, system-design]
tags: [safety-gate, aggregation, severity, streaming-filter, trace]
minutes: 12
lessons: [phases/19-capstone-projects/87-end-to-end-safety-gate]
manuals: []
practice: []
cheatsheet: [guardrails-moderation]
related: [safety/output-router-severity, safety/rule-needs-three-parts]
updated: 2026-11-03
---

阅读下面安全门控的聚合步骤。让三个请求走一遍：一个被检测器标记且超过拦截阈值的 prompt；一个良性 prompt，它的输出流被提前截断；一个良性 prompt，它的输出触发了一条高严重度规则。然后说明这张表在设计上错在哪里。

```python
SEVERITY_RANK = {"none": 0, "low": 1, "medium": 2, "high": 3}

def _aggregate(self, pre, during, post):
    signals = []
    if pre.category != "benign":
        if pre.confidence >= self.block_confidence:
            signals.append(("pre", SEVERITY_RANK["high"]))
        elif pre.confidence >= self.note_confidence:
            signals.append(("pre", SEVERITY_RANK["medium"]))
        else:
            signals.append(("pre", SEVERITY_RANK["low"]))
    if during.terminated_early:
        signals.append(("during", SEVERITY_RANK["medium"]))
    if post is not None:
        signals.append(("post.classifier", SEVERITY_RANK.get(post.classifier_severity, 0)))
        if post.rules_max_severity:
            signals.append(("post.rules", SEVERITY_RANK.get(post.rules_max_severity, 0)))
    if not signals:
        return "allow"
    max_rank = max(rank for _, rank in signals)
    if max_rank >= SEVERITY_RANK["high"]:
        return "block"
    if max_rank >= SEVERITY_RANK["medium"]:
        return "redact"
    if max_rank >= SEVERITY_RANK["low"]:
        return "warn"
    return "allow"
```

## Short answer

第一个请求在生成前就被拦截：非良性类别且置信度达到拦截阈值，等级为 high，而 high 对应 block。第二个请求走 redact：提前终止本身就是一个 medium 信号，所以部分输出要经过脱敏器和修复器再发出。第三个请求被拦截：规则给出的 high 与分类器给出的 high 等级相同。这张表在设计上取最大值，所以信号永远不会叠加；三个 low 信号仍是 warn，检测器的 medium 标记加上分类器的 medium 发现，仍是 redact。

## Full answer

### 阈值

门控把拦截置信度设为 0.85，记录置信度设为 0.5。检测器给出非良性判定且置信度达到或超过 0.85 时为 high，在模型运行前就拦截。介于 0.5 和 0.85 之间为 medium。低于 0.5 为 low。良性判定不产生任何信号。

### 请求一：被标记的 prompt

检测器返回一个非良性类别，置信度高于 0.85。生成前信号等级为 high。门控根本不调用模型；它返回拒答，并写一条 trace，里面有检测器的判定，没有生成后的部分。

### 请求二：良性 prompt，输出流被截断

检测器判为良性，所以生成前没有信号。流式过滤器缓冲两个各含四个 token 的块，在窗口上用一个匹配续写短语的正则扫描；匹配命中后，它终止迭代器，并把输出标记为提前终止。这是一个 medium 信号。生成后检查在部分文本上运行；如果分类器和规则都返回 none，最大值就是 medium，动作是 redact：分类器的脱敏器和规则修复器处理部分输出，然后连同 trace 一起发出。

### 请求三：良性 prompt，命中高严重度规则

没有生成前信号，也没有提前终止。分类器路由返回 none。规则引擎返回一条 high 违规，例如输出里出现了内部库的名字。规则信号等级为 high，动作是 block，和分类器发现 high 问题时一样。

### 这个设计接受的局限

- **不累加。** 取最大值时不管有多少个信号触发。几个弱信号合起来明明描述了一次攻击，结果仍然只是 warn。
- **没有权重。** 检测器的 medium 和分类器的 medium 分量相同，不管各自过往的准确率如何。
- **窗口短。** 流式过滤器只保留两个块，所以续写短语拆到更多块里就能逃过它；生成后检查是兜底。如果门控只做事后检查，那种事后才显现的前缀注入就能活下来。
- **阈值固定。** 综合项目的练习提出改用加权分数，超过阈值才触发；阈值要在语料上扫出来，并按类别查看精确率和召回率。

门控的价值在于每个请求的 trace：每个检查点的判定、最终动作和延迟。不在于在语料上拿满分。

## Follow-ups

- **Level 3:** 为什么提前终止是 medium 而不是 high？ Expected: 在两个块的窗口上命中正则，比分类器确认的 high 发现证据更弱；部分输出仍要经过脱敏。
- **Level 3:** 检测器的 low 标记和一条 low 规则违规同时出现。最后发出什么？ Expected: warn，附一条温和提示；两个 low 的最大值还是 low，这张表不累加。
- **Level 4:** 换成加权聚合器会改变什么，代价是什么？ Expected: 信号会朝阈值累加，几个弱信号就可能触发拦截；代价是阈值需要调，要在语料上扫描，并按类别查看精确率和召回率。
- **Level 4:** 两个块的缓冲会漏掉什么，由什么来兜住？ Expected: 拆到比缓冲容量更多块里的续写短语；生成后检查是兜底。

## Wrong answers

- "只要任何一层触发就拦截。" 设 low 和 medium 信号，就是为了不让有弱匹配的良性 prompt 被拒；表把它们映射为 warn 和 redact。
- "把拦截阈值调低，省下模型调用。" 检测器在角色扮演上的精确率一般，阈值一低，创意类请求就会被拒；综合项目在 0.85 处拦截。
- "demo 以 0 退出，所以门控拦下了所有攻击。" demo 在设计上会自行结束；trace 才是交付物，汇总计数显示了哪些请求漏了过去。

## Taught in

[端到端安全门控综合项目](../../../phases/19-capstone-projects/87-end-to-end-safety-gate/)给出了聚合表、三个检查点和 trace。
