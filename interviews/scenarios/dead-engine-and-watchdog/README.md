---
id: dead-engine-and-watchdog
title: 停止运行的 rollout 引擎与会终止任务的看门狗
card: scenarios
kind: incident
level: 3
roles: [inference-engineer, ai-evaluation-reliability-engineer, agentic-ai-engineer]
rounds: [debugging, design-review]
tags: [rl, rollout-engine, watchdog, http-503, alerting, miles]
minutes: 25
lessons: [phases/17-infrastructure-and-production/23-sre-for-ai]
manuals: [miles-101#s-add-a-watchdog, miles-101#s-survive-failures, miles-101#s-troubleshoot-by-symptom, miles-101#s-which-router-to-use]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
system:
  version: Miles main 08752a12 with its own SGLang 0.5.22 build
  model: Qwen/Qwen3-0.6B
  hardware: one GB10 with 128 GB of unified memory
source:
  - manuals/miles-101/capture/gpu/out-gb10/engine-died-503.log
  - manuals/miles-101/capture/gpu/out-gb10/engine-died-count.txt
  - manuals/miles-101/capture/gpu/out-gb10/503-bursts.txt
  - manuals/miles-101/capture/gpu/out-gb10/watchdog-test.txt
  - manuals/miles-101/capture/gpu/watchdog.sh
  - manuals/miles-101/sections/1-2-add-a-watchdog.md
---

## Situation

一个团队在一张 GB10 上跑 GRPO，让一次训练运行了一个小时，期间无人查看。回来时 GPU 空闲，容器还在运行，日志已经涨到 147 MB。运行输出里没有出现任何失败。rollout 引擎启动时用了这块 GPU 跑不了的注意力设置，在启动阶段就停了。训练器却没停：它一直在给死掉的引擎发请求。

团队写了一个看门狗。它每 30 秒统计最近 60 秒内的 `503 Service Unavailable` 行数；连续六次检查都超过 100 行时，就停掉容器。第二天，看门狗在一个每个 prompt 生成 16 个回答的健康运行跑到一半时停掉了它。团队现在既不信这次运行，也不信看门狗。

## Evidence

- [引擎的失败，以及训练器一侧的第一条和最后一条错误](evidence/engine-died.txt)
- [这次运行写了多少行错误](evidence/error-count.txt)
- [死掉的那次运行里最安静和最繁忙的分钟](evidence/errors-per-minute-dead.txt)
- [一次跑完所有步的运行，前十五分钟的错误](evidence/errors-per-minute-healthy.txt)
- [看门狗对付两个故意打印这条错误的容器](evidence/watchdog-test.txt)
- [在健康运行的真实错误时间上回放看门狗规则](evidence/replay.txt)

## Questions

1. 训练器从没失败。是哪个组件返回了 503？训练器为什么把它当成应该重试的情况？
2. 只看错误数量，无法区分引擎已停止的运行和健康运行。哪种特征能区分它们？怎样把它写成规则？
3. 在健康运行上回放六次检查的规则。它为什么触发了？在 30 个起始偏移里触发了几次？
4. 选定检查次数。引擎真的死了时，每多一次检查要付出什么？
5. 脚本以 0、1 或 2 退出。运行队列对每个退出码该怎么做？
6. 在多 GPU 的集群上你不会跑这个脚本。用什么替代它？我们所跑版本的容错没有覆盖什么？

## Walkthrough

从头读第一份清单。引擎为 on-policy 目标开启了确定性推理，随后一个断言让它停了下来：FlashAttention v3 后端要求 SM 在 80 到 90 之间，而 GB10 不在这个范围内。父进程收到了子进程的 SIGQUIT。从那一刻起，训练器的 rollout 执行器就不断记录来自 `172.17.0.3:20035` 上路由器的 `503 Service Unavailable`。路由器是一个小服务，把每个 rollout 请求转发给某个引擎；没有引擎能接请求时，它就返回 503。客户端会重试 503，因为忙碌的引擎也会返回它。所列的第一条和最后一条错误相隔 63 分钟，从 21:03 到 22:06，第二份清单统计出这份日志里有 200,533 行这样的错误。

第三和第四份清单逐分钟比较两次运行。死掉的运行从没安静过。它的两个不完整分钟分别有 1,838 和 2,281 条错误，每个完整分钟至少 2,669 条，最多 3,719 条。那次健康运行按每个 prompt 生成 16 个回答，总共记录了 22,357 条错误，但它们是一阵一阵的：前两分钟 286 和 271 条，接着十分钟一条没有，然后 686 和 882 条，再然后 18 条。有一分钟达到 2,209 条。客户端重试了每个请求，运行跑完了所有步。光看数量分不开这两次运行，时间可以。死掉的引擎在每个窗口里都产生错误，忙碌的引擎集中产生一阵阵错误，中间有空隙。

看门狗把这一点写成规则：每 30 s 统计最近 60 s 的错误，只有错误数连续若干次检查都高于 100 才停止。第五份清单在两个没有 GPU 的容器上测了它。一个容器每秒打印十行错误，六次检查后在 183 s 时被停掉，脚本以 1 退出。另一个容器打印 60 s 后安静两分钟，如此三轮，一直跑到结束，用时 541 s，脚本以 0 退出。

最后一份清单说明六次检查为什么仍然不对。在健康运行的真实错误时间上回放，对检查的 30 个可能起始偏移逐一测试，六次检查在 30 次中有 17 次停掉了运行。有两阵错误相隔 45 s，所以 60 s 窗口在连续六次检查里都有错误。没有任何偏移能连续超过六次。用八次检查，规则在 30 次中 0 次停掉健康运行；用十次检查也是 0 次。代价是在死掉的引擎上多耗的时间：六次检查要 153 到 182 s，十次要 273 到 302 s。

## Resolution

引擎死于一个后端断言，运行没有察觉，因为在客户端看来，503 和引擎忙碌是一样的。修复这次运行，要读第一条错误上方的引擎日志行，按断言消息说的那样换掉注意力后端。

修复看门狗，要改检查次数。设为 10，因为健康运行从没连续超过 6 次，而 8 次或 10 次在 30 次回放里都是 0 次误停，同时死掉的引擎仍会在大约五分钟内被停掉。每个 60 s 窗口 100 条错误的上限保持不变，每 30 s 检查一次也不变。信任脚本之前，先在这两个假容器上测试它；并保留对真实健康日志的回放，因为假的突发容器两阵之间安静两分钟，比真实的 45 s 间隔长。

给退出码赋予含义。退出码 1 表示看门狗停掉了运行，队列跳到下一次运行并保留日志。退出码 0 表示运行自己结束了。退出码 2 表示看门狗看不到容器了，这次运行没有保护，需要有人去看。

## Wrong turns

- "一分钟内 503 行数高就告警。" 一次健康运行在某一分钟记录了 2,209 条，并跑完了所有步。数量会在每阵突发时触发，突发之间的时间才是信号。
- "连续六次检查就够了，测试都通过了。" 测试容器两阵突发之间停两分钟。真实运行的突发相隔 45 s，在它的真实时间上回放，30 次中有 17 次触发。
- "调高上限，直到健康运行能通过。" 健康运行最多的一分钟有 2,209 条错误，死掉运行最安静的完整分钟有 2,669 条。夹在两者之间的上限只适合这一对运行，更慢的死引擎或更忙的健康运行都会让它失效。时间规则不依赖速率。
- "开启容错，代替脚本。" 在一张 GPU 上，引擎死了就等于运行死了。在我们跑的版本里，rollout 容错不支持专用评测集群，也不支持全异步的共置布局；没有它，训练器会一直给死引擎发请求，永远不会失败。
- "让看门狗重启引擎。" 脚本只负责停止运行。原因在第一条错误上方的引擎日志行里，用同样的设置重启，会以同样的方式失败。

## Generalize

一个无限重试的组件，会把一个死掉的依赖变成无声的挂起，唯一可靠的信号是持续时间，而不是数量。用错误状态的持续时间来构建告警，信任规则之前先在真实健康运行的日志上回放它，并给告警一个队列能据此行动的退出码。然后读第一条错误，不是最后一条，因为原因在噪声的上方。

## Taught in

Miles 手册在[看门狗页面](../../../manuals/miles-101/sections/1-2-add-a-watchdog.md)构建并测试了看门狗，在[故障页面](../../../manuals/miles-101/sections/6-3-survive-failures.md)讲了检查点和容错，在[排障页面](../../../manuals/miles-101/sections/7-1-troubleshoot-by-symptom.md)列出了引擎的失败原因，在[路由器页面](../../../manuals/miles-101/sections/8-6-which-router-to-use.md)解释了 503，[面向 AI 的 SRE 这一课](../../../phases/17-infrastructure-and-production/23-sre-for-ai/docs/en.md)为告警设计提供了框架。
