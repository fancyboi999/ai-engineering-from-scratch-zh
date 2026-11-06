---
id: port-published-on-ipv4-only
title: 发布的端口只在一个回环地址上响应
card: scenarios
kind: incident
level: 1
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, debugging]
tags: [sandbox, ports, ipv6, loopback]
minutes: 15
lessons: []
manuals: [docker-sandboxes-101#s-sbx-exec-cp-and-ports, docker-sandboxes-101#s-ref-sources-and-the-conflicts-register]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
system:
  version: sbx v0.47.0
  model: none; shell commands inside the sandbox
  hardware: one Mac with the microVM runtime
source:
  - manuals/docker-sandboxes-101/capture/out/05-ports.txt
  - manuals/docker-sandboxes-101/capture/out/05-ports-curl.txt
  - manuals/docker-sandboxes-101/capture/out/05-ports-ls.txt
  - manuals/docker-sandboxes-101/capture/out/05-ports-tcp.txt
  - manuals/docker-sandboxes-101/capture/out/05-ports-unpublish.txt
  - manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md
  - manuals/docker-sandboxes-101/sections/r-7-sources-and-the-conflicts-register.md
---


## Situation

一名开发者在沙箱里用 8080 端口提供一个静态网站，并用 `sbx ports m101-demo --publish 18081:8080` 把它发布到宿主机。宿主机上的浏览器能打开页面。同一台宿主机上的测试 harness 却报告无法连接，日志显示它尝试的是 `::1`。开发者怀疑沙箱里的服务器只监听了一个网络接口，开始修改服务器配置。

你手上有发布命令及其列表输出、在两个回环地址上请求同一 URL 的结果、`sbx ls` 中的列表、指定了协议的第二次发布，以及取消发布的调用。

## Evidence

- [不指定协议发布的端口，以及列表输出](evidence/publish-and-list.txt)
- [在两个回环地址上请求同一 URL](evidence/two-loopbacks.txt)
- [sbx ls 的 PORTS 列中的绑定](evidence/the-ports-column.txt)
- [指定协议的发布，以及 JSON 列表](evidence/a-dual-stack-publish.txt)
- [两次取消发布的调用和空列表](evidence/unpublish.txt)

## Questions

1. 拒绝连接的是哪一边，沙箱里的服务器还是宿主机上的绑定？列表里哪一项说明了这一点？
2. 不指定协议发布时会绑定什么？从哪个版本开始如此？
3. 怎样发布才能让两个回环地址都响应？
4. 重新连接沙箱时，sbx run 的 -p 参数没有起作用。为什么？
5. 怎样移除一个绑定？怎样确认它已经移除？

## Walkthrough

1. **看协议列。** 发布返回 `Published 127.0.0.1:18081 -> 8080/tcp4`，列表中只有一行，宿主机地址为 `127.0.0.1`，协议为 `tcp4`。宿主机上的绑定只有 IPv4。沙箱里的服务器根本没收到请求。
2. **用两次请求确认。** `127.0.0.1:18081` 返回 200。`[::1]:18081` 连接失败，curl 以 7 退出。失败的一边是宿主机上没有任何程序监听的那个回环地址。
3. **说出规则。** 不指定协议时，发布使用 `tcp4`，所以宿主机一侧只有 `127.0.0.1`。手册把这个变化定在 v0.42.0：除非指定协议，发布的端口不再监听 `::1`。2025 年的插件会绑定两个回环地址，冲突 C39 记录了这一点。`sbx ls` 的 `PORTS` 列显示的也是同一个绑定。
4. **为两个地址族发布。** `--publish 8080/tcp` 在临时宿主机端口上绑定 `127.0.0.1` 和 `[::1]`，`sbx ports --json` 列出三条记录：最早的 `tcp4` 绑定，以及两条 `tcp` 绑定，每个地址一条。harness 需要固定端口时，在规格里写明宿主机端口。
5. **移除不再需要的绑定。** `--unpublish 18081:8080` 和 `--unpublish <port>:8080/tcp` 各自移除对应的映射，JSON 列表最后为空。`sbx run` 的 `-p` 只在创建时生效，之后的变更都要通过 `sbx ports`。

## Resolution

服务器没有问题。宿主机绑定是 `tcp4`，只有 `127.0.0.1` 在监听，harness 连接 `::1` 时找不到监听者。用固定宿主机端口发布 `8080/tcp` 后，两个回环地址都有了绑定，harness 能连上。沙箱里的配置修改全部撤销。

## Wrong turns

- "把沙箱里的服务器绑定到所有接口。" 客户机一侧已经通过 IPv4 映射响应了。缺少监听者的是宿主机回环地址。
- "下次 sbx run 时传 -p 18081:8080/tcp。" 对已存在的沙箱，这个参数会被忽略。要用 sbx ports。
- "在测试 harness 里关闭 IPv6。" 这样能跑通，但掩盖了绑定规则，下一个 harness 还会撞上。

## Generalize

一个客户端能访问服务、另一个不能时，先比较两者用的地址，再去动服务。端口映射有自己的地址族。一个能把地址族打印出来的列表，能省下在错误位置改上一个小时的工夫。

## Taught in

[端口页](../../../manuals/docker-sandboxes-101/sections/2-2-sbx-exec-cp-and-ports.md)给出了 `tcp4` 规则和协议表，[冲突登记表](../../../manuals/docker-sandboxes-101/sections/r-7-sources-and-the-conflicts-register.md)把这次变化记为 C39。
