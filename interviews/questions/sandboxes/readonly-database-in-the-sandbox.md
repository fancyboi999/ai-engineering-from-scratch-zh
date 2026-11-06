---
id: readonly-database-in-the-sandbox
title: 单次沙箱 agent 运行中的三重失败
card: sandboxes
kind: debug
level: 3
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, coding]
tags: [sandbox, agent-runtime, virtiofs, sqlite, allowlist]
minutes: 10
lessons: []
manuals: [docker-sandboxes-101#s-docker-agent-run-sandbox-end-to-end, docker-sandboxes-101#s-sbx-and-docker-agent]
practice: []
cheatsheet: [docker-sandboxes, agent-harness]
related: [sandboxes/blocked-host-reads-as-timeout, sandboxes/sentinel-is-not-the-key]
updated: 2026-11-03
---

执行 `docker-agent run --sandbox agent.yaml` 输出了启动摘要、创建了虚拟机，随后报错崩溃：`Error: creating session store: migration failed even after database reset: failed to create migrations table: attempt to write a readonly database (1032)`。此前的一次尝试曾因 `--data-dir` 指向用户主目录而被拒绝，且当天的第一笔模型调用直接返回了 `403 Blocked by network policy`。解释这三处失败的原因，并说明启动摘要在运行之前本该提醒你注意什么。

## Short answer

这三处失败均源自外部环境配置，而非 agent 配置文件本身的问题。在带有 `--sandbox` 时，工作区之外的数据目录会被拒绝，因为从虚拟机内部只有工作区是可写的。403 错误意味着模型服务主机未列入持久化放行列表中：执行 `docker-agent sandbox allow localhost:12434` 即可解决，且此处端口必须对应 `localhost`，因为沙箱代理在比对规则前会将 `host.docker.internal` 重写为 `localhost`。而只读数据库错误是由于 SQLite 在当前宿主机上无法通过 `virtiofs` 工作区挂载执行写入所致（尽管系统 `mount` 明确显示挂载属性为 `rw`）；在同一挂载点上执行简单的 Python `sqlite3` 写入同样会遭遇完全相同的报错，且出错后虚拟机依然保持运行状态，因此必须手动清理关闭该虚拟机。

## Full answer

### 启动前务必先阅读启动摘要

启动摘要完整列出了本次运行所信任的一切核心配置：`Models gateway: none configured`（未配置模型网关）、为代理放行的模型目录服务主机、包含你所添加主机的用户放行列表，随后是沙箱名称、挂载卷及其模式、所用镜像以及资源配额。在录制运行中，工作空间挂载为 `rw`，而 Agent 文件所在目录、缓存的暂存工具包路径 `.m101/cache/sandbox-kits/<hash>` 以及配置目录均挂载为 `ro` 只读。运行镜像为 `docker/docker-agent-sbx-templates:latest`，配额为 `cpu 10` 与 `memory 32 GiB`。后续发生的每一处失败，都能在这些摘要行中找到根源依据。

### 数据存储目录的限制

测试捕获工具包通过 `--data-dir`、`--cache-dir` 和 `--config-dir` 避免运行时污染 `~/.cagent`。但在带有 `--sandbox` 时，系统明确报错拒绝：`--data-dir must be inside the sandbox's writable workspace`（数据目录必须位于沙箱的可写工作区内部），因此这三个目录全部被重定向到了工作区内的 `.m101/` 目录下。这也使得会话数据库直接落在了工作区挂载点上，进而引发了第三处失败。

### 模型服务主机与网络代理

在虚拟机内部，`127.0.0.1` 指向虚拟机自身，因此 Agent 文件中的模型提供方地址必须指向 `host.docker.internal:12434`。由于该主机未在 `NO_PROXY` 中豁免，请求通过位于 `gateway.docker.internal:3128` 的 `HTTP_PROXY` 发出，沙箱代理在处理时会将该域名转换为 `localhost`。因此放行规则必须显式书写为 `localhost:12434`。在虚拟机内部直接查阅放行列表会显示为空，因为放行规则保存在宿主机代理侧，而非虚拟机内部。虚拟机内部的模型 API 密钥环境变量被自动填充为占位符 `proxy-managed`。

### 只读数据库报错的根因

数据目录位于工作区挂载点上，该挂载点在系统层面确实标记为 `rw`。然而 SQLite 却无法在该路径下创建迁移数据表，且使用纯 Python `sqlite3` 脚本在相同挂载点上测试同样会遭遇完全一致的失败，这证明底层故障是当前宿主机上 `virtiofs` 的写入通道兼容性问题，而非 Agent 自身代码有误。随后的测试证明了整套链路的可用性：在虚拟机内部手动将状态目录指定在 `/tmp/m101` 下运行完全相同的 Agent 文件，模型请求顺利通过代理发出且应答完全正确。Agent 运行时在发生该错误后直接退出，但并不会主动停止或销毁虚拟机；`sbx ls` 显示其依然保持 `running`，必须通过 `sbx rm --force` 手动终止。从相同工作区发起的后续运行会自动复用该虚拟机，除非挂载集合发生了变更。

## Follow-ups

- **Level 3:** 为什么 Agent 文件中写 `127.0.0.1:12434` 在宿主机可行而在沙箱内失败？ Expected: 虚拟机内部的环回地址指向虚拟机自身；必须改用 `host.docker.internal`，并放行 `localhost:12434`，因为代理会重写该名称。
- **Level 3:** 你放行了某主机，但在沙箱内查看放行列表却显示为空，规则丢失了吗？ Expected: 没有；规则保存在宿主机的代理服务中，虚拟机内部并不是强制执行安全策略的场所。
- **Level 4:** 如何证明 SQLite 报错源自底层挂载问题？ Expected: 在相同挂载点上运行 Python `sqlite3` 写入产生相同报错，`mount` 显示为 `rw`，而将状态目录改在虚拟机内 `/tmp` 下则 Agent 能完美运行。
- **Level 4:** 失败的运行遗留了什么，如何清理？ Expected: 遗留了一个依然在运行中的虚拟机，运行时既不停止也不删除它；执行 `sbx rm` 清理，或者让下次运行直接复用它。

## Wrong answers

- "工作区是只读的，修改其文件权限即可。" 挂载属性本身就是 `rw`；失败源于 SQLite 通过挂载层的底层写入问题，直接探测即可复现。
- "按照帮助文档的建议将 `--data-dir` 指向用户主目录。" 在开启 `--sandbox` 时该参数会被直接拒绝；只有工作区是可写的。
- "在放行规则中填写 `host.docker.internal:12434`。" 代理在审查规则前会将该域名重写为 `localhost`，因此规则必须写为 `localhost`。

## Taught in

[端到端运行章节](../../../manuals/docker-sandboxes-101/sections/1-2-docker-agent-run-sandbox-end-to-end.md)记录了全部三重失败与启动摘要，[第一章节](../../../manuals/docker-sandboxes-101/sections/1-1-sbx-and-docker-agent.md)阐述了两种启动路径。
