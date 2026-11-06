---
id: readonly-database-inside-the-sandbox
title: 读写挂载上的只读数据库
card: scenarios
kind: incident
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, system-design]
tags: [sandbox, microvm, virtiofs, sqlite, docker-agent, mounts]
minutes: 25
lessons: []
manuals: [docker-sandboxes-101#s-docker-agent-run-sandbox-end-to-end, docker-sandboxes-101#s-docker-agent-run-new-and-doctor, docker-sandboxes-101#s-from-docker-sandbox-and-cagent-to-sbx-and-docker-agent, docker-sandboxes-101#s-ref-sources-and-the-conflicts-register]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
system:
  version: sbx v0.47.0 and docker-agent v1.149.0 on the host, with the main build of docker-agent inside the template
  model: none; the run stopped before its first model call
  hardware: one Mac with the microVM runtime
source:
  - manuals/docker-sandboxes-101/capture/out/27-sandbox-run.txt
  - manuals/docker-sandboxes-101/capture/out/27-data-dir-outside.txt
  - manuals/docker-sandboxes-101/capture/out/27-sqlite-probe.txt
  - manuals/docker-sandboxes-101/capture/out/27-inside.txt
  - manuals/docker-sandboxes-101/capture/out/27-inside-run.txt
  - manuals/docker-sandboxes-101/capture/out/27-kit-cache.txt
  - manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md
  - manuals/docker-sandboxes-101/sections/5-1-docker-agent-run-new-and-doctor.md
  - manuals/docker-sandboxes-101/sections/7-3-from-docker-sandbox-and-cagent-to-sbx-and-docker-agent.md
  - manuals/docker-sandboxes-101/sections/r-7-sources-and-the-conflicts-register.md
---


## Situation

一个团队用 `--sandbox` 运行他们的编码 agent，让 `shell` 和 `filesystem` 工具在一个 microVM 里执行，模型则留在宿主机上。在一位开发者的 Mac 上，第一次沙箱运行打印了启动摘要，拉取了模板镜像，创建了沙箱，然后在 agent 回答之前以退出码 1 结束。错误指向会话存储：它的迁移无法建表，因为数据库是只读的。沙箱在列表里仍显示为运行中。

频道里分成了三派。一位工程师说模板镜像坏了，想锁定一个旧 tag。一位说工作区一定是被误挂载成了只读。还有一位说客户机里缺 SQLite。第二次尝试之前，开发者给了你启动输出、一次把各状态目录放在默认位置的运行，以及运行中 VM 里的一个 shell。

## Evidence

- [沙箱运行、它的状态参数和启动摘要](evidence/the-command-and-its-mounts.txt)
- [沙箱运行的最后五行](evidence/the-error-that-ended-the-run.txt)
- [各状态目录使用默认位置的同一运行](evidence/a-data-directory-outside-the-workspace.txt)
- [VM 内一次普通的 SQLite 写入，以及工作区的挂载](evidence/a-sqlite-write-and-the-mounts.txt)
- [docker-agent 暂存在工作区下的 auto-kit](evidence/what-the-staged-kit-holds.txt)
- [VM 内 agent 二进制的版本](evidence/the-agent-binary-inside.txt)
- [在 VM 内手动启动的同一个 agent 文件](evidence/the-run-that-worked-inside.txt)

## Questions

1. 数据目录放在哪里？由哪个挂载承载？
2. 摘要里有三个只读挂载。其中有哪个能解释这个错误吗？
3. SQLite 探测补充了错误消息里没有的什么信息？
4. 第二次运行为什么在创建任何东西之前就失败了？
5. 最后一份记录是一次跑完的运行。它证明了什么？没证明什么？
6. 今天在这台宿主机上你会怎样在沙箱里运行这个 agent？你会提交什么问题？

## Walkthrough

1. **先读状态参数。** 命令后的说明写明，配置、数据和缓存目录都在工作区的 `.m101/` 下。错误来自会话存储，会话存储在数据目录里，所以数据库文件在工作区挂载上。
2. **读四行工作区挂载。** 工作区是 `(rw)`。agent 文件目录、`.m101/cache/sandbox-kits/<hash>` 下暂存的 kit 和 `.m101/cfg` 是 `(ro)`。数据目录不是这三个路径中的任何一个，所以挂载模式解释不了这个失败。
3. **用探测排除挂载标志。** 在 VM 内，在 `.m101/probe/` 下用普通 Python `sqlite3` 写入，报出同样的 `attempt to write a readonly database`。下面几行的挂载表显示工作区是一个 `rw` 的 `virtiofs` 挂载。内核报告这个挂载可写，SQLite 却仍然无法通过它写数据库。故障出在 SQLite 和这个挂载之间，不在沙箱设置里，也不是缺包：探测成功导入了 `sqlite3` 并建立了连接，没有报错。
4. **看为什么默认目录也行不通。** 使用默认状态目录的运行在创建沙箱之前就被拒绝了：`--data-dir` 必须位于可写的工作区内。所以启动器硬把数据库放到了这台宿主机上 SQLite 唯一写不进去的那个挂载上。
5. **把 kit 和存储分开看。** 暂存的 auto-kit 里有一个含 `agent_ref` 和 `built_at` 的 `manifest.json`，还有 `prompt_files` 和 `skills`。里面没有任何数据库配置。模板运行的是 `docker-agent version main`，而不是宿主机上运行的发布版，所以镜像 tag 是要记录的第二个发现。不过探测对任何程序都会失败，换一个 agent 构建也不会改变结果。
6. **用手动运行证明模型路径。** 在 VM 内启动，三个状态目录放在 `/tmp/m101` 下，这是客户机自己的文件系统，不是挂载。同一个 agent 文件以退出码 0 给出回答：README 有 1 行。位于 `host.docker.internal:12434` 的 provider 经代理连通了。所以模型路径、允许列表和 agent 文件都没问题，失败的只有会话存储的位置。

## Resolution

会话存储无法写入，是因为在这台宿主机上，SQLite 无法通过 `virtiofs` 工作区挂载写数据库，尽管 `mount` 把它列为 `rw`。启动器要求数据目录在这个工作区内，所以在这台机器上，`--sandbox` 启动没有一个受支持的位置放会话存储。沙箱本身是正常的：在 VM 内手动启动、状态放在 `/tmp/m101` 下的运行得出了正确答案，同一个 agent 文件也经代理连上了模型。

接下来的做法：

1. 在每台新宿主机上，用 `--sandbox` 启动之前，先在 VM 的 shell 里测试一次工作区内的 SQLite 写入，手册的检查清单就是这么写的。
2. 在数据目录规则改变之前，用 `sbx exec` 在 VM 内手动启动 agent，把 `--data-dir` 放在客户机文件系统上；探测能通过的机器继续用宿主机启动器。
3. 用完后用 `sbx rm` 删除沙箱，因为启动器在报错后会让它继续运行。
4. 提交两个待解决事项：模板运行的是 `main` 构建，不是锁定的发布版；运行没有打印安全模式，所以沙箱运行使用哪种模式仍然未知，这是手册中的冲突 C62。

## Wrong turns

- "工作区被挂载成了只读。" 摘要把它列为 rw，VM 内的挂载表也一致。三个只读挂载是 agent 文件目录、暂存的 kit 和配置目录，数据库不在其中任何一个下面。
- "锁定一个旧的模板 tag。" 一个没有 agent 参与的普通 Python 脚本也探测失败，所以原因不在 agent 构建。main 构建值得提一个工单，但不是修复。
- "把数据目录移到宿主机默认位置。" 启动器会拒绝可写工作区之外的数据目录，而且是在创建任何东西之前。
- "客户机里缺 SQLite。" 探测导入了模块，也打开了数据库。它是在第一次写入时失败的。

## Generalize

一个程序在系统列为可写的路径上报权限错误时，用能完成这个操作的最小程序，在同一路径上、在产品之外重复一遍。如果那里也失败，故障就从产品设置移到了它下面的那一层；如果通过，范围就缩小到产品本身。然后检查产品是否给了你绕开那一层的办法；如果没有，写下挡住你的那条具体规则。

## Taught in

手册的[端到端运行](../../../manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md)记录了这次失败和探测，[运行页](../../../manuals/docker-sandboxes-101/sections/5-1-docker-agent-run-new-and-doctor.md)解释了状态参数，[冲突登记表](../../../manuals/docker-sandboxes-101/sections/r-7-sources-and-the-conflicts-register.md)让冲突 C62 保持未结状态。
