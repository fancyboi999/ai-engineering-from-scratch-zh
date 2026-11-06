---
id: exfil-through-an-allowed-host
title: 依然能带走代码仓库的外发放行列表
card: sandboxes
kind: design
level: 4
roles: [agentic-ai-engineer, forward-deployed-ai-engineer, ai-evaluation-reliability-engineer]
rounds: [design-review, system-design]
tags: [sandbox, network-policy, exfiltration, http-rules, proxy]
minutes: 12
lessons: []
manuals: [docker-sandboxes-101#s-sbx-policy-log-and-the-proxy, docker-sandboxes-101#s-com-docker-sandbox-capabilities, docker-sandboxes-101#s-org-policies-profiles-and-the-audit-log]
practice: []
cheatsheet: [sandbox-policy, ai-security-incidents]
related: [sandboxes/blocked-host-reads-as-timeout, sandboxes/kit-grants-union-and-widen, sandboxes/governance-narrows-never-widens]
updated: 2026-11-03
---

balanced 预设放行了 `github.com:443` 以及 `**.github.com:443`。一位评审人员指出：能够读取私有代码仓库的 Agent 完全可以将仓库代码内容发帖泄露到该放行主机上的 issue 讨论区或 gist 代码片段中，因此该放行列表形同虚设。评估该断言，说明产品在该网络连接上能够看到什么、看不到什么，并设计收窄权限的方案。

## Short answer

该断言针对单纯的主机级规则完全成立：主机级放行允许针对该主机使用任何 HTTP 方法、路径和请求体发起任何请求，供应商员工在 2026 年表示向已放行主机发布 issue 正文或创建 gist 是不会被阻断的，手册将该说法记为存疑，且没有抓包记录对它做过测试。在已放行的连接上，正向代理运行在 `forward-bypass` 模式下，这是一个既不审查内容也不注入凭据的直通隧道；它仅在被阻断的主机上发声或在绑定了凭据的主机上注入凭据时才会终结 TLS。收窄方案是采用 HTTP 规则（工具包中带有 `methods` 和 `paths` 的 `network-policy@2` 条目或组织层面的 HTTP 规则），同时在源头上减少可读数据（采用克隆模式，并把密钥放在仓库外，以及采用带人工审批的默认全阻断模式，让未预期的新主机必须等待人工确认）。

## Full answer

### 代理服务在何时能看到什么

Agent 发送的 HTTP 和 HTTPS 流量通过正向代理转发，其他 TCP 流量则透明转发；两条路径均强制执行策略。沙箱客户机信任代理的证书颁发机构（CA），这正是被阻断主机能够在 TLS 内部收到包含审批提示的 `403` 的原因。而在放行后，录制的请求先收到 `HTTP/1.0 200 Connection established`，随后直接收到源站自身的 `HTTP/2 200`，日志将其归类为 `forward-bypass`。因此在评审人员所担忧的数据传输路径上，代理服务只是一根透明管道。`policy log` 针对每个主机仅记录一行包含请求计数的概要，不记录任何请求体内容。

### 主机规则无法表达的约束

拒绝规则覆盖 TCP、UDP 与域名查询，且 ICMP 无法被放行。而放行规则对 HTTP 方法或路径不做任何约束。产品的解决方案是 HTTP 规则：带有 `hosts`、`methods` 和 `paths` 的 `network-policy@2` 条目仅允许这些特定请求而拒绝其他所有请求，拒绝条目可以单独拒绝某主机上的特定方法，代理对违规请求直接返回 `403`。网络放行规则是上限，HTTP 规则负责在其中收窄范围。由此产生两项固有局限：`check network` 和 `policy log` 均不对方法或路径求值，因此唯一检验方法是发起真实网络请求；此外在 v0.47.0 的帮助文档中本地 `--method` 和 `--path` 标志缺失，因此 HTTP 规则目前必须来自于工具包或组织统一策略。

### 组织治理带来的安全增强

组织级网络规则支持细化到 HTTP 维度（单个目标结合方法与路径模式），且可以配置强制人工审批。在组织治理下，只有组织放行规则能够赋予访问权限，开发者无法自行重新拓宽主机访问面。针对 `http_request` 的审计日志记录了方法、主机、端口与路径，这是事后首次能看见请求形态的地方，但依然不包含请求体内容。

### 权限收窄的具体设计方案

1. 缩减可读数据集合：启用克隆模式、仓库内严禁存放机密密钥，任务允许时尽可能采用无挂载模式。
2. 将代码托管平台的主机级放行替换为受限条目：针对只读路径配置 `GET`，针对工作流必需的单一写入路径配置 `POST`，对其余路径配置拒绝。
3. 保持全局 deny-all 或带审批的 balanced 预设，使每一个新目标地址都必须经过人工决策，并在日志中留下 `created_via: approval` 规则记录。
4. 将受限规则封装在工具包或组织策略中并锁定工具包版本，把任何新增放行规则视为权限扩大，并暂停处理。
5. 用真实的 `DELETE` 请求以及发往未授权路径的 POST 请求做实测，预期均返回 `403`，并保留 `policy log` 作为实际访问主机的审查记录。

必须坦率承认该设计依然留有的敞口：针对单一写入路径的受限 `POST` 本身依然是一条潜在的外发数据通道。该设计把通道收窄到工作流所需的请求，让访问其他目标都成为一次明确的决策。

## Follow-ups

- **Level 3:** 既然代理持有沙箱客户机信任的 CA 根证书，为什么它不读取已放行请求的正文内容？ Expected: 它仅在需要主动发声响应阻断或注入绑定凭据时才终结 TLS；没有绑定凭据的已放行主机运行在 `forward-bypass` 直通隧道模式下。
- **Level 4:** HTTP 方法规则由何处执行，在哪里能观察到它已生效触发？ Expected: 由代理依据工具包或组织规则强制执行，外部表现为请求收到 `403` 以及产生组织审计日志记录，在 `check network` 或 `policy log` 中均不可见。
- **Level 4:** 工作流必须支持开启 Pull Request，请写出最小权限授权方案。 Expected: 为读取路径配置受限 `GET` 条目，为 PR 提交路径配置单一受限 `POST`，针对 `DELETE` 配置拒绝，并启用克隆模式以使可读范围局限于该代码仓库本身。

## Wrong answers

- "拒绝主站域名而只放行 API 域名。" 它依然是主机级放行；发送给该 API 主机的任何请求体都会被放行通传。
- "代理持有 CA，所以它审查了一切流量。" 它仅拦截阻断或注入；放行路径是一根直通隧道。
- "`policy log` 会揭示数据泄露。" 它仅显示主机和请求次数；请求体内容从不出现在任何日志中。

## Taught in

[代理章节](../../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)记录了直通隧道与主机级放行的局限性，[能力章节](../../../manuals/docker-sandboxes-101/sections/4-2-com-docker-sandbox-capabilities.md)定义了受限规则条目，而[治理章节](../../../manuals/docker-sandboxes-101/sections/7-2-org-policies-profiles-and-the-audit-log.md)展示了 `http_request` 审计日志结构。
