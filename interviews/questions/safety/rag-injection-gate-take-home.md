---
id: rag-injection-gate-take-home
title: 给检索问答助手搭一套安全门控
card: safety
kind: take-home
level: 4
roles: [agentic-ai-engineer, applied-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [take-home]
tags: [safety-gate, prompt-injection, context-smuggling, output-classifier, trace]
minutes: 60
lessons: [phases/19-capstone-projects/83-prompt-injection-detector, phases/19-capstone-projects/82-jailbreak-taxonomy, phases/19-capstone-projects/87-end-to-end-safety-gate, phases/19-capstone-projects/85-content-classifier-integration]
manuals: []
practice: []
cheatsheet: [guardrails-moderation]
related: [safety/one-regex-is-not-a-detector, safety/output-router-severity, safety/gate-aggregation-table]
updated: 2026-11-03
---

带回家完成的作业。我们提供一份标注好的攻击 prompt 测试语料、一份良性 prompt 列表，以及一个基于检索文档回答问题的模拟助手。请围绕它搭一套安全门控：一个输入检测器，它对每个攻击类别的覆盖都要测量；一个输出侧，路由器后面至少挂两个分类器；每个请求一条 trace。检索到的文档里可能夹带指令。你交付什么，怎么测量，又要说明哪些没做？

## Short answer

交付这些东西：规则以数据形式存放、带归一化步骤的检测器；一个指标运行器，在测试语料和良性列表上按类别写出精确率和召回率；一个输出路由器，挂个人数据分类器和指令泄露分类器及其脱敏器；一个在生成前、生成中、生成后都运行的门控，用确定性的聚合表，并为每个请求记录每个检查点的判定。语料里没有藏在检索文档中的指令，所以要为它加一个类别和一个规则家族。还要说明：检测器在看似无害的角色扮演上是有意判错的，真实模型和真实沙箱不在范围内，阈值也没有在留出数据上调过。

## Full answer

### 检测器

规则放在一个数据文件里，每条有名字、类别、分数，以及一个子串或一条正则。归一化步骤去掉零宽字符，把副本转成小写，解码 base64、rot13 和 hex，映射 leet 数字，同时保留原始文本。聚合器返回分数最高的类别及其置信度，没有命中时返回 0 和 benign。指标运行器读取分类法产物，给每个测试样本和每个良性 prompt 打分，把按类别的精确率、召回率和原始计数写进报告文件。

### 检索带来的问题

检索文档里的指令属于上下文夹带：它利用数据与指令之间的空隙，而用户这一轮看起来完全无害。测试语料有六个类别，没有一个对应经由检索进来的攻击。所以要补上分类法留作练习的第七个类别，为它写大约十个测试样本，再为藏在工具结果和文档里的指令加一个规则家族。测量这一类的召回率提升，以及在良性列表上的误报代价。

### 输出侧

一个个人数据分类器，用正则匹配邮箱、电话号码和形似卡号的字符串；一个指令泄露分类器，用三元语法（trigram）重合度把输出和已知的系统 prompt 做比较。每个分类器返回严重度，并拥有自己的脱敏器。路由器取最大严重度，high 映射为拦截，medium 为脱敏，low 为警告，none 为记录日志。

### 门控与 trace

生成前运行检测器：非良性类别且置信度不低于 0.85 就拦截，否则把信号附上。生成中，流上的过滤器在两个块的窗口里盯着续写短语，命中就停掉输出流。生成后，路由器和规则在全文上运行。聚合器取最大等级。每个请求都写一条 trace，内容包括 id、prompt、检测器判定、流判定、生成后的各项判定、最终动作、最终输出和延迟。把整份语料和良性列表都跑一遍，按类别打印汇总计数。

### 测什么

检测器按类别的精确率和召回率；良性 prompt 上的误报数；门控按类别的动作计数；阈值从 0 扫到 1，每个类别一条精确率与召回率曲线。

### 不做什么，并且说出来

用真实模型替换模拟助手。为模型可能执行的任何东西准备真实沙箱。调好的阈值，因为这份语料就是规则的训练集，在它上面调参会报出一个站不住的数字。神经网络分类器；它们接进来时管道不变。真实用户上的过度拒答，这需要一套来自生产流量的良性测试集。

## Follow-ups

- **Level 3:** 为什么检索文档需要单独的类别和规则？ Expected: 攻击藏在用户从没写过的数据里，所以用户这一轮看起来无害；没有对应的测试样本，这种攻击的召回率就没被测过。
- **Level 4:** 怎么证明新规则家族没有损害良性请求？ Expected: 列出良性列表在加规则前后的误报数，和新类别的召回率提升放在一起。
- **Level 4:** 把模拟助手换成真实模型后，你第一件事做什么？ Expected: 让整份语料重新走一遍门控，按类别看 trace 汇总；然后在留出的数据切分上调聚合阈值，按类别报告精确率和召回率。

## Wrong answers

- "检测器够好，输出侧就不需要了。" 检索文档能让攻击绕过所有输入规则，模型也可能自己泄露个人数据；这些都要在输出侧抓住。
- "把检测器判错的案例藏起来。" 报告要公开那些有意的漏判，门控的其他层才能围绕它们设计。
- "在测试语料上调阈值。" 这份语料是规则的训练集；在它上面调出来的数字站不住。

## Taught in

[prompt 注入检测器综合项目](../../../phases/19-capstone-projects/83-prompt-injection-detector/)实现了检测器和指标运行器，[越狱分类法综合项目](../../../phases/19-capstone-projects/82-jailbreak-taxonomy/)把第七个类别留作练习，[内容分类器集成综合项目](../../../phases/19-capstone-projects/85-content-classifier-integration/)实现了输出路由器，[端到端安全门控综合项目](../../../phases/19-capstone-projects/87-end-to-end-safety-gate/)把它们组合起来并加上 trace。
