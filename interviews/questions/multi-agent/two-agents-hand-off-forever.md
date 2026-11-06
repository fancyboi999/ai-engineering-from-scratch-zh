---
id: two-agents-hand-off-forever
title: 两个 agent 相互交接直到轮数上限
card: multi-agent
kind: debug
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, screen]
tags: [handoff-loop, routines, stateless, loop-detection, fallback-agent]
minutes: 8
lessons: [phases/16-multi-agent-and-swarms/11-handoffs-and-routines]
manuals: []
practice: []
cheatsheet: [multi-agent, agent-failure-modes]
related: []
updated: 2026-11-03
---

某支持系统使用交接驱动的编排：每个 agent 是一个 prompt 加上一组工具，且其中一个工具返回另一个 agent。跟踪记录显示分诊（triage）agent 将用户交给账单（billing），账单将用户交回分诊，两者重复直到轮数上限结束运行。用户从未得到答案。为什么会发生这种情况，廉价的修复方案是什么？

## Short answer

在该模式下，路由逻辑保留在 prompt 内部，当前 agent 通过工具调用挑选其继任者。分诊 prompt 说明账单问题转交给账单，而账单 prompt 说明超出其工具范围的所有问题均返回分诊，用户的消息同时满足这两者。交接之间不持久化任何内容，因此新 agent 从其 prompt 和历史开始，不知道相同的交接此前已经失败。廉价的修复是在最近几次交接上设置循环检测器以强制退出到后备 agent，并为每次交接记录跟踪事件。

## Full answer

### 为什么该模式会陷入循环

两个原语是规程（routine，即定义角色及其工具的系统 prompt）和交接（handoff，即返回下一个 agent 的工具）。框架唯一的职责是发现返回的 agent 值并完成切换。没有图，也没有状态机。路由由 prompt 决定，两份 prompt 可以在无人故意编写的情况下形成闭环。该模式在运行之间是无状态的，而在单次运行内部唯一的内存是消息历史，各 agent 不会为了重复模式而读取该历史。

### 在跟踪记录中找到它

交接循环是两个 agent 交替发言，中间没有用户轮次，也没有工具结果。读取这一对的交接事件。如果每次交接携带相同的原因，说明 prompt 在谁拥有该案例上存在分歧。

### 廉价的修复方案

1. **循环检测。** 在环形缓冲区中保留最近数次交接。当相同的两个 agent 连续交接达到三次时，强制退出。
2. **后备 agent。** 退出流向可以回答或升级给人类的安全默认项。同一后备项还能捕获交接给不存在 agent 的异常。
3. **交接日志。** 每次交接均写入包含发送者、接收者和上下文快照的事件，使循环在达到上限之前可见。

### 真正的修复方案

修复 prompt，以便恰好一个 agent 拥有每个案例，并为账单 agent 提供处理案例的工具，而不是将其送回的理由。决定在每次交接时转移什么上下文：完整历史是昂贵的，最近 N 条消息容易丢失原因，由交出方编写的摘要是常见的折中。该模式的生产后续版本围绕相同原语增加了会话、护栏和跟踪，以及控制接入方可见内容的交接过滤器。

### 安全角度

向具有不同工具权限的 agent 交接必须经过认证，因为非用户编写的消息（例如从文档中提取的文本）可能要求交接给能力更强的 agent。将交接视为权限变更，而不是路由细节。

## Follow-ups

- **Level 2:** 为什么账单 agent 没有注意到自己此前已经将该用户送回过一次？ Expected: 它是无状态的，从其 prompt 加上历史开始，循环中没有任何内容会为了重复交接而读取历史。
- **Level 2:** 后备 agent 应该做什么？ Expected: 尽其所能提供回答，或者带上跟踪记录将案例移交给人类，绝不交接给循环中的任一 agent。
- **Level 3:** 你如何选择在交接时移动什么上下文？ Expected: 案例简短时传递完整历史，较长时传递交出方编写的摘要，绝不能什么都不传，因为新 agent 随后会重复提问。
- **Level 3:** 带有选择器的群聊如何避免这种特定循环？ Expected: 选择器位于各个 agent 外部且可以看到交替，而在交接模式中处于循环中的 agent 本身就是决策者。

## Wrong answers

- "提高轮数上限，以便 agent 有时间调和。" 上限是结束循环的手段，更多的轮次会带来更多相同的两次交接。
- "告诉分诊绝不接受来自账单的交接。" 这会阻断账单确实无法提供帮助时的合法返回，修复方法是明确所有权加上检测器。
- "切换到图框架，问题就会消失。" 图可以用两条边编码相同的循环，循环检测器在两者中都有用。

## Taught in

[交接与规程课程](../../../phases/16-multi-agent-and-swarms/11-handoffs-and-routines/)构建了交接循环，并在检查清单中列出了循环检测和后备 agent。
