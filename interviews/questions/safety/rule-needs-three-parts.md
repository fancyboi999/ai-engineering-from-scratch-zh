---
id: rule-needs-three-parts
title: 分类器看不见的约束
card: safety
kind: design
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [rules-engine, constitution, predicates, fixer, yaml]
minutes: 9
lessons: [phases/19-capstone-projects/86-constitutional-rules-engine]
manuals: []
practice: []
cheatsheet: [guardrails-moderation]
related: [safety/output-router-severity]
updated: 2026-11-03
---

客服助手在拒绝请求时，必须给出下一步建议才能结束；编程助手的每个代码回答，结尾必须是一个可运行的代码块或一条写明的假设。这两条都不是内容分类器能识别的东西。设计一个组件来强制执行这类约束，并说明违规之后会发生什么。

## Short answer

把这些约束写进一个声明式规则文件，它和代码一起放在版本控制里，有自己的评审流程。每条规则包含名字、严重度、解释、一个说明规则何时适用的谓词，以及一个回复必须满足的谓词；原子检查用 all of、any of 和 not 组合。违规后，修复器做一次局部的声明式修改，引擎再检查一遍修订版，两个版本之间的结构化 diff 写进 trace。

## Full answer

### 为什么不用分类器

这些是契约式约束：针对回复、对话和策略的谓词。非工程师也应该能读懂。分类器识别模式；规则陈述契约。

### 规则的形状

```yaml
- name: end-with-runnable-or-assumption
  severity: medium
  applies_when:
    contains_regex: '```python'
  must:
    any_of:
      - ends_with_regex: '```\s*$'
      - contains_regex: 'assumption:'
  explanation: "Code responses must end in a closing fence or an explicit assumption."
  fix:
    append_if_missing: "\n\nAssumption: example inputs are valid."
```

原子谓词有：包含正则、不包含正则、以正则结尾、以正则开头、最多词数、最少词数。组合方式有：all of、any of、not。引擎先计算适用范围谓词；规则不适用时记为不适用，这样报告能显示这条规则确实被评估过。否则，必须满足的谓词给出通过或违规。严重度分为 low、medium 和 high，门控对待 high 规则违规和 high 分类器判定一样：拦截。

### 随项目提供的宪法

六条规则：拒答必须包含建议或引导；代码回复必须干净地收尾；示例数据里不能出现邮箱或电话形状的字符串；以引用短语开头的行必须带括号引注；两个内部库的名字绝不能出现；回复不能超过 800 词。前五条里的最后两条是 high；其余是 low 或 medium。

### 违规之后

修复器是按规则名映射的一组声明式操作：缺失时追加、缺失时前置、正则替换。它只做局部修改；结构性重写属于另一层。引擎在修订版上再跑一遍，草稿与修订版之间增、删、改记录组成的 diff 写进日志，评审者可以长期审计修复器。

## Follow-ups

- **Level 2:** 为什么要把谓词拆成适用范围和必须满足两部分？ Expected: 这样规则可以处于范围之外并明确说出来；回复里没有代码时，代码规则记为不适用而不是通过，报告也能显示引擎看过了。
- **Level 2:** 为什么这个文件用 YAML，而不写在代码里？ Expected: 非工程师能读、能评审，它有自己的评审和历史，引擎保持通用。
- **Level 3:** 修复器不能做什么？为什么这是特性？ Expected: 结构性重写；局部的声明式修改让它的行为可预测，并且能通过 diff 审计。
- **Level 3:** 门控怎么处理 high 严重度的规则违规？ Expected: 和 high 分类器判定一样，即拦截。

## Wrong answers

- "训练分类器去检测缺失的下一步建议。" 这个约束是针对回复的谓词；带解释的规则可读、可测，分类器两样都做不到。
- "让模型自己修复违规。" 修复器是确定性的，diff 才能审计；让模型改写属于另一层。
- "规则就是一条正则。" 规则由名字、谓词和解释组成；三样缺一样，就只是感觉。

## Taught in

[Constitutional 规则引擎综合项目](../../../phases/19-capstone-projects/86-constitutional-rules-engine/)给出了规则语法、修复器和 diff。
