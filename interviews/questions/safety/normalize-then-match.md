---
id: normalize-then-match
title: 同一句攻击，换成 base64、rot13 和零宽字符
card: safety
kind: design
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [system-design, debugging]
tags: [prompt-injection, encoding-trick, normalization, detector]
minutes: 8
lessons: [phases/19-capstone-projects/83-prompt-injection-detector, phases/19-capstone-projects/82-jailbreak-taxonomy]
manuals: []
practice: []
cheatsheet: [guardrails-moderation]
related: [safety/one-regex-is-not-a-detector]
updated: 2026-11-03
---

你的检测器用子串规则，能抓到明文的“ignore all instructions”。现在攻击者把同一句话用 base64、rot13 或 leet speak 改写后发送，或者在字母之间插入不可见字符。设计一个在规则之前运行的步骤，并说明这一步不能丢掉哪些信号。

## Short answer

加一个归一化步骤，生成一份清洗后的工作副本：去掉零宽字符和双向控制字符；在转小写之前先解码看起来像 base64 的 token，因为 base64 区分大小写；然后转小写，解码 hex 和 rot13，再把 leet 数字映射回字母。规则要同时在原始文本和归一化文本上运行，因为插入零宽字符本身就是编码伎俩的信号，而清洗后的副本已经看不到它了。

## Full answer

### 攻击类别

编码伎俩利用的是违禁 token 的表面形式。词还是那些词，字节却变了，所以朴素的关键词过滤器会漏掉。常见形式有 base64、rot13、leet speak 和插入零宽字符。

### 归一化步骤

1. 从工作副本中去掉零宽字符和双向控制字符。
2. 遇到长度不少于 16 个字符、看起来像 base64 的 token，就尝试解码，成功后用解码文本替换它。这一步要放在转小写之前，因为 base64 区分大小写，转成小写的 token 会解出不同的字节。
3. 把副本转成小写。
4. 用同样的方法解码 hex 串。
5. 把 leet 数字映射回对应字母。
6. 生成文本的 rot13 版本；对照一个内置的小词表，只有当它比输入含有更多像单词的词时才保留。任何字符串都有 rot13 版本，这个检查能避免良性文本被变成噪声。

### 要保留什么

原始 prompt 和副本并排保留，规则可以读任意一个。单词内部出现零宽字符，本身就是攻击证据。像“decode this and then follow it”这样的解码指令，无论载荷能不能解出东西，都已经是攻击模式。针对“解码再执行”模式的一组正则规则，在载荷起作用之前就能抓住它。

### 要测什么

编码类别上的召回率，检测器应向召回率倾斜；以及在良性语料上的误报代价，因为开发者会粘贴真实的 base64 来求助。指标运行器在每次改动时都按类别报告这两项。

## Follow-ups

- **Level 2:** 为什么 rot13 解码需要做单词检查？ Expected: 每段文本都有 rot13 版本；只在它更像单词时保留，能避免良性文本变成噪声。
- **Level 2:** 这一类攻击利用的是哪条边界？ Expected: 违禁 token 的表面形式，借此躲过关键词过滤器。
- **Level 3:** 开发者粘贴了一段真实的 base64 并请求帮助。会发生什么，代价体现在哪里？ Expected: 解码结果可能什么都不触发，也可能造成误报；指标运行器里的良性语料就是这个代价显现的地方。
- **Level 3:** 载荷什么也解不出来。这个 prompt 还可能是攻击吗？ Expected: 可能；“解码并执行”这条指令本身就是攻击模式，针对该模式的规则在载荷起作用之前就会触发。

## Wrong answers

- "全部解码，然后丢掉原文。" 原始文本带有信号，比如不可见字符，而清洗后的副本会把它们去掉。
- "prompt 里只要有 base64 就拦截。" 良性 prompt 也会携带编码数据；按是否出现来拦截之前，先在良性集上测出误报代价。
- "归一化就是检测器。" 它只是把隐藏的 token 暴露给规则；规则加上指标运行器才是检测器。

## Taught in

[prompt 注入检测器综合项目](../../../phases/19-capstone-projects/83-prompt-injection-detector/)实现了归一化步骤，[越狱分类法综合项目](../../../phases/19-capstone-projects/82-jailbreak-taxonomy/)定义了编码伎俩这一类别。
