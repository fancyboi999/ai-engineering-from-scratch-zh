---
id: read-the-three-aggregators
title: 阅读投票聚合器并找出盲区
card: multi-agent
kind: code-reading
level: 3
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [coding, debugging]
tags: [consensus, plurality, semantic-clustering, code-reading, monoculture]
minutes: 12
lessons: [phases/16-multi-agent-and-swarms/14-consensus-and-bft, phases/16-multi-agent-and-swarms/13-shared-memory-blackboard]
manuals: []
practice: []
cheatsheet: [multi-agent]
related: [multi-agent/three-copies-of-one-model-voted]
updated: 2026-11-03
---

阅读共识机制课程中的聚类与相对多数（plurality）聚合器实现。五个 agent 针对某项研究中的百分比数据投票。其中三个共享相同基础模型的 agent 给出的回答是 `42%`，另外两个 agent 给出的回答是 `4.2%`。后两个 agent 的各自置信度均高于前三个中的任意一个，但前三个 agent 的置信度总和依然更高。说明相对多数聚合器返回什么、按置信度加权的聚合器返回什么，以及该规范化函数如何处理 `4.2 percent` 这一文本。

```python
@dataclass
class Vote:
    agent: str
    answer: str
    confidence: float

    def canonical(self) -> str:
        return "".join(c for c in self.answer.lower().strip() if c.isalnum() or c == "." or c == "%")


def plurality(votes: list[Vote]) -> tuple[str, dict[str, int]]:
    counts: dict[str, int] = {}
    rep: dict[str, str] = {}
    for v in votes:
        key = v.canonical()
        counts[key] = counts.get(key, 0) + 1
        rep.setdefault(key, v.answer)
    winner_key = max(counts, key=counts.get)
    return rep[winner_key], counts
```

## Short answer

相对多数聚合器统计出 `42%` 获得三票、`4.2%` 获得两票，并因此返回了错误的答案，因为它只计算票数而错误阵营票数更多。基于置信度加权的聚合器按聚类累加置信度并将首位聚类的占比与阈值比对。错误阵营拥有更大的置信度总和，因此在阈值为 0.5 时它也返回 `42%`，而在设定更高阈值时则可能返回无胜出者。规范化函数保留字母、数字、点号和百分号，因此 `4.2 percent` 变成 `4.2percent`，并与 `4.2%` 归入不同聚类，从而分散了正确答案的选票。

## Full answer

### 代码运行机制

`canonical` 将答案转为小写、剔除首尾空白，并保留字母数字、点号和百分号。这是课程中粗粒度的语义聚类。`plurality` 针对每个规范化键建立计数，将每个键的第一个原始答案作为其代表保留，并返回票数最多的键。

### 单一文化（Monoculture）案例

| 聚合器 | 规则 | 此时的结果 |
|---|---|---|
| 相对多数票（Plurality） | 票数最多 | 错误，因为三个相关的选票胜过了两个选票 |
| 置信度加权（Confidence-weighted） | 每个聚类的置信度总和，首位聚类必须超过阈值占比 | 错误，因为三个选票携带更多的总置信度，或者当占比低于阈值时无结果 |
| 几何中位数风格（Geometric-median style） | 依据每个聚类的大小及其置信度的紧密程度打分 | 错误，因为三个选票的聚类更大且其置信度也保持紧密 |

课程给出的结论是其局限性所在：当错误的聚类既比正确聚类大又比其更自信时，没有聚合器能解决该问题。这种情况需要模型的多样性或验证，而不是更好的投票。

### 规范化盲区

表达相同数值含义的两个 agent 可能归入两个聚类。`4.2%` 和 `4.2 percent` 在规范化后不同，`four point two percent` 也是如此。正确聚类中的每次分散都会助长错误聚类。在生产中，将数字及其单位规范化为一种形式，或按嵌入相似度聚类，并在日志中将规范化键保留在原始答案旁边，以便审查者能够看到何时发生了分散。

### 两个百分比的来源

场景中的数值是共享内存课程中内存投毒的数字：页面显示 4.2 percent，而检索 agent 写入了 42 percent。共识课程复用它们是为了对具有已知来源的主张投票，这也是投票后使校验器成为可能的基础。

### 相对多数代码看不到的内容

它不知道哪些 agent 共享基础模型，没有置信度，也没有源。它返回票数最多的答案，且不检查投票者是否独立或准确。独立性使正确多数更有可能，但不能保证它，且题干中的三个 agent 共享基础模型，因此它们的错误是相关的。

## Follow-ups

- **Level 3:** 为什么 `plurality` 保留 `rep`？ Expected: 以便它可以返回获胜键的原始答案文本，因为规范化键是比较形式而不是要展示的答案。
- **Level 3:** 在加权投票中没有任何聚类达到阈值占比，结果是什么？ Expected: 无胜出者，并附带权重，以便调用方重试或升级，而不是接受微弱多数。
- **Level 4:** 谄媚迎合案例：两个 agent 以低置信度复制它们看到的第一个答案。哪个聚合器能捕获它，为什么？ Expected: 置信度加权的聚合器，因为复制者携带很小的权重，而相对多数将其计为完整选票。
- **Level 4:** 你将如何测试 `canonical` 的替代方案？ Expected: 必须聚在一起的答案对以及绝不能聚在一起的答案对表格（包括单位变体和拼写出的数字），作为单元测试运行。

## Wrong answers

- "只要至少有五个 agent，相对多数票就没问题。" 只要超过半数，同一模型上的三个 agent 在任何规模下都是多数，且计数从来看不到相关性。
- "规范化足够好，因为它处理了大小写和空格。" 它将 `4.2%` 与 `4.2 percent` 分开，正确聚类中的每次分散都是投给错误聚类的一票。
- "置信度越高意味着答案越正确，因此按其加权即可。" 加权有助于防范低置信度的从众，但在错误聚类同样自信时不起作用。

## Taught in

[共识与容错课程](../../../phases/16-multi-agent-and-swarms/14-consensus-and-bft/)提供了这些聚合器，[共享内存课程](../../../phases/16-multi-agent-and-swarms/13-shared-memory-blackboard/)是这两个百分比的来源。
