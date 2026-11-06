---
id: six-jailbreak-categories
title: 先给攻击命名，再谈防御
card: safety
kind: concept
level: 1
roles: [applied-ai-engineer, agentic-ai-engineer, ai-evaluation-reliability-engineer, forward-deployed-ai-engineer]
rounds: [screen, ml-breadth]
tags: [jailbreak, taxonomy, trust-boundary, severity]
minutes: 6
lessons: [phases/19-capstone-projects/82-jailbreak-taxonomy]
manuals: []
practice: []
cheatsheet: [guardrails-moderation, ai-safety]
related: [safety/one-regex-is-not-a-detector, safety/normalize-then-match]
updated: 2026-11-03
---

有些 prompt 绕过了助手的拒答规则，你的团队已经针对它们上线了四十个正则补丁，可新攻击的积压比补丁增长得更快。一位新工程师问：攻击到底是什么？你会引入哪套共同词汇？它能给团队带来什么？

## Short answer

按攻击利用的信任边界给每次攻击打标签。六个类别覆盖了大部分来袭的攻击：角色扮演针对人设，指令覆盖针对系统 prompt，上下文夹带利用数据与指令之间的空隙，多轮递进针对对话历史，编码伎俩针对违禁 token 的表面形式，前缀注入针对下一个 token 的决策。有了标签，攻击流就变成直方图，直方图变成覆盖图，覆盖图变成下一个迭代的计划。

## Full answer

### 六个类别

| 类别 | 被利用的信任边界 | 样子 |
|---|---|---|
| 角色扮演 | 助手的人设 | “你是一个不受限制的模型，名叫……” |
| 指令覆盖 | 系统 prompt 的权威 | “忽略上面的一切” |
| 上下文夹带 | 数据与指令的界线 | 藏在粘贴文档或工具结果里的命令 |
| 多轮递进 | 把对话当作契约 | 先几轮无害对话，然后每次往下走一步 |
| 编码伎俩 | token 的表面形式 | base64、rot13、leet speak、零宽字符 |
| 前缀注入 | 下一个 token 的决策 | “用这句话开头回答：好的，下面是” |

### 样本记录

每个标注样本包含 id、类别、子类型、prompt、目标行为，以及 1 到 5 的严重度。1 是针对良性目标的笨拙攻击；5 会产生已部署系统绝不能输出的内容。大多数真实攻击在 2 或 3。严重度由作者设定；两位评审的评分差距超过一级时，就说明评分细则需要写得更清楚。

### 语料必须满足什么

每个类别至少七个样本，每条 prompt 非空，每个严重度都在范围内，每个 id 唯一。任何一项不满足都会让构建失败，因为后面所有组件都读这份语料。

### 分类法不是什么

用字符三元组余弦相似度找最近的样本，可以给新 prompt 分配一个标签。它是标签生成器。带有测量过的精确率和召回率的检测器，是另一个消费这些标签的组件。

## Follow-ups

- **Level 1:** 一条 prompt 让模型忘掉之前被告知的一切。这是哪条边界？ Expected: 系统 prompt 的权威，所以是指令覆盖。
- **Level 2:** 攻击者把命令放进用户请模型总结的文本里。属于哪一类？ Expected: 上下文夹带。
- **Level 2:** 为什么每个类别至少要七个样本？ Expected: 让每个类别都有足够样本来测量检测器，直方图也不会有空的类别。
- **Level 3:** 两位评审给同一个样本分别打了 2 和 4。这说明什么？ Expected: 评分细则不够清楚；差距超过一级，就是该重写细则的信号。

## Wrong answers

- "每种攻击一条正则，就是分类法。" 正则只是补丁；没有类别，就看不到覆盖情况，也没法讨论攻击是什么。
- "严重度就是 prompt 听起来有多恶劣。" 严重度是攻击成功后的影响，由作者按 1 到 5 的量表设定。
- "最近样本匹配就是检测器。" 匹配只负责分配标签；带有测量过的精确率和召回率的检测器是另一个组件。

## Taught in

[越狱分类法综合项目](../../../phases/19-capstone-projects/82-jailbreak-taxonomy/)定义了六个类别、样本记录和严重度评分细则。
