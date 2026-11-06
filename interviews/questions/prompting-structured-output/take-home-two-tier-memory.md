---
id: take-home-two-tier-memory
title: 构建支持逐出和来源引用的双层 agent 记忆
card: prompting-structured-output
kind: take-home
level: 3
roles: [agentic-ai-engineer, applied-ai-engineer]
rounds: [take-home]
tags: [agent-memory, virtual-context, eviction, citations, take-home]
minutes: 60
lessons: [phases/14-agent-engineering/07-memory-virtual-context-memgpt]
manuals: []
practice: []
cheatsheet: [context-engineering]
related: [prompting-structured-output/sleep-time-consolidation, prompting-structured-output/fusion-weights-per-product]
updated: 2026-11-03
---

课后实作。构建一个双层的 agent 记忆：一个固定大小的主上下文，一个无上限、可检索的存储，再加上在两者之间搬运事实的工具。给出一段 trace：主上下文填满，有内容被逐出，之后的问题仍然能从存储里得到回答。只用标准库。说明你在逐出和引用上的选择。

## Short answer

把主上下文当作内存，把存储当作磁盘。主上下文有上限、一个固定的核心区，以及一个超过上限时压缩最旧条目的消息列表；存储里的记录带 id、文本、标签、会话 id 和轮次 id，并用 token 重叠度做检索。暴露记忆工具，写入三条事实，让主上下文溢出，然后检索存储、将结果拼进下一轮，回答后续问题。

## Full answer

### 整体形态

| 操作系统 | 记忆系统 | 你的代码 |
|---|---|---|
| 内存 | 主上下文 | 一个有上限的缓冲区，含一个核心字典和一个消息列表 |
| 磁盘 | 外部存储 | 一个带检索方法的记录列表 |
| 缺页 | 记忆工具调用 | agent 调用工具，运行时执行它，结果进入下一轮 |
| 内核 | agent 控制循环 | 一个读取、决策、写入的脚本化循环 |

### 工具接口

- `core_memory_append(section, text)` 和 `core_memory_replace(section, old, new)` 编辑主上下文中固定的区段。
- `archival_memory_insert(text)` 往存储里写一条记录。
- `archival_memory_search(query, top_k)` 从存储中检索。
- `conversation_search(query)` 扫描过去的轮次。

### 逐出

消息列表超过上限时，压缩最旧的消息，而不是丢掉它们。课程练习用词数乘以 1.3 按 token 计算上限，并对被逐出的消息做摘要；更简单的版本是把它们移到存储里。删除会丢掉本可以留在存储里的事实。

### 引用

每条存储记录都带有来源的会话 id 和轮次 id。没有它们，agent 记得用户要过某样东西，却说不出是哪一轮；有了它们，每个基于检索的回答都能引用出处。

### 评分人想看的 trace

1. 三条事实写入存储，每条都带来源字段。
2. 主上下文超过上限，最旧的消息被压缩。
3. 后续问题到来，agent 调用检索工具，命中的结果被拼进下一轮，回答引用了对应的轮次。
4. 说明这个设计本身解决不了的两种失败：记忆腐化，需要定期整合；记忆投毒，攻击者的文本被存成笔记，下一次会话又被重新读入。

## Follow-ups

- **Level 3:** 为什么要分页，而不是用更大的窗口？ Expected: 溢出、稀释和持久化；更大的窗口照样稀释注意力，下一次会话又从空白开始；课程提到一个 4k 窗口加外部记忆的 agent，抓住了 128k 窗口基线漏掉的长程事实。
- **Level 3:** 每条存储记录里放什么，为什么？ Expected: 文本、标签、会话 id 和轮次 id，这样召回的事实能引用到它出自的那一轮。
- **Level 4:** 存储里有条笔记说要忽略今后所有的用户指令。防护是什么？ Expected: 检索到的记录进入 prompt 之前，扫描其中指令形态的文本并标记为不可信；这是跨时间的 prompt 注入。
- **Level 4:** 写多读少，检索被陈旧事实淹没。你加什么？ Expected: 定期整合，以及让被推翻的事实显式失效；后面的记忆课程把这些放到关键路径之外运行。

## Wrong answers

- "全留在上下文里，窗口够大。" 课程说的三种失败仍然存在：溢出、稀释，以及下一次会话时窗口是空的。
- "逐出就是直接删掉最旧的消息。" 应该压缩成摘要或移到存储里；删除会丢掉存储本可以保留的事实。
- "存储不需要来源字段。" 没有会话 id 和轮次 id，agent 想起一个事实，却说不出它从哪来。

## Taught in

[虚拟上下文](../../../phases/14-agent-engineering/07-memory-virtual-context-memgpt/)一课给出了操作系统类比、双层结构、工具接口和失败模式。
