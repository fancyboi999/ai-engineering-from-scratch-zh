---
id: red-team-range-design
title: 不需要你值守也能运转的红队靶场
card: safety
kind: design
level: 4
roles: [applied-ai-engineer, ai-evaluation-reliability-engineer, agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [red-team, attack-families, over-refusal, cvss, self-critique]
minutes: 15
lessons: [phases/19-capstone-projects/15-constitutional-safety-harness, phases/19-capstone-projects/82-jailbreak-taxonomy, phases/19-capstone-projects/84-refusal-evaluation]
manuals: []
practice: []
cheatsheet: [guardrails-moderation, constitutional-classifiers]
related: [safety/safety-eval-missing-pieces, safety/six-jailbreak-categories]
updated: 2026-11-03
---

你负责一个面向客户的助手的安全，它基于开放权重模型，前面有一条检索流水线。设计一个不需要你值守也能运转的红队靶场：有哪些攻击家族，怎么排期，什么算一条发现，加固时怎么保持助手有用，以及怎么证明一项训练期干预确实有效。

## Short answer

在各自独立的队列上排期至少六个攻击家族：自动越狱搜索、树搜索攻击、梯度后缀攻击、编码攻击、多轮人设攻击和跨语言混用，每个家族报告成功率。每次成功都变成一条发现，带分类法 id、严重度评分和披露时间表。在良性探测集上跟踪过度拒答率，和拦截率放在一起，让权衡出现在同一张图上；用留出集上干预前后的无害性差值来证明自我批评干预有效。

## Full answer

### 目标和它的各层

助手处在一条分层流水线里：输入清洗层去掉零宽字符并解码常见编码，然后是策略护栏、分类器门控、模型本身、带个人数据清除的输出过滤器，以及处理被标记输出的人工审核层。靶场攻击的是整套系统，不是裸模型，因为用户接触到的就是整套系统。

### 攻击家族

| 家族 | 做什么 |
|---|---|
| 自动越狱搜索 | 攻击模型不断改写 prompt，直到有一条成功 |
| 树搜索攻击 | 同样的搜索，加上分支和剪枝 |
| 梯度后缀攻击 | 针对开放权重模型优化出的对抗后缀 |
| 编码攻击 | 用 base64、rot13 和字符伎俩对付清洗层 |
| 多轮人设 | 先用几轮热身，再引入人设并逐步加码 |
| 跨语言混用 | 混用多种语言，绕过只懂英语的分类器 |

每个家族报告一个成功率。综合项目的示例运行里，50 次尝试有 7 次成功，成功率 14%，其中一次角色扮演绕过的评分为中等的 4.8。检索流水线还会带来综合项目留作练习的第七个家族：通过检索文档的间接注入，它需要额外的专门防御。

### 发现记录

一条结构化记录，包含分类法 id、攻击家族、按标准漏洞评分体系根据攻击向量、复杂度和影响算出的严重度、披露时间表和缓解计划。发现写进一个队列。截图不算发现。

### 保持有用

按同样的排期运行良性探测集，跟踪过度拒答率，出现退化就告警。用权衡来给测试框架打分，也就是拦截率对良性通过率，这样一边的提升如果以另一边为代价，就能看出来。可以考虑“拒绝但给出帮助”的模式，并测量它对良性集的影响。

### 证明干预有效

整理大约一千条有害尝试 prompt。模型先写草稿，批评模型对照一份成文的宪法给草稿打分，不合格的草稿被改写，然后用改进后的样本对微调模型。在留出评估集上测干预前后的无害性，旁边列出干预前后的良性通过率。综合项目给这个差值的权重是 100 分里的 20 分；覆盖至少两种语言、至少六个家族占 25 分，权衡占 20 分，文档占 20 分，自动化占 15 分。

## Follow-ups

- **Level 3:** 为什么每个攻击家族跑在自己的队列上？ Expected: 各驱动的成本和耗时不同，慢的梯度攻击不能挡住便宜的编码扫描；按家族统计成功率也需要按家族运行。
- **Level 4:** 检索流水线带来了哪个那六个家族没覆盖的家族？ Expected: 通过检索文档的间接注入，作为第七个家族单独测量，并配有专门的额外防御。
- **Level 4:** 怎么证明自我批评训练是真的有帮助，而不是让拒答变多了？ Expected: 留出评估集上的无害性差值，旁边列出前后的良性通过率；如果提升伴随着良性通过率下降，那是过度拒答，不是安全。

## Wrong answers

- "上线前跑一次红队就行。" 攻击会演化；靶场按排期运行，发现进入下一个迭代。
- "拦截率就是指标。" 指标是拦截率对良性通过率；一个什么都拦的模型，拦截率是满分。
- "发现就是一张坏输出的截图。" 发现要带分类法 id、严重度评分、时间表和缓解措施，否则没人能据此行动。

## Taught in

[宪法式安全外壳综合项目](../../../phases/19-capstone-projects/15-constitutional-safety-harness/)规定了各层、攻击家族、评分和自我批评差值，[越狱分类法综合项目](../../../phases/19-capstone-projects/82-jailbreak-taxonomy/)提供了发现所引用的 id，[拒答评估综合项目](../../../phases/19-capstone-projects/84-refusal-evaluation/)定义了过度拒答率。
