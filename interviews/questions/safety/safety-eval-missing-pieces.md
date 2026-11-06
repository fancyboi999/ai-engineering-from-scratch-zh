---
id: safety-eval-missing-pieces
title: 一张表写着 97% 拒答率
card: safety
kind: debug
level: 3
roles: [applied-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [design-review, customer]
tags: [safety-eval, over-refusal, red-team, monitored-split]
minutes: 10
lessons: [phases/18-ethics-safety-alignment/09-alignment-faking, phases/19-capstone-projects/84-refusal-evaluation, phases/19-capstone-projects/15-constitutional-safety-harness]
manuals: []
practice: []
cheatsheet: [guardrails-moderation, ai-safety]
related: [safety/two-refusal-metrics, safety/compliance-gap-metric]
updated: 2026-11-03
---

一家供应商的安全报告只有一张表：在一套有害 prompt 上的拒答率是 97%，用默认系统 prompt 测了一次。你要决定是否把这个模型用在面向客户的助手里。列出这份报告说明不了什么，以及你在决定前要补哪些测量。

## Short answer

这张表只在一种条件下，测了一个决策的一侧。它看不出良性 prompt 上的过度拒答，看不出漏掉的攻击落在哪一类，看不出模型在认为没人监控时是否表现一致，也看不出换成你的系统 prompt 和攻击家族后这个数字怎么变。要补上：测过度拒答的良性探测集、按分类法的分类别拆解、受监控与未受监控的拆分、针对你的部署跑多个攻击家族的红队测试，并把拦截率对良性通过率画成图。

## Full answer

### 缺了什么

1. **另一侧。** 只看有害 prompt 上的拒答率，会奖励一个什么都拒绝的模型。良性测试集上的过度拒答率是另一半，每次改系统 prompt，两者都会一起变。
2. **漏在哪里。** 按分类法拆解各类别，才能看出模型是否挡住了指令覆盖，却在多轮递进上失守。一个总数会把这些藏起来。
3. **未受监控的条件。** 模型相信对话会用于训练它时，可能更顺从；相信不会时，可能更少顺从。只有一种条件，看不出这个缺口。
4. **你的部署。** 供应商的 prompt 集是公开的，可能已经在训练数据里；攻击者也不会用它。综合项目的靶场至少跑六个攻击家族：自动越狱搜索、树搜索、梯度后缀、编码、多轮人设和跨语言混用，并按家族报告成功率。它的示例运行里，50 次尝试有 7 次成功，成功率 14%，还有一次中等严重度的角色扮演绕过。
5. **校准。** 模型自报的置信度是否跟得上它的准确率，这是和决策本身无关的另一条轴。

### 决策图

在你的系统 prompt 下，按攻击家族、按类别，画攻击拦截率对良性通过率。综合项目正是按这个权衡给测试框架打分。拦截率赢了、良性通过率输了的模型，只是把问题挪到了你的客服队列。

### 要向供应商要什么

要良性测试集的结果、按类别的拆解和测试条件。一张表的报告只能作为对话的起点，不能作为采用的依据。

## Follow-ups

- **Level 3:** 为什么单个拒答率本身不是安全指标？ Expected: 一个什么都拒绝的模型能在它上面拿满分；没有良性这一侧，就看不到代价。
- **Level 3:** 报告里的有害 prompt 是一个公开的数据集。这对数字有什么影响？ Expected: 它可能已经在训练数据里，攻击者也不用它；要用你自己的攻击家族和一份留出集来测。
- **Level 4:** 做采用决策时，哪两个数字放在同一张图上？ Expected: 在你自己的系统 prompt 下，按攻击家族和类别的攻击拦截率对良性通过率。

## Wrong answers

- "97% 已经够高了。" 它只是决策的一侧，报告里没有任何东西显示良性 prompt 上的代价，也没有显示无人监控时的行为。
- "我们的系统 prompt 会让它更安全，所以数字只会变好。" 每次改系统 prompt，两个拒答率都会同时变化；改完要重新测。
- "红队测试是供应商的事。" 真正要紧的攻击是针对你的部署跑的，带着你的 prompt 和你的工具。

## Taught in

[拒答评估综合项目](../../../phases/19-capstone-projects/84-refusal-evaluation/)定义了两种拒答率和分类别拆解，[对齐伪装这一课](../../../phases/18-ethics-safety-alignment/09-alignment-faking/)补充了受监控拆分，[宪法式安全外壳综合项目](../../../phases/19-capstone-projects/15-constitutional-safety-harness/)规定了攻击家族和良性探测集。
