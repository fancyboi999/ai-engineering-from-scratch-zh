---
id: pass-at-k-reading
title: pass@1 是 0.6，pass@5 是 0.95
card: evaluation
kind: tradeoff
level: 2
roles: [agentic-ai-engineer, ai-evaluation-reliability-engineer, applied-ai-engineer]
rounds: [ml-depth, design-review]
tags: [pass-at-k, agent-eval, verifier, variance]
minutes: 8
lessons: [phases/19-capstone-projects/27-eval-harness-fixture-tasks]
manuals: []
practice: []
cheatsheet: [eval-driven-agents, agent-benchmarks]
related: [evaluation/two-pass-at-k-formulas]
updated: 2026-11-03
---

你的编码 agent 在 fixture 任务集上的 pass@1 是 0.6，pass@5 是 0.95。一位经理认为这个 agent 不及格，另一位认为它及格。这两个数字各说明什么？报告里该放什么？

## Short answer

pass@1 说明大约十个任务里有六个，第一个样本就能解决。pass@5 说明几乎每个任务在五个样本里至少有一个通过，所以正确答案通常就在手边，差距在于挑选。两个都报，并附上每个任务的原始通过次数，因为只看 pass@k 会掩盖一个二十次才成功一次的 agent。

## Full answer

### harness 算什么

harness 把每个 fixture 任务跑 k 次。每个样本都经过一个确定性的验证器：某个文件与预期文件相同、某个正则匹配，或某条 shell 命令退出码为 0。每个任务的通过率 p 是通过数除以样本数。pass@k 是 k 个样本里至少有一个通过的概率。harness 还保存原始计数，让评审人能看到通过率背后的方差。

### 如何解读差距

pass@1 低而 pass@5 高，说明这个 agent 是随机的，而不是没能力。办法是采样加排序：生成几个候选，让验证器来选。不一定需要更多训练。如果生产环境里没有挑选器，用户拿到的就是第一个样本，所以 pass@1 才是用户感受到的数字。

### 为什么必须同时保留两个数字

pass@k 会掩盖真实的失败。一个二十次才通过一次的 agent，pass@20 看起来还不错，实际却没用。harness 把两个数都打印出来，哪位经理都没法只看一个就下结论。

### 报告的其余部分

harness 是为了阻止三类失败：未经验证的通过，即 agent 自称成功却没人检查；没被发现的回退，即一次 prompt 修改让显眼的任务好了 4%，让不起眼的任务差了 14%；逐任务的漂移，即周一跑了 100 个任务，周五因为五个被改名只跑了 95 个。所以报告包含 pass@1、pass@k、逐任务计数、平均和第 95 百分位延迟，以及平均成本，而且每次都基于同一份固定的任务列表。

## Follow-ups

- **Level 2:** 生产环境里需要什么，才能把高 pass@5 变成高 pass@1？ Expected: 一个能挑出通过样本的验证器，比如真正运行的测试；没有它，用户拿到的是第一个样本。
- **Level 2:** harness 为什么在通过率旁边打印原始通过次数？ Expected: 为了展示每个任务的方差，并暴露那种试很多次才通过一次的任务。
- **Level 3:** 从周一到周五通过率上升了，期间有五个 fixture 被改名。这个提升是真的吗？ Expected: 不是；任务集变了，两次运行没法比，harness 必须每次按固定顺序跑全部 fixture。
- **Level 3:** harness 是为了防止哪三种失败？ Expected: 未经验证的通过、跨任务没被发现的回退，以及任务集漂移。

## Wrong answers

- "pass@5 才是真实分数。" 它衡量的是有挑选时的上限；除非你做了挑选器，否则用户只拿到一个样本。
- "pass@1 是 0.6，说明 agent 坏了。" 它说明第一个样本在十个任务里失败四个；高 pass@5 说明能力是有的，差距在挑选。
- "相信 agent 自己报告的成功。" 自报成功正是 harness 要消除的第一种失败；由确定性验证器来判定。

## Taught in

[基于 fixture 任务的评测 harness 综合项目](../../../phases/19-capstone-projects/27-eval-harness-fixture-tasks/)定义了 pass@1 和 pass@k，并解释了为什么两个都要报。
