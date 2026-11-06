---
id: tool-budget-fifty-tools
title: 五十个工具定义每次调用要花多少
card: prompting-structured-output
kind: estimate
level: 3
roles: [agentic-ai-engineer, applied-ai-engineer, forward-deployed-ai-engineer]
rounds: [system-design, screen]
tags: [context-engineering, tool-pruning, token-budget, estimate]
minutes: 9
lessons: [phases/11-llm-engineering/05-context-engineering]
manuals: []
practice: []
cheatsheet: [context-engineering]
related: [prompting-structured-output/lost-in-the-middle-order, prompting-structured-output/tool-description-is-a-prompt]
updated: 2026-11-03
---

某个编程助手暴露了 50 个工具，每个都定义了名称、描述和参数 schema。估算这些工具定义每次调用的成本，并说明在不从产品里移除任何一个工具的前提下，你怎样降低这笔成本。

## Short answer

每个定义花 50 到 200 个 token，所以 50 个工具按每个 150 个 token 算，对话开始前就是 7,500 个 token，而且每次调用都重复一遍。对查询做意图分类，只放入与意图匹配的工具；课程给出的削减幅度是 60% 到 80%，从约 8,000 个 token 降到约 1,000 个。产品保留每一个工具；变的只是每次调用附带的定义列表。

## Full answer

### 放进上下文里看

课程给一个编程助手做的拆分：system prompt 500 个 token，50 个工具的定义 8,000，检索到的文档 4,000，十轮历史 6,000，查询 200，生成预算 4,000，合计 22,700 个 token。工具块是最大的一项，而且和历史不同，它与对话持续了多久无关。

### 为什么会重复

定义放在上下文里，所以 50 轮的对话要把整块定义付 50 次钱。其中每个 token 还会挤掉一个本可以携带信号的 token，这正是上下文工程的观点：窗口是稀缺资源，不是垃圾场。

### 只剪枝，不移除

1. 对查询做意图分类。课程用每个意图一组关键词来实现：代码、日历、邮件、调研、数据。
2. 给每个工具标上它服务的类别。
3. 按顺序放入类别与意图匹配的工具，直到达到 token 预算；课程的选择器在 2,000 个 token 处停止。
4. 代码问题永远看不到日历工具，排期问题永远看不到文件系统工具。

### 核对剪错的代价

剪枝有漏掉分类器没预料到的工具的风险。课程练习分别测量了放入 5、10、20、50 个工具时的任务成功率，并比较这些曲线；给每个工具一个优先级分数，按降序填入直到预算用完，是对「放或不放」二选一的改进。

## Follow-ups

- **Level 3:** 为什么这笔成本会重复？ Expected: 每次调用时定义都在上下文里，所以 50 轮的对话要把整块定义付 50 次钱。
- **Level 3:** 课程怎样选择要发送哪些工具？ Expected: 用关键词对查询做意图分类，再选类别匹配的工具，一直加到 2,000 个 token 的预算。
- **Level 4:** 剪枝有什么风险，怎么检查？ Expected: 查询被误读时漏掉需要的工具；测量放入 5、10、20、50 个工具时的任务成功率，并按意图观察漏选。
- **Level 4:** 这 7,500 个 token 和课程拆分中的其他部分比起来怎样？ Expected: 拆分合计 22,700 个 token，约 8,000 的工具块是最大的一项，排在 6,000 的历史和 4,000 的检索文本之前。

## Wrong answers

- "token 便宜，50 个全发。" 它是课程拆分中最大的一块，每次调用都重复；它还会挤掉携带信号的上下文。
- "把每个描述缩成一个词。" 那样模型就分不清这些工具了；按相关性剪枝，每个描述保持精确。
- "把不常用的工具从产品里删掉。" 产品不用改；改的是每次调用的定义列表。

## Taught in

[上下文工程](../../../phases/11-llm-engineering/05-context-engineering/)一课给出了 token 拆分、工具剪枝的数据和动态工具选择器。
