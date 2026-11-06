---
id: lost-in-the-middle-order
title: 上下文各部分放在哪里，为什么
card: prompting-structured-output
kind: concept
level: 2
roles: [applied-ai-engineer, agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, system-design]
tags: [context-engineering, lost-in-the-middle, token-budget, ordering]
minutes: 8
lessons: [phases/11-llm-engineering/05-context-engineering]
manuals: []
practice: []
cheatsheet: [context-engineering]
related: [prompting-structured-output/tool-budget-fifty-tools, prompting-structured-output/timestamp-kills-the-cache]
updated: 2026-11-03
---

你要把 system 消息、10 篇检索到的文档、到目前为止的对话历史和用户问题组装成一个 prompt。按什么顺序放？由什么证据决定？

## Short answer

system prompt 和关键指令放最前，当前问题和最相关的上下文放最后，优先级最低的材料放中间。证据是「迷失在中间」（lost in the middle）的研究结果：20 篇文档里只有一篇相关时，它排第一或最后，准确率是 85% 到 90%；排在中间，准确率跌到 60% 到 70%。如果某个关键点不得不放在中间，就在末尾再重复一次。

## Full answer

### 研究结果

模型对上下文的开头和结尾关注得最好。研究把一篇相关文档放进 20 篇无关文档里，并移动它的位置。排第一或最后，准确率 85% 到 90%。排在中间，60% 到 70%。课程把它概括为：位于上下文 40% 到 70% 处的信息，准确率下降 10% 到 20%。

### token 预算

| 组成部分 | 典型大小 |
|---|---|
| system prompt | 约 500 个 token |
| 工具定义 | 2K 到 8K 个 token |
| 检索上下文 | 2K 到 10K 个 token |
| 对话历史 | 2K 到 20K 个 token |
| 少样本示例 | 1K 到 3K 个 token |
| 用户问题 | 100 到 500 个 token |
| 生成预留空间 | 2K 到 8K 个 token |

窗口里的每个 token 都会挤掉一个本可以携带更多信号的 token。信号占 90% 的 10K prompt 胜过信号只占 10% 的 100K prompt。

### 不要把十篇文档全放进去

糟糕的检索比不检索更差；它用噪声填满窗口，还会误导模型。按查询给每篇文档打分，丢掉低于阈值的。如果检索到 10 个块，只有 3 个相关，就只留这 3 个。

### 重排

课程的函数按得分给文档排序，奇数名次按顺序放到前面，偶数名次倒序放到后面，于是最好的文档在两端，最弱的在中间。然后是对话历史，超过阈值时压缩成摘要；最后是问题，并为回答预留 2,000 到 4,000 个 token。

## Follow-ups

- **Level 2:** 为什么不把检索到的十篇文档全放进去？ Expected: 糟糕的检索比不检索更差；按查询给每篇打分，丢掉低于阈值的，留 3 篇相关的，好过留 10 篇平庸的。
- **Level 2:** 窗口末尾要预留什么，留多少？ Expected: 生成预算，至少 2,000 到 4,000 个 token，否则模型没有空间回答。
- **Level 3:** 课程的重排怎样排列五篇已打分的文档？ Expected: 按得分排序后，奇数名次按顺序放到前面，偶数名次倒序放到后面，最好的文档在两端。
- **Level 3:** 每一轮都发送同一份 system prompt。这对它的长度意味着什么？ Expected: 每个词每次调用都要付费，所以要精简；课程提到一个代码助手的 system prompt 加工具定义约有 6,000 个 token。

## Wrong answers

- "窗口很大，上下文越多越好。" 信号占 90% 的 10K prompt 胜过信号占 10% 的 100K prompt；上下文越多，注意力要过滤的噪声就越多。
- "把问题放最前面，模型就知道要找什么。" 上下文末尾同样受到高度关注；课程把当前问题放最后，把指令放最前。
- "顺序无所谓，注意力能看到一切。" 实测中间位置的准确率下降 10% 到 20%。

## Taught in

[上下文工程](../../../phases/11-llm-engineering/05-context-engineering/)一课给出了「迷失在中间」的数据、预算表和重排函数。
