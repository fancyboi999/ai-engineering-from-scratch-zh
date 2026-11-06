---
id: sigterm-to-the-process-group
title: 中断所有正在生成的回答的滚动更新
card: scenarios
kind: incident
level: 2
roles: [inference-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [debugging, design-review]
tags: [shutdown, sigterm, drain, rolling-update, kubernetes, grace-period]
minutes: 20
lessons: [phases/17-infrastructure-and-production/23-sre-for-ai]
manuals: [sglang-101#s-operating-sglang]
practice: []
cheatsheet: [sre-for-ai, sglang-serving]
related: [scenarios/health-probes-add-load]
updated: 2026-11-03
system:
  version: SGLang 0.5.22 on its MLX path
  model: mlx-community/Qwen3-0.6B-4bit
  hardware: one laptop with unified memory, which captures no CUDA graphs
source:
  - manuals/sglang-101/capture/out/server-default.log
  - manuals/sglang-101/capture/out/shutdown-exploratory.log
  - manuals/sglang-101/capture/out/shutdown-exploratory.txt
  - manuals/sglang-101/sections/7-1-operating-sglang.md
---


## Situation

一个平台团队用滚动更新部署 SGLang pod。容器通过一个小的包装脚本启动服务器。编排器要求 pod 停止时，包装脚本把收到的信号转发给它的整个进程组。每次部署都会带来一阵失败的请求。正在接收回答的用户拿到的是断掉的流，每个被停掉的服务器在 pod 日志里都报告了崩溃，尽管模型本身没有任何问题。

值班工程师读了一份日志的结尾，在里面找到了崩溃。团队有两个提议：把终止的宽限期从 30 s 提高到五分钟；在网关里为断掉的流加重试。在两项改动上线之前，由你来审查证据。

## Evidence

- [一台被停掉的服务器的日志结尾，团队读到的样子](evidence/group-signal.txt)
- [服务器主进程收到 SIGTERM 时会做什么](evidence/how-the-drain-works.txt)
- [只向主进程发 SIGTERM，同时有一个请求在运行](evidence/main-process-signal.txt)
- [请求完成，服务器退出](evidence/drain-finishes.txt)
- [排空过程中客户端看到了什么](evidence/what-the-client-saw.txt)
- [两种跳过排空的退出方式，以及宽限期规则](evidence/two-exits-skip-the-drain.txt)

## Questions

1. 日志说一个子进程以退出码 -15 崩溃。这个退出码是什么？是谁发的？
2. 读排空的说明。哪个进程必须收到信号？排空期间健康检查端点会怎样？
3. 第二份记录在一个请求运行时只向一个进程发信号。从信号到退出码，跟踪这个请求。
4. 有人提议更长的宽限期。合适的值由什么决定？为什么要先设输出上限？
5. 说出服务器跳过排空的两种方式，以及这个版本里环境变量的陷阱。

## Walkthrough

1. **读退出码。** 负的退出码就是信号编号，15 是 SIGTERM。在第一份记录里，父进程记录它收到了 SIGTERM 并开始排空，就在同一秒，它的调度器子进程也死于同一个信号。除非发送方针对的是整个进程组，两个进程不会在同一时刻收到同一个信号。包装脚本就是这么做的。调度器先死，父进程发现子进程死了，走上崩溃路径，为诊断睡眠 5 秒，然后杀掉整个进程树。所有正在运行的请求都随调度器一起死了。日志里的崩溃是包装脚本造成的症状，不是服务器的故障。
2. **读排空归谁管。** 手册描述了这条路径。收到 SIGTERM 时，HTTP 服务器设置 `gracefully_exit`，`/health` 开始返回 503。tokenizer manager 里的一个 watchdog 每 5 s 检查一次这个标志，并每 5 s 记录一次剩余请求，直到一个不剩。然后它向调度器发送 `ShutdownReq`，给它们 15 s 退出，超时再杀掉。排空在主进程里。自己收到信号的调度器永远收不到关闭请求，所以排空无法开始。
3. **读干净的停止。** 在第二份记录里，探测程序在一个 3000 token 的请求运行时，只向服务器进程发送 SIGTERM。信号那一行之后，decode 批次继续运行；一秒后，日志说停止期间来了一次健康检查，返回了 503。编排器要的就是这个 503：别再往这里发流量了，这个 pod 正在退出。十秒后请求返回 200，watchdog 记录剩余请求为零，服务器进程结束。
4. **读客户端看到了什么。** 信号前健康检查为 200，排空期间为 503；请求在 14.2 s 后完成，3000 个 token 一个不少，结束原因为 `length`；退出码为 0。什么都没丢，服务器在信号之后大约十三秒退出。
5. **读跳过排空的两种退出。** 已经处于 `UnHealthy` 的服务器会立刻退出，设置了 `SGL_FORCE_SHUTDOWN` 的服务器也一样。环境模块声明了新名字 `SGLANG_FORCE_SHUTDOWN`，而它的兼容代码只把旧名字复制到新名字，所以这个版本的 watchdog 读的仍是旧名字。只设新名字没有任何作用。手册是在代码里读到这一点的，没有实际运行，并称之为一个可能的 bug。同一份记录给出了宽限期规则：要长于一个达到输出上限的请求所需的时间，而一个 32K token 的回答以每秒 30 token 生成，需要超过 18 分钟。

## Resolution

事故出在包装脚本。它把一个 SIGTERM 变成了发给每个进程的信号，调度器在父进程排空之前就死了，父进程报告了一次并非由它引起的崩溃。修复办法是让 `sglang serve` 成为容器的主进程，在脚本里用 `exec`，或者直接作为入口点，让编排器的信号只到达服务器。记录就是证明：信号只发给一个进程时，3000 token 的请求完成了，排空期间 `/health` 返回 503，退出码为 0。

然后确定停止所需的时间。先给 `max_tokens` 设上限，再把宽限期设得比一个达到上限的请求更长。没有输出上限的五分钟宽限期，仍会截断每一个超过五分钟的回答。测试环境需要强制停止时，设 `SGL_FORCE_SHUTDOWN=1`，永远不要只设新名字。网关重试不加：排空会在持有缓存的那个 pod 上把回答完成，而重试会在另一个 pod 上从第一个 token 重新开始。

## Wrong turns

- "把宽限期提高到五分钟。" 信号直接到了调度器子进程，排空根本没开始。没有开始的排空，多长的宽限期都帮不上；而短于一个达到输出上限的回答所需时间的宽限期，仍会截断回答。
- "在网关里重试断掉的流。" 重试要在另一个 pod 上再次计算 prompt 和已生成的 token。排空会在回答运行的地方把它完成。
- "在预发环境设 SGLANG_FORCE_SHUTDOWN=1 来快速停止。" 这个版本的 watchdog 读的是 SGL_FORCE_SHUTDOWN，所以新名字没有作用；而强制停止会跳过排空，这正是这次事故。
- "调度器崩溃了，所以给引擎提 bug。" 退出码 -15 是信号，不是故障。日志写明了谁先死、谁发的信号。

## Generalize

优雅停止是一个发送方和一个接收方之间的协议。要知道哪个进程负责排空，确保只有这个进程收到信号，并根据你允许的最长工作来确定给它多少时间。然后在有请求运行时测试停止，并读退出码，因为在空闲服务器上能正常停止，什么也证明不了。

## Taught in

SGLang 手册在[运维页的停止部分](../../../manuals/sglang-101/sections/7-1-operating-sglang.md#graceful-shutdown-signal-the-main-process-only)记录了两次停止和变量名陷阱，[AI 的 SRE 课](../../../phases/17-infrastructure-and-production/23-sre-for-ai/docs/en.md#runbook)给出了把这次解读变成可重复检查的 runbook 形式。
