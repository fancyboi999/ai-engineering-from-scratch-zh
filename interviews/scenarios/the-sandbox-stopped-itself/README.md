---
id: the-sandbox-stopped-itself
title: 沙箱自行停止
card: scenarios
kind: incident
level: 1
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, debugging]
tags: [sandbox, lifecycle, auto-stop, daemon-log]
minutes: 15
lessons: []
manuals: [docker-sandboxes-101#s-sbx-run-create-stop-and-rm, docker-sandboxes-101#s-kit-tck-diagnose-and-the-claims-this-manual-checked]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
system:
  version: sbx v0.47.0
  model: none; shell commands inside the sandbox
  hardware: one Mac with the microVM runtime
source:
  - manuals/docker-sandboxes-101/capture/out/04-auto-stop.txt
  - manuals/docker-sandboxes-101/capture/out/04-prune.txt
  - manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md
  - manuals/docker-sandboxes-101/sections/7-4-kit-tck-diagnose-and-the-claims-this-manual-checked.md
---


## Situation

一名开发者在一个仓库上打开 shell 沙箱，启动了一个耗时很长的依赖安装，然后关掉终端去开会。一小时后，`sbx ls` 显示该沙箱的状态为 `stopped`。安装没有完成，开发者能看的地方也都没打印任何错误。他们断定是守护进程崩溃，或者有人删掉了沙箱，想从头重建一个。

你手上有两份列表、该沙箱的守护进程日志行，以及另一天显式停止和 prune 的输出。

## Evidence

- [最后一个会话关闭前后的 sbx ls 列表](evidence/running-then-stopped.txt)
- [守护进程日志中针对 m101-demo 的两条自动停止行](evidence/the-daemon-log.txt)
- [显式停止、prune 以及随后的列表](evidence/stop-prune-and-the-empty-list.txt)

## Questions

1. 沙箱是崩溃了、被删除了，还是自行停止了？哪份列表给出了定论？
2. 守护进程日志的两行说明发生了什么？在什么级别？
3. 停止后会保留什么，不会保留什么？
4. 怎样重新进入这个沙箱？prune 本来会造成什么后果？
5. 断开连接后，怎样让作业继续运行？

## Walkthrough

1. **看状态。** 第一份列表显示 `running`，第二份显示 `stopped`。被删除的沙箱不会出现在列表中。崩溃的守护进程无法响应 `sbx ls`。沙箱是自行停止的。
2. **读守护进程日志。** 两行都是 `INFO`，不是错误。第一行说明自动停止宽限期已过，运行时正在停止。第二行说明最后一个会话断开后，运行时自动停止。触发原因就是关掉了终端：那是最后一个会话。每行都带着守护进程版本，所以你能知道是哪个版本做的。
3. **弄清停止保留了什么。** 显式停止打印了 `state preserved` 和重启命令。手册列出了跨停止和重启持久保留的内容：已安装的包、Docker 镜像、配置更改、命令历史，以及不在挂载点上的工作区文件。运行中的进程不在清单里，所以安装随 microVM 一起结束了。
4. **用正确的方式回来。** `sbx run --name m101-demo` 重新连接并启动已停止的沙箱。`sbx prune` 则会删掉它：在采集记录里，它删除了两个已停止的沙箱并留下空列表，而且 `rm` 和 `prune` 还会删除限定在该沙箱范围内的 secret。
5. **有意让它保持运行。** 对已有沙箱使用 `sbx run -d` 可以在会话断开后让它继续运行，直到你主动停止或删除。kit 也可以声明 `long-running@1` 能力来达到同样效果。手册的记录将自动停止标记为已观察到且未在文档中说明，因此不要指望有官方页面提前警告你。

## Resolution

最后一个会话关闭且宽限期过后，守护进程有意停止了沙箱，其日志在 INFO 级别明确说明了这一点。没有崩溃，也没有任何东西被删除。开发者用 `sbx run --name` 重新连接，发现已经装好的包还在，然后重新开始安装。对于下一个耗时作业，他们以分离模式启动沙箱，这样就不会有任何会话成为最后一个。在确实想要删掉沙箱之前，运维手册里不执行 prune。

## Wrong turns

- "运行 sbx prune 清理，然后重新创建沙箱。" prune 会删除每个已停止的沙箱，连同其状态和 secret 一起丢掉。你想要找回的恰恰是一个已停止的沙箱。
- "守护进程崩溃了。" 它写了两行 INFO 并响应了列表查询。崩溃就不会留下第二份列表。
- "用同一个名字创建新沙箱。" 这个名字属于已停止的那个沙箱，新沙箱会丢失已安装的状态。改用重新连接。

## Generalize

当你启动的东西不见了，先问它是停止了、失败了还是被删除了，在重建任何东西之前，先读管理其生命周期的组件日志。会自行停止空闲工作的平台还会再这样做。找出将工作标记为长期运行的参数或能力，并在需要时主动使用它。

## Taught in

[生命周期页](../../../manuals/docker-sandboxes-101/sections/2-1-sbx-run-create-stop-and-rm.md)记录了自动停止以及停止保留的内容，[断言账本](../../../manuals/docker-sandboxes-101/sections/7-4-kit-tck-diagnose-and-the-claims-this-manual-checked.md)给出了实测观察到的行为，背后没有厂商文档说明。
