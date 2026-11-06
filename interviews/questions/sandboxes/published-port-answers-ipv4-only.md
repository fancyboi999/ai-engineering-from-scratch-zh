---
id: published-port-answers-ipv4-only
title: 在一个环回地址上响应而在另一个上拒绝的端口
card: sandboxes
kind: debug
level: 2
roles: [agentic-ai-engineer, applied-ai-engineer]
rounds: [debugging, coding]
tags: [sandbox, ports, exec, cp, networking]
minutes: 6
lessons: []
manuals: [docker-sandboxes-101#s-sbx-exec-cp-and-ports]
practice: []
cheatsheet: [docker-sandboxes]
related: [sandboxes/hypervisor-is-the-boundary]
updated: 2026-11-03
---

你使用 `sbx ports` 发布了端口映射 `18081:8080`。宿主机上的客户端连接 `[::1]:18081` 遭到了连接拒绝，而访问 `127.0.0.1:18081` 却能正常返回 200 响应。解释该默认行为、写出修复此问题的规范语法，并指出另外两个行为规则不同于 `docker` 对应命令的 `sbx` 子命令动词。

## Short answer

若在发布规范中未指定协议，发布命令默认采用 `tcp4`，因此宿主机绑定仅监听在 `127.0.0.1` 单一地址上；该默认规则在 v0.42.0 中发生了变更，实测向 `::1` 发起的 `curl` 探测以退出码 7 报错失败。应使用 `8080/tcp` 发布以同时绑定两个环回地址（各自绑定在宿主机临时分配的端口上），且在取消发布时不带协议即可一并移除任一形式。另外两个子命令动词是：`sbx exec`（默认以 `agent` 用户身份运行、会自动拉起处于停止状态的沙箱，且完全不支持分离后台运行模式），以及 `sbx cp`（强制要求单侧写为 `SANDBOX:PATH` 形式，且拒绝在两个沙箱之间直接复制）。

## Full answer

### 地址族配置规则表

| 协议声明（`PROTOCOL`） | 省略宿主机 IP（`HOST_IP`）时的宿主机绑定行为 |
|---|---|
| 未声明 | 默认作为 `tcp4` 绑定在 `127.0.0.1`，或者当 `HOST_IP` 为 IPv6 地址时作为 `tcp6` 绑定在 `::1` |
| `tcp`, `udp` | 同时绑定在 `127.0.0.1` 与 `::1`，若沙箱仅支持 IPv4 则仅绑定在 `127.0.0.1` |
| `tcp4`, `udp4` | 仅绑定在 `127.0.0.1` |
| `tcp6`, `udp6` | 仅绑定在 `::1` |

`sbx ports SANDBOX --json` 将所有映射关系列为 `host_ip`、`host_port`、`sandbox_port` 和 `protocol`，且 `sbx ls` 会在 `PORTS` 列中打印它们。在 `sbx run` 中使用 `-p` 参数仅在创建时生效，在重新连接时会被直接忽略，因此后续的端口变动必须通过 `sbx ports` 命令管理。发布端口会自动唤醒处于停止状态的沙箱。在云端环境中，已发布的端口会生成一个公开的 URL，且 UDP 协议会被直接拒绝。

### exec 与 cp 子命令

`sbx exec` 在工作区目录下以 `sudo` 和 `docker` 用户组中的 uid 1000 身份执行命令，而使用 `-u root` 正是帮助文档推荐的软件包安装方式。`-d` 标志出现在帮助文档中仅仅是为了明确告知“不支持分离模式后台运行”，且在带有 `--cloud` 时，`-d`、`--user` 和 `--privileged` 标志会被直接报错拒绝而非静默忽略。在沙箱内部，`SANDBOX_NAME` 和 `SANDBOX_ID` 标明了沙箱标识，`WORKSPACE_DIR` 标明了挂载路径。

`sbx cp SRC DST` 强制要求一侧为 `SANDBOX:PATH`，另一侧为宿主机本地路径。录制的从一个沙箱向另一个沙箱的直接复制操作以退出码 1 报错失败，提示 `copying between sandboxes is not supported`（不支持在沙箱之间复制），因此此类复制必须以宿主机为跳板分两步完成。沙箱路径是容器内部路径，因此位于 `/tmp` 下的文件落在工作空间挂载之外，会随沙箱销毁而直接丢失。向外复制曾有安全历史：v0.38.0 版本修复了 CVE-2026-17106 漏洞，该缺陷曾导致复制操作逃逸出目标目录。

## Follow-ups

- **Level 2:** 在创建时未指定端口的沙箱上使用 `-p 18081:8080` 重新连接，没有任何端口被发布，为什么？ Expected: `-p` 标志仅在初次创建时生效；应在已有沙箱上使用 `sbx ports --publish` 命令。
- **Level 3:** `sbx cp a:/tmp/x b:/tmp/x` 报错失败，你该如何转移该文件？ Expected: 通过宿主机中转路径分两步复制，因为系统不支持沙箱到沙箱的直接复制。
- **Level 3:** 为什么 `--cloud` 对 `--privileged` 执行直接拒绝而非静默忽略？ Expected: 静默忽略会导致脚本误以为自己获得了特权模式；直接拒绝能够确保本地与云端行为的一致性与诚实性。
- **Level 4:** 你此前绑定了 `8080/tcp`，随后在不带协议的情况下执行取消发布 `8080`，还残留什么？ Expected: 什么都不残留；不带协议的取消发布会同时清理默认单栈形式与双栈映射形式。

## Wrong answers

- "虚拟机内部禁用了 IPv6。" 绑定的地址族完全是由规范中的协议参数在宿主机侧决定的。
- "取消发布必须显式声明与发布时完全一致的协议。" 不带协议声明同样能够无条件清除该映射。
- "`sbx exec -d` 会在后台静默运行命令。" 根本不支持分离后台运行模式；帮助文档出现该标志只是为了明确警告该限制。

## Taught in

[exec、cp 与端口章节](../../../manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md)记录了 `tcp4` 默认绑定、两次 `curl` 测试结果以及被拒绝的跨沙箱复制。
