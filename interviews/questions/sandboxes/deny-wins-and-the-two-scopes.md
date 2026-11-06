---
id: deny-wins-and-the-two-scopes
title: 为什么针对 example.com 的拒绝规则会被直接拒绝
card: sandboxes
kind: concept
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [screen, system-design]
tags: [sandbox, network-policy, allow, deny, scope]
minutes: 8
lessons: []
manuals: [docker-sandboxes-101#s-sbx-policy-init-allow-deny-and-check-network, docker-sandboxes-101#s-org-policies-profiles-and-the-audit-log]
practice: []
cheatsheet: [sandbox-policy]
related: [sandboxes/blocked-host-reads-as-timeout]
updated: 2026-11-03
---

执行 `sbx policy init balanced` 生成了一条包含 194 项放行条目的全局策略。某开发者通过 `--sandbox m101-policy` 参数添加了对 `example.com` 的放行规则，随后试图在同一级别为该主机添加拒绝（deny）规则，结果遭到了命令行工具的拒绝。解释规则语法、两个作用域范围，以及授权系统评判单个网络连接的先后顺序。

## Short answer

放行（allow）规则是一个以逗号分隔的主机名、域名、IP 地址或 CIDR 前缀列表，支持通配符模式如 `*.example.com`、`**.example.com`、`api?.example.com`、`example.com:443` 以及匹配所有主机的 `**`；放行规则默认覆盖 TCP（除非使用 `--protocol` 另行指定），而拒绝规则则无条件同时覆盖 TCP 和 UDP。规则分为两个作用域：默认的全局作用域（global），以及使用 `--sandbox` 指定的局部作用域（local）。针对相同的主机名或 CIDR，拒绝规则始终优先于放行规则，因此 CLI 会直接拒绝在同一作用域内与已有放行规则产生冲突的拒绝规则，你必须先移除该放行规则。授权评判逻辑首先在命中拒绝规则时立刻终止并阻断，其次在任意活动作用域内命中放行规则时予以放行，若均未命中则作为 `implicit`（隐式拒绝）阻断。

## Full answer

### `init` 命令实际初始化的内容

`policy init` 设置的是最初的全局策略，而非针对每个沙箱各自独立的默认配置。它支持使用 `allow-all`、`balanced` 或 `deny-all` 三种模式初始化一次，随后可通过 `sbx policy reset` 或 `sbx daemon start --policy` 重置从头开始。实测主机上的 balanced 预设包含 6 个网络规则组和 2 个文件系统规则，全部标记为 `created_via: default`。该预设列表在版本升级时经常会在没有更新日志的情况下发生变动，因此在信任其规则前应先审查 `sbx policy ls --wide --json`。

### 作用域、来源追溯与编辑权限

使用 `--sandbox` 添加的规则会输出 `scope: sandbox:<name>`、`layer: local`、`origin: scoped`、`created_via: added` 以及 `editable: true`。而通过工具包授予的权限则呈现为 `created_via: provisioned` 且 `editable: false`，可通过 `--source kit` 专门列出。在 `create` 或 `run` 时指定 `--deny-network HOST` 可以在创建之初就添加单沙箱粒度的拒绝规则，帮助文档阐明了为何这在组织治理下是安全的：局部拒绝规则只会使出站访问更窄，绝不会更宽。

### 判决执行顺序

1. 命中匹配的拒绝规则立即终止决策遍历，且该拒绝同时覆盖 UDP 以及 DNS 域名查询。
2. 命中来自任何处于激活状态的作用域的放行规则即准予连接。
3. 若均未匹配命中：判定为 `implicit` 隐式拒绝，原因为 `No matching allow rule (default deny)`（无匹配放行规则，默认拒绝），在 balanced 或 deny-all 模式下这会变成向用户发起审批请求。

未指定端口的主机默认按 443 端口求值，且 `check network` 仅检验网络连通性，从不检验 HTTP 请求方法或具体路径。对于已放行显式主机名的连接，不会再对照该域名解析出的 IP 地址去核验 CIDR 规则。

### 处于组织统一治理之下

当组织集中治理策略处于激活状态时，只有组织层面的放行规则能够赋予访问权限。本地和工具包层面的放行规则全部失效，但本地和工具包层面的拒绝规则依然强制生效。本地拒绝规则的优先级甚至高于组织的审批放行要求：请求会直接被阻断，根本不会向用户弹出任何审批提示。

| 规则类型 | 在集中治理下是否参与求值 |
|---|---|
| organization allow（组织放行） | 是 |
| organization deny（组织拒绝） | 是 |
| local allow（本地放行） | 否 |
| local deny（本地拒绝） | 是 |
| kit allow（工具包放行） | 否 |
| kit deny（工具包拒绝） | 是 |

## Follow-ups

- **Level 2:** 你放行了 `*.example.com` 并拒绝了覆盖其 IP 的 CIDR，连接 `api.example.com` 会发生什么？ Expected: 允许连接；已放行主机名不会再对照解析出的 IP 地址去核验 CIDR 拒绝规则。
- **Level 3:** 工具包为某沙箱赋予了 `example.com` 权限，但你希望在其中阻断它，鉴于该规则不可编辑你该怎么做？ Expected: 使用 `--deny-network` 或 `sbx policy deny network --sandbox` 添加局部拒绝，因为拒绝规则优先且局部拒绝只会收窄权限。
- **Level 3:** 为什么在集中治理下局部拒绝依然被完全信任？ Expected: 它只能单向缩减出站权限；它参与求值而本地放行不参与，且它甚至能直接压制组织的审批弹窗。
- **Level 4:** 如何确保跨版本的已录制策略列表真实可靠？ Expected: 将 `sbx policy ls --wide --json` 连同版本号和抓取日期一同归档，因为官方预设在各版本间变动时往往不提供更新日志。

## Wrong answers

- "后定义的规则优先，所以直接在放行后追加拒绝即可。" 拒绝规则天然优先于放行规则而不论添加顺序，且 CLI 明确拒绝在同一作用域内添加相互冲突的规则对。
- "主机名拒绝也会一并阻断其解析出的底层 IP。" 主机名规则与 CIDR 规则彼此隔离独立求值；放行主机名会跳过对解析 IP 的 CIDR 检查。
- "`policy init` 为每个后续创建的新沙箱设置了默认配置。" 它设置的是单套全局策略；每沙箱独立规则来自 `--sandbox`、`--deny-network` 或工具包。

## Taught in

[策略章节](../../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)给出了语法规则、作用域以及录制的冲突报错，[治理章节](../../../manuals/docker-sandboxes-101/sections/7-2-org-policies-profiles-and-the-audit-log.md)打印了优先级仲裁表格。
