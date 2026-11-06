---
id: polling-a-parked-task
title: 轮询了一小时，任务其实在等我们
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, design-review]
tags: [a2a, task-states, input-required, polling, context-id]
minutes: 20
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: []
practice: []
cheatsheet: [a2a, agent-failure-modes]
related: [scenarios/cancel-a-finished-task]
updated: 2026-11-03
system:
  version: A2A 1.0.1 with the manual's capture kit (the test-runner, code-reviewer and deployer agents)
  model: no model; the agents are deterministic fixtures
  hardware: one machine, localhost, no network
source:
  - manuals/a2a-101/capture/out/06-input-required.http
  - manuals/a2a-101/capture/out/04-polling.http
  - manuals/a2a-101/capture/out/19-planner.log
  - manuals/a2a-101/sections/4-2-input-required-and-auth-required.md
  - manuals/a2a-101/sections/3-4-task-and-task-state.md
  - manuals/a2a-101/sections/3-1-message.md
  - manuals/a2a-101/sections/r-3-task-states.md
---


## Situation

一个规划器把 `payments-api` 的一份 diff 发给 `code-reviewer` agent，然后等待审查结果。它的等待循环和对接所有远程 agent 时用的一样：先发消息，再每隔几秒调用一次 `GetTask`，直到状态变为 completed、failed 或 canceled。昨晚有一次审查一直没有返回。规划器对同一个任务轮询了一个小时，然后它自己的运行超时，发布只好等到第二天早上由人工审查。

值班工程师调出审查 agent 发回的第一条回复。它不是失败，agent 也从未失去响应。规划器知道这份 diff 是从哪个分支切出来的，因为代码就是它自己检出的。你手上有采集工具包里这次审查的两轮交互、另一个 agent 的轮询交互作为对照，以及工具包自带规划器的日志，那个规划器在自己的运行中处理过同一个问题。

## Evidence

- [审查请求收到的回复](evidence/first-reply.txt)
- [另一份采集中，对仍在运行的任务调用 GetTask 的结果](evidence/a-working-task-for-comparison.txt)
- [回答这个问题的消息](evidence/the-answer.txt)
- [回答之后收到的回复](evidence/completed-reply.txt)
- [工具包的规划器如何处理同一个问题](evidence/planner-log.txt)
- [九种状态、所属类别和客户端的下一步](evidence/state-table.txt)
- [回答为什么要同时带上两个 id](evidence/send-both-ids.txt)

## Questions

1. 第一条回复带的是什么状态？其中的消息是谁写的？
2. 看两次轮询结果，等待输入的任务和正在运行的任务有什么区别？
3. 规划器的回答要发到哪里？必须带哪些字段？
4. 等待循环必须在哪些状态上停下？每种状态的下一步是什么？
5. 规划器自己的上下文里就有分支名。为什么循环从没用上它？

## Walkthrough

1. **读第一条回复。** 状态是 `TASK_STATE_INPUT_REQUIRED`。状态消息的角色是 `ROLE_AGENT`，问的是这份 diff 应该和哪个基准分支比较。阻塞式发送在遇到终止状态或中断状态时返回，所以从第一条回复起，问题就已经交到规划器手里了，比第一次轮询还早。
2. **和运行中的任务对比。** 在轮询采集里，状态是 `TASK_STATE_WORKING`，状态消息报告进度，产物在两次轮询之间变大。挂起的任务一样都没有。它的状态就是 agent 在说"轮到你了"，轮询多少次都不会变。
3. **读回答。** 这是一条普通的 `SendMessage`。消息有一个新的 `messageId`，角色为 `ROLE_USER`，文本为 `main`，`contextId` 和 `taskId` 都从任务里复制过来。参考 SDK 不会根据任务推断上下文，而是赋予消息一个新的上下文，所以客户端要把两个 id 都带上。
4. **读第二条回复。** 同一个任务 id 返回，状态为 `TASK_STATE_COMPLETED`，状态消息为 `2 findings`。历史里现在有问题和回答，`review.json` 产物写明以 `main` 为基准，并列出两条审查意见及其行号。任务始终没有换过 id，也没有换过上下文。
5. **读规划器日志。** 工具包的规划器看到中断状态后读出问题，从自己的上下文中取出 `main` 作答，再过一次调用就报告了审查结果。在它的循环里，中断状态是一条分支，不是继续等待的理由。
6. **读状态表。** 九种状态分为三类。中断状态有两种，下一步各不相同：需要输入时在同一个任务上回答；需要授权时把请求交给审批人，并继续关注授权结果。终止状态有四种，第四种 rejected 是大多数循环会漏掉的那个。

## Resolution

循环的停止集合定错了。它只等三种终止状态，把其余一切都当作"仍在运行"，于是中断的任务看起来像一个慢任务。修复把两种中断状态加入停止集合，并为每种状态写一个分支。遇到 `TASK_STATE_INPUT_REQUIRED` 时，规划器读状态消息，再发一条新消息作答，消息带上挂起任务的任务 id 和上下文 id。遇到 `TASK_STATE_AUTH_REQUIRED` 时，把请求交给负责审批的人，然后订阅或轮询。遇到 `TASK_STATE_REJECTED` 时，停下并按消息处理。采集结果证明这条路径可行：收到回答后再过一次调用，审查 agent 就完成了任务并返回审查产物；工具包规划器的日志也展示了从头到尾相同的处理方式。

## Wrong turns

- "轮询快一点，审查 agent 太慢了。" 状态说明 agent 在等客户端。轮询频率改变不了它。
- "放弃这个任务，发一个带分支名的新请求。" 这样能跑通，但会在 agent 上留下一个挂起的任务，重发 diff，还丢掉历史。协议给的路径是在同一个任务上发新消息。
- "只带 taskId 作答，服务端知道上下文。" 参考 SDK 会给这样的消息赋予一个新的上下文。两个 id 都要复制。
- "把中断状态当作失败上报。" 任务保留了它的 id、历史和产物。什么都没失败，回答之后它就完成了。
- "用 ROLE_AGENT 发送回答，因为规划器是 agent。" 角色表示消息的方向，不是参与方的类型。客户端一侧是 `ROLE_USER`，工具包会以 -32602 拒绝另一个角色。

## Generalize

等待循环必须知道对方可能进入的每一种状态，并且要在每个向调用方提出要求的状态上停下，而不只是在工作结束的状态上停下。远程系统带着一个问题暂停时，答案往往已经在调用方的上下文里，挡在两者之间的只有这个循环。

## Taught in

[A2A 101 的中断状态页](../../../manuals/a2a-101/sections/4-2-input-required-and-auth-required.md)从提问到回答跟完了这次审查，[任务状态页](../../../manuals/a2a-101/sections/3-4-task-and-task-state.md)和[状态表](../../../manuals/a2a-101/sections/r-3-task-states.md)给九种状态分类，[消息页](../../../manuals/a2a-101/sections/3-1-message.md)给出 id 规则，[失败模式课](../../../phases/14-agent-engineering/26-failure-modes-agentic/)把上下文丢失列为 agent 循环出错的五种方式之一。
