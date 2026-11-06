---
id: two-models-disagree
title: 事故分诊 agent 何时该承认不确定
card: production-mlops
kind: concept
level: 2
roles: [ai-evaluation-reliability-engineer, inference-engineer]
rounds: [ml-breadth, system-design]
tags: [ai-sre, incident-triage, adversarial-evaluation, human-approval]
minutes: 8
lessons: [phases/17-infrastructure-and-production/23-sre-for-ai]
manuals: []
practice: []
cheatsheet: [sre-for-ai]
related: [production-mlops/narrow-auto-remediation, production-mlops/prediction-without-action]
updated: 2026-11-03
---

事故分诊 agent 为每条告警给出一个根因。几次自信却错误的回答之后，值班团队不再信任它。SRE 课程里的哪种模式能提高大家对它输出的信任？当这个模式表明 agent 不确定时，团队怎么做？

## Short answer

让两个模型在同一事故上独立运行。两者对根因的判断一致时，置信度高。两者不一致时，系统不替人挑一个，而是把两个假设和各自的证据一起展示，升级给人处理。这个模式以很低的成本过滤掉编造的根因，分歧本身也在告诉响应人员：这次事故不确定。

## Full answer

### 对抗式评估

课程用一个内置该模式的产品来命名它：两个模型各自分析同一事故。结论一致会提高置信度。结论不一致就交给人处理，并展示两个假设。它很简单，却能有效过滤自信的错误答案，因为两次独立分析很少编造出同一个原因。

### 它在架构中的位置

supervisor 把事故拆成子查询。带工具权限的专职 agent 搜索日志、执行指标查询、检索 runbook。supervisor 把结果拼成带证据的假设，交给人审阅；人批准，或者调整调查方向。之后才会执行动作，而且只能从一个很窄的已批准集合里选。双模型检查位于假设这一步，在人看到之前。

### 出现分歧时人做什么

阅读两个假设，以及各自引用的证据。挑其中一个、调整 agent 的调查方向，或者开始人工排查，此时手里有两条线索，而不是零条。课程的分工依然成立：agent 提出假设和查询，人来做判断。

### agent 记住什么

runbook 和故障复盘存放在向量库里，两个模型处理每次事故时都从中检索。运维记忆不会随团队人员更替而流失，新工程师处理第一次事故时，背后就有完整的历史。

### 一致的局限

共享训练数据的两个模型可能一起达成一致、一起出错。一致能提高置信度，但不是证明。要求每个假设都引用背后的日志行和指标查询，让响应人员核对证据，而不是被流畅的表述说服。

## Follow-ups

- **Level 2:** 两个模型结论不同，为什么对响应人员有用？ Expected: 它把事故标记为不确定，并给响应人员两个附带证据的候选原因。
- **Level 3:** 两个模型一致，但都错了。怎样发现？ Expected: 要求每个假设引用响应人员能核对的证据，并且在任何动作执行前保留人工批准。
- **Level 3:** 这个模式的代价是什么？ Expected: 每次事故跑两次模型，再加上较慢那次的延迟。课程说人工排查的前二十分钟可以自动化，与这二十分钟相比，这点代价很小。

## Wrong answers

- "让同一个模型在温度为零时回答两次。" 同一模型重复运行，盲点也相同。这个模式需要相互独立的分析。
- "两个模型一致的假设可以自行触发修复。" 一致只是提高置信度。动作仍由人批准，而且只有很窄的动作才会自动化。
- "出现分歧说明这个 agent 没用。" 分歧说明事故不确定，这正是该让人来看的时候。

## Taught in

[AI 的 SRE 课程](../../../phases/17-infrastructure-and-production/23-sre-for-ai/)讲解了对抗式评估模式，以及带人工批准的 supervisor 架构。
