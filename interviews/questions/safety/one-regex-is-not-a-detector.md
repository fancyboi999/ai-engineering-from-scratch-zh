---
id: one-regex-is-not-a-detector
title: prompt 注入防御只有一条正则
card: safety
kind: debug
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [prompt-injection, detector, precision, recall]
minutes: 8
lessons: [phases/19-capstone-projects/83-prompt-injection-detector]
manuals: []
practice: []
cheatsheet: [guardrails-moderation]
related: [safety/six-jailbreak-categories]
updated: 2026-11-03
---

一位同事上个月上线了一个 prompt 注入防御：一条匹配“ignore previous instructions”的正则。这周，一条写着“disregard the prior guidance”的 prompt 直接穿过去了。同事想再加第二条正则。上线任何东西之前，你要先问什么？检测器应该是什么样子？

## Short answer

先要每个攻击类别在标注语料上的精确率和召回率；现有防御从没测过，所以没人知道它覆盖了什么。检测器是一个函数：输入 prompt，输出一个 0 到 1 之间的置信度和最匹配的类别。把它分层构建：归一化步骤、子串规则、token 级正则，每条规则都带类别和基础分；每次改动都在测试语料和良性集上跑一遍。

## Full answer

### 为什么单条正则只是表演

没人知道它的精确率、召回率，也不知道它覆盖哪些类别。下一次换个说法就漏了，团队怪模型，然后在第一个未经测量的补丁上再打第二个。靠谱的做法要有可测量的行为。

### 检测器的形状

一个规则列表。每条规则有名字、类别，以及一个把 prompt 映射到单位区间的打分函数。规则要么触发，要么不触发；触发时，它的分数就是它的置信度。聚合器返回判定：分数最高的类别，以及该类别里的最高分。没有规则触发时，返回 0 和 benign 标签。

### 三层，按顺序

1. **归一化。** 去掉零宽字符和双向控制字符，把工作副本转成小写，解码 base64、rot13 和 hex，把 leet 数字映射回字母。原始文本和副本并排保留。
2. **子串规则。** 手写的短语，比如“ignore previous”“as an unrestricted”“answer starting with”，每条都带类别和基础分。
3. **正则规则。** token 级模式，用来抓一整个家族，比如以 ignore 的词干开头、后面跟 all、prior、previous 或 earlier 的模式。题目里那种换说法的攻击，要靠家族规则来抓，而不是再加一条字面量。

### 测量

指标运行器读取分类法语料和一份良性 prompt 列表。对某个类别来说：真阳性是该类别的样本被判为该类别；假阳性是其他类别的样本或良性文本被判为该类别；假阴性是该类别的样本被判为其他类别或良性。它按类别写出精确率、召回率和原始计数，也会暴露检测器有意放宽的地方，比如看起来无害的角色扮演。

### 它的位置

检测器只是门控组合的多个信号之一。它在编码伎俩和指令覆盖上向召回率倾斜；在角色扮演上接受一般的精确率，因为角色扮演和创意写作界限模糊，要靠其他信号处理。

## Follow-ups

- **Level 2:** 给“指令覆盖”这一类定义假阳性。 Expected: 样本本来属于别的类别，或者文本是良性的，而判定类别是指令覆盖。
- **Level 2:** 为什么把规则写成数据而不是代码？ Expected: 每条规则都有名字、类别和分数，可以审计；新增规则不需要改引擎。
- **Level 3:** 为什么检测器在某一类上容忍的误触发比其他类多？ Expected: 角色扮演攻击和正当的创意请求界限模糊；门控在那里加入其他信号，而检测器在编码和覆盖上向召回率倾斜。
- **Level 3:** 怎么决定删哪条规则？ Expected: 对每条规则，计算删掉它会损失多少真阳性，按这个边际贡献排序。

## Wrong answers

- "加上第二条正则就继续往下走。" 未经测量的补丁会越堆越多；没有按类别的精确率和召回率，就说不清这两条覆盖了什么。
- "用模型分类器换掉规则。" 分类器只是又一个信号；规则可以审计，指标运行器用同样的方式测量两者。
- "反正模型本来就该拒绝。" 检测器存在的意义就是让门控不依赖单独一层；把锅甩给模型，正是第一条正则被上线的原因。

## Taught in

[Prompt 注入检测器综合项目](../../../phases/19-capstone-projects/83-prompt-injection-detector/)把检测器定义为可测量的函数，给出了三层结构和按类别的指标。
