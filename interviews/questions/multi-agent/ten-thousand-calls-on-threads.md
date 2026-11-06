---
id: ten-thousand-calls-on-threads
title: 基于线程的一万次并发模型调用
card: multi-agent
kind: estimate
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, system-design]
tags: [async, threads, concurrency, memory, io-bound]
minutes: 8
lessons: [phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints]
manuals: []
practice: []
cheatsheet: [production-agent-runtimes]
related: [multi-agent/a-worker-died-mid-run]
updated: 2026-11-03
---

某 swarm 运行时为每个进行中的模型调用使用一个线程。在高峰期，它同时保持约 10,000 次调用。请估算在完成任何工作之前这些线程所占用的内存，说明这些线程在大部分时间内在做什么，并说明你会做出哪些改变。

## Short answer

线程栈约为 1 MB，因此在第一个 token 到达之前，10,000 个线程仅栈就需要约 10 GB 的内存。这些线程在约 99 percent 的时间内处于空闲状态，等待来自模型服务的下一个 token。通过异步 I/O 将模型调用转移到协作式纤程，相同的 10,000 次调用可以容纳在一个进程中，并仅对 CPU 密集型工作（例如嵌入）保留线程或进程。

## Full answer

### 估算

| 数量 | 取值 |
|---|---|
| 每个线程的栈 | 约 1 MB |
| 并发调用 | 10,000 |
| 栈所需内存 | 约 10 GB |

这些内存仅用于维持进行中的调用，还没有做任何实际工作。模型调用受 I/O 限制。线程发送请求然后等待 token，在其生命周期的约 99 percent 时间里处于空闲状态。

### 纤程改变了什么

协作式纤程在 I/O 时让出控制权，而不是在等待时持有栈。在课程演示中，500 次并发模拟调用在异步版本上不到一秒完成，而线程版本耗时数秒，且每个并发单元使用的内存高出几个数量级。在 agent 规模下，异步 I/O 是架构，而不是优化。

### 例外情况

CPU 密集型的后处理需要线程或进程：嵌入、分词器技巧，以及任何纯计算而非等待的工作。将 I/O 层与 CPU 层分离，并为每一层赋予自己的并发模型。

### 这如何适应运行时的其余部分

异步层处理进行中的调用。持久性是单独的关注点：在运行 ID 下每个步骤设置一个检查点，以便进程崩溃时仅丢失进行中的调用而不会丢失其他内容，任何 worker 都可以从最后一个检查点恢复。平均值十倍的峰值负载是两者的理由：纤程以低成本持有调用，以及带有租约的队列将调用分散到各个 worker。

## Follow-ups

- **Level 2:** 为什么线程数比请求数更重要？ Expected: 每个线程无论是否在工作都持有栈，因此内存随并发性而非吞吐量扩展。
- **Level 2:** 如果在异步循环上运行嵌入步骤，会破坏什么？ Expected: CPU 密集型任务会阻塞该循环，因此每个等待的调用都会停滞在其后，这就是为什么 CPU 工作要交给线程或进程。
- **Level 3:** 改完后内存够用了，下一个瓶颈是什么？ Expected: 模型服务的速率限制和队列深度，因此运行时需要背压和每次运行的租约，而不是更多的并发。
- **Level 3:** 在上线之前如何证明该改变？ Expected: 在你自己的调用形态上运行课程中的对比，在相同并发下测量两种版本的真实耗时和峰值内存，并在决策记录中保留这些测量值。

## Wrong answers

- "不断加内存，直到装得下这些线程。" 用于空闲栈的内存是浪费，下一个峰值需要更多，而纤程消除了该成本。
- "调小栈大小来缩小线程。" 较小的栈仍是每个空闲调用的一个栈，且空闲时间保持在 99 percent。
- "对所有内容都使用纤程，包括嵌入。" 协作循环上的 CPU 密集型步骤会阻塞每个等待的调用，因此 CPU 层保留线程或进程。

## Taught in

[生产扩展课程](../../../phases/16-multi-agent-and-swarms/22-production-scaling-queues-checkpoints/)并排运行了异步版本和线程版本。
