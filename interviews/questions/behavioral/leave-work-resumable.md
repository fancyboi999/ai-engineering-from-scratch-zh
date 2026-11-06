---
id: leave-work-resumable
title: 妥善安排工作以便他人可以接手
card: behavioral
kind: concept
level: 1
roles: [agentic-ai-engineer, applied-ai-engineer, inference-engineer, ai-data-engineer]
rounds: [behavioral, screen]
tags: [handoff, planning, resumable-work]
minutes: 6
lessons: [phases/14-agent-engineering/44-plan-from-evidence]
manuals: []
practice: []
cheatsheet: [agent-planning]
related: [behavioral/plan-you-would-reject]
updated: 2026-11-03
---

在一项多步骤的变更进行到一半时，你的会话未收到任何预警就意外中断了，第二天早晨一位同事需要接手该工作。他们必须能够在哪里找到哪些信息？

## Short answer

他们需要看清哪些条目已完成、每个条目运行了哪些验证、改动了哪些文件、哪些依赖项已解除阻塞，以及下一个安全的待办条目是什么。这些状态应当与工作产物一并存放在代码仓库中，体现为附带明确证明的小粒度条目，而非聊天会话框里勾选的复选框。

## Full answer

### 针对意外中断设计

会话可能意外中断。具备可恢复性的计划所包含的工作条目足够小，使得另一个人或另一个 agent 仅凭产物本身就能判定每个条目的状态。他们必须能够明确查阅以下五项内容：

- 哪个条目已经完成；
- 运行了哪些验证以及返回了什么结果；
- 哪些产物发生了变动；
- 哪些依赖项已被解除阻塞；
- 下一个安全的待办条目是什么。

### 为什么聊天对话框是错误的存放地

对话框里勾选的复选框仅代表有人曾认为该条目已完成。它并未说明是通过什么命令证明的，也没有说明触及了哪些文件。接手的人要么盲目信任该复选框，要么被迫重做一遍。将计划与代码保存在一起，每个条目分配独立标识符并写明具体的验证命令，接手者便能依凭验证而非依赖盲信。

### 习惯规范

我尽可能在条目边界处停顿。即便无法做到，计划中依然会记录最后一条通过的证明，因此恢复工作的切入点就是第一项尚未运行验证的条目。

## Follow-ups

- **Level 1:** 你在哪里维护这份计划？ Expected: 作为唯一事实源保存在代码仓库中与工作产物放在一起，任何渲染视图（如 Markdown 页面）均由其自动生成。
- **Level 2:** 某条目被标记为已完成但未记录任何证明，同事该如何处理？ Expected: 视其为未完成并运行其验证；缺乏证明的复选框仅仅是一种主观信念。
- **Level 2:** 为什么条目粒度大小对恢复工作至关重要？ Expected: 小粒度条目状态清晰（要么完成要么未完成）；大条目如果只做了一半，会迫使接手者去重构它停在哪里。

## Wrong answers

- "在会话结束时写一段总结消息。" 会话可能在写总结前就已经意外终止；工作状态必须在推进过程中实时存在。
- "查看 git log 就足够了。" 提交记录只能展示修改了什么，无法体现运行了哪些证明或下一步是哪一项。
- "只有最初发起任务的人才能完成它。" 这正是计划应当防止的失败。

## Taught in

[基于证据制定计划课程](../../../phases/14-agent-engineering/44-plan-from-evidence/)涵盖了针对中断设计工作计划并将其保存在工作产物旁的规范做法。
