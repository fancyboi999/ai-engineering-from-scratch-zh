---
id: tool-call-security-rules
title: 设计 agent 工具调用背后的执行器
card: prompting-structured-output
kind: design
level: 3
roles: [agentic-ai-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, design-review]
tags: [function-calling, security, allowlist, sandbox, argument-validation]
minutes: 15
lessons: [phases/11-llm-engineering/09-function-calling]
manuals: []
practice: [tool-call-parser]
cheatsheet: [tool-calling]
related: [prompting-structured-output/tool-description-is-a-prompt, prompting-structured-output/structured-output-vs-function-call]
updated: 2026-11-03
---

为一个 agent 设计执行层，它可以代表用户查询数据库、运行小段代码和读取文件。调用哪个工具由模型决定。执行器要强制执行哪些规则？它绝不做什么？

## Short answer

执行器绝不把模型生成的 SQL 或 shell 文本直接交给系统。它暴露一份带类型化参数的具名函数白名单，执行前按 schema 校验每个参数，工具结果回到模型之前先做清理，并把每次对话的调用次数限制在 10 到 20 次。对代码来说，进程内过滤器只是教学用具，不是安全边界；不可信代码要在单独的进程或容器里运行。

## Full answer

### 五条规则

1. **绝不把生成的 SQL 交给数据库。** 模型能够、也一定会生成破坏性语句和注入。课程练习把这个工具设计成只接收表名和过滤条件，表在白名单上，运算符限制在一个小集合里；查询由你的代码构建。
2. **函数白名单。** 模型只能调用你定义的东西。如果内部有五十个函数，只暴露用户需要的五个。绝不构建按名字调用任意函数的通用工具。
3. **校验参数。** 执行前按 schema 检查必填字段、未知字段、类型和枚举成员；一个城市名也可能夹带注入字符串。
4. **清理结果。** 工具结果会原样回到 prompt 里，所以要去掉密钥、个人数据和内部错误，并把结果里出现的指令当作工具投毒处理。
5. **限制调用次数。** 一个循环可能调用工具几百次；课程给出的范围是每次对话 10 到 20 次调用，每个失败调用的重试次数也有上限。

### 文件工具

拒绝任何含父目录引用或以斜杠开头的路径，并返回一个列出现有文件的结构化错误。错误的形状很重要：有消息、错误码和建议，模型就能修正参数；空响应或笼统的失败则不行。

### 代码工具

子字符串黑名单把代码当文本读，没有逐字拼写出来的东西它都会漏掉。把代码解析成语法树，防护就能按结构拒绝 import、dunder 属性访问和不安全的名称。即便如此，防护和它运行的代码共用一个解释器，下定决心的调用方总能找到可以触达的对象。生产环境把不可信代码放在降权的独立进程、沙箱或托管运行器里执行，这样逃逸也只会落进一个用完即弃的盒子。

### 模型从不做的事

它从不执行任何东西。它输出一个名字和参数。之后的一切都是你的代码，上面每条规则都在那里落实。

## Follow-ups

- **Level 3:** 为什么代码工具只用子字符串黑名单不够？ Expected: 它匹配拼写，不匹配结构；解析出的语法树能按形状拒绝 import、dunder 访问和不安全名称，但它也和代码共用解释器。
- **Level 3:** 数据库工具怎样设计，模型才永远不用写 SQL？ Expected: 接收表名和过滤条件，表走白名单，限制运算符，查询在你的代码里构建。
- **Level 4:** 什么是工具投毒，控制点在哪里？ Expected: 结果里夹带了给模型的指令；每个结果回传之前都要清理，并去掉密钥和内部错误等敏感数据。
- **Level 4:** agent 在一个失败的工具上反复循环。什么能让它停下？ Expected: 每次对话的最大调用次数，课程里是 10 到 20 次；能让模型修正参数的结构化错误；以及每次调用大约 3 次的重试上限。

## Wrong answers

- "模型很守规矩，参数化以后再做。" 模型能够、也一定会生成破坏性查询或注入；规则是绝不透传它的 SQL。
- "通用的任意函数调用工具更简单。" 白名单就是规则：暴露用户需要的五个函数，而不是全部五十个。
- "代码过滤器拦了 import，所以是安全的。" 它和它运行的代码共用一个解释器；生产环境用单独的进程或容器。

## Taught in

[函数调用](../../../phases/11-llm-engineering/09-function-calling/)一课给出了五条安全规则，实现了参数校验器以及文件和代码防护，并设定了调用预算。
