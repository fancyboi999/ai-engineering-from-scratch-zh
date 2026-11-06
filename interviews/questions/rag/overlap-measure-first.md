---
id: overlap-measure-first
title: 用一次消融实验了结分块重叠之争
card: rag
kind: tradeoff
level: 2
roles: [applied-ai-engineer, ai-data-engineer]
rounds: [design-review, ml-depth]
tags: [chunking, overlap, index-cost, ablation]
minutes: 8
lessons: [phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag, phases/11-llm-engineering/06-rag]
manuals: []
practice: []
cheatsheet: [rag]
related: [rag/chunk-size-by-query-type]
updated: 2026-11-03
---

分块器让相邻块重叠 100 个 token。上次语料刷新后，索引大小和嵌入费用都增加了。同事说重叠必须保留，因为它能保护遭边界切断的句子。你怎样裁决？

## Short answer

用消融实验裁决，而非凭意见。使用同一分层查询集，分别以零重叠和当前重叠量运行 recall@5 评估，只有指标改善才保留重叠。近期研究发现，重叠常常没有可测收益，索引成本却随重叠量增加。

## Full answer

### 重叠的由来

固定窗口基线每 N 个 token 切一次，不考虑句子。RAG 课程展示了经典布局：512-token 块，重叠 50 个 token，第一块含 token 0 到 511，第二块含 462 到 973。重复尾部让不巧切断的句子能在下一块中完整出现。

### 为什么现在没那么必要

递归分块器依次尝试段落、换行、句末和空格，边界位于自然停顿处，因此重叠原本解决的问题大多不再存在。分块课程把重叠归入盲目照搬的惯例：2026 年的研究在所测场景中没有发现任何可测收益，而每个重叠 token 都要嵌入和存储两次。

### 实验

1. 固定分块器、嵌入模型和查询集。
2. 使用 512-token 递归切分，分别测试零重叠和当前重叠量。
3. 按查询切片比较 recall@5，并比较文本块数量。
4. 只在确有收益的切片保留重叠，并在配置旁记录实验依据。

课程里的分块器技能默认零重叠；超过 20% 的重叠，除非有消融实验证明有帮助，否则拒绝。

## Follow-ups

- **Level 2:** 固定窗口为什么需要重叠？ Expected: 它只按数量切分，可能截断句子；重复尾部让句子在下一块完整出现。
- **Level 2:** 递归分块器怎样处理？ Expected: 依次按段落、行和句子分隔符切分，使边界落在自然停顿处。
- **Level 3:** 分块器技能对重叠有什么规则？ Expected: 默认零；没有消融证据就拒绝超过 20% 的重叠。
- **Level 3:** 消融只在一种文档类型上有收益，上线什么方案？ Expected: 仅为该类型启用重叠并记录证据；语料或嵌入模型变化后重跑。

## Wrong answers

- "重叠免费，嵌入很便宜。" 每个重叠 token 都要嵌入和存储两次，索引成本与重叠量成正比增长。
- "博客推荐 20% 重叠。" 研究在所测场景未发现收益；结果取决于自己的语料，应实际测量。
- "全部删除，不需要测试。" 消融成本低，收益依赖语料；确有边界损失的切片会在实验中体现。

## Taught in

[分块策略](../../../phases/05-nlp-foundations-to-advanced/23-chunking-strategies-rag/)课程报告重叠研究并规定技能规则，[RAG](../../../phases/11-llm-engineering/06-rag/)课程展示重叠最初要解决的固定窗口布局。
