---
id: alert-on-the-driver-line
title: 一条驱动日志告警在一下午呼叫了九次
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [alerting, kernel-log, unified-memory, health, on-call, sre]
minutes: 25
lessons: [phases/17-infrastructure-and-production/23-sre-for-ai]
manuals: [sglang-101#s-mem-fraction-static-and-startup-sizing, sglang-101#s-ref-incident-index, sglang-101#s-operating-sglang]
practice: []
cheatsheet: [sre-for-ai]
related: [scenarios/health-probes-add-load, scenarios/cold-start-on-gb10]
updated: 2026-11-03
system:
  version: SGLang 0.5.22
  model: Qwen/Qwen3-30B-A3B-Instruct-2507
  hardware: one GB10 with 121.7 GiB of unified memory, shared with other users
source:
  - manuals/sglang-101/capture/gpu/incidents/gb10-driver-no-memory.txt
  - manuals/sglang-101/capture/gpu/out-gb10/server-default.log
  - manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md
  - manuals/sglang-101/sections/r-3-incident-index.md
  - manuals/sglang-101/sections/7-1-operating-sglang.md
---

## Situation

一个平台团队在统一内存的桌面机器上运行 SGLang，这些机器由几个团队共用。别处发生一次内存事故后，他们给内核日志加了一条告警规则：只要 GPU 驱动打印 `NV_ERR_NO_MEMORY`，就呼叫值班。第一个下午，这条规则在 13:52 到 16:46 之间呼叫了九次。每次呼叫都是一分钟内突发 3 到 13 条相同的日志行，然后归于安静。

值班没有找到用户投诉，也没有失败的请求，每台服务器都健康。团队提议保留规则并调高阈值，只让长时间的突发触发呼叫。下一个值班周开始前，你拿着突发统计表、这台机器上一次启动的服务器日志和手册，评审这个告警设计。

## Evidence

- [告警规则命中的内核日志突发，按分钟统计](evidence/the-alert-feed.txt)
- [同一台机器上的一次服务器启动：就绪行前后的探针结果](evidence/a-server-that-became-healthy.txt)
- [统一内存上一次启动的权重和池](evidence/the-startup-memory-moves.txt)
- [手册对这条驱动日志行的说明，以及它没能对上的部分](evidence/what-the-manual-could-match.txt)
- [事故索引中这条日志行对应的一行](evidence/the-incident-index-row.txt)

## Questions

1. 读突发统计表。时间戳和计数呈现什么规律？服务器在这些时刻在做什么？
2. 服务器日志显示健康路由先返回 503，再返回 200。值班需要的是哪个信号？这条规则带上它了吗？
3. 手册没能把每次突发对应到某一次启动。为什么对不上？这说明你该保留哪些证据？
4. 设计这个告警：哪个信号呼叫人，哪个信号用于诊断，驱动日志行该放在哪里？
5. 哪份 runbook 能把这次呼叫变成五分钟的核对，而不是一次调查？

## Walkthrough

1. **读突发日志的分布。** 2026-10-16 大约三小时里，有九个分钟时段出现了这条日志，每次突发都落在单独一分钟内。手册给出了日期背景：那天是这台机器首次为测试和参数扫描启动服务器。统一内存上的一次服务器启动，就是一次集中分配。启动清单里，权重稳定在 57.75 GB，三秒后池为 key 占用 10.40 GB，为 value 占用 10.40 GB。手册的判断是：机器上其他所有程序都会看到这块内存被拿走。驱动日志行是机器在启动前后打印的内容，所以这条规则呼叫的其实是启动。
2. **读真正要紧的信号。** 服务器日志里，第一次健康探针在 14:19:12 返回 503，因为服务器还在启动。两秒后就绪行打印出来，14:19:15 的探针返回 200。这次状态变化回答了值班要问的问题：服务器起来了吗，能提供服务吗？驱动日志行回答不了这个问题。启动成功也好，失败也好，只要有分配它就会出现，所以它完全不带健康信息。
3. **读没能对上的部分。** 手册说那天的服务器日志没有保留，所以没有一次突发能对应到某一次启动；它还说，后来几次采集里的每台服务器都变成健康，并跑完了基准测试。事故索引记录了同样的状态和同样的规则：根据健康状态告警，而不是根据这条日志行告警。证据方面的教训就在这句话里。一条内核日志，如果没有同一分钟的服务器日志，就是一条没有嫌疑人的线索。两份日志都要带时间戳保留，否则你说不出哪个进程打出了哪一行。
4. **设计告警。** 服务器在启动预算内没有打出就绪行时呼叫；服务器就绪后不再响应 readiness 探针时也呼叫。队列持续增长、时间超过用户能接受的范围时呼叫。把驱动日志行做成看板上的计数器，作为上下文附在呼叫里，永远不单独触发呼叫。对这类共用机器，手册还加了两项措施：在有内存限制的容器里运行服务器；启动期间每秒记录一次机器的空闲内存，让下一次突发自带能解释它的数字。
5. **写 runbook。** SRE 课给出了结构：症状、假设、验证、行动。症状：驱动日志行突发。假设：某台服务器在那一分钟分配了池。验证：在服务器日志里找同一分钟内的一次启动，并读它就绪行之后的健康状态变化。行动：服务器已经健康，就什么都不做；某次启动失败，就转到手册的启动页面处理。日志保留下来，这就是五分钟的核对。

## Resolution

这条规则度量的是分配，不是故障。健康服务器每启动一次它就呼叫一次，一个下午呼叫九次，却没给值班任何可以处理的东西。它不再作为呼叫规则，改为保留成诊断计数器。替代它的呼叫来自健康状态变化：启动在预算内没有打出就绪行，以及已就绪服务器的探针失败。在有服务器日志的那些天里，这台机器上的每次启动都打出了就绪行，所以驱动规则每次启动都呼叫，健康规则一次也不呼叫。

证据方面同时做了两项改动。每台机器的内核日志和服务器日志放在一起保留，以后的突发可以对应到具体进程。启动期间每秒记录一次机器的空闲内存，让驱动日志行报告的分配和服务器打印的池大小能并排对照。调高阈值的提议被放弃，因为阈值调高只会压住一条本就不能反映故障的规则。

## Wrong turns

- "调高阈值，只让长时间的突发触发呼叫。" 突发是 3 到 13 行。阈值高过这些数，像这天这样的日子规则就不响了；遇上更糟的日子，它依然说明不了服务器能不能提供服务。
- "调低内存比例，直到驱动不再报错。" 没人把突发对应到启动，所以没人知道更小的池能不能消除这条日志，而更小的池在任何负载下都让用户吃亏。比例要为这台共用机器专门设定，理由单独成立。
- "保留呼叫，驱动报错总是严重的。" 后来几次采集里的每台服务器都变成了健康。没有动作可做的呼叫，只会教值班学会忽略呼叫。
- "从日志管道里删掉这一行。" 把它作为诊断信息，放在健康信号旁边保留。它能标出一次分配的时间；服务器日志保留下来后，它还能指出是哪个进程。

## Generalize

对用户能感受到的症状告警，把机制层面的日志行留作诊断。正常工作时也会出现的日志行，会在每次成功时呼叫你。让一条规则呼叫人之前，先拿一个已知正常的日子回放它，并保留能把每次触发对应到原因的日志。

## Taught in

SGLang 手册在[内存页面的共享池部分](../../../manuals/sglang-101/sections/3-2-mem-fraction-static-and-startup-sizing.md#a-pool-that-other-programs-see)记录了这些突发并定下规则，在[事故索引](../../../manuals/sglang-101/sections/r-3-incident-index.md)中列出状态，在[运维页面](../../../manuals/sglang-101/sections/7-1-operating-sglang.md)说明了健康端点，[面向 AI 的 SRE 这一课](../../../phases/17-infrastructure-and-production/23-sre-for-ai/docs/en.md#runbook)给出了 runbook 的结构。
