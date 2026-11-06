---
id: implicit-deny-looked-like-an-outage
title: 被误判为网络故障的隐式拒绝策略
card: scenarios
kind: incident
level: 2
roles: [agentic-ai-engineer, forward-deployed-ai-engineer]
rounds: [debugging, system-design]
tags: [sandbox, network-policy, proxy, deny, agent-failure-modes]
minutes: 20
lessons: [phases/14-agent-engineering/26-failure-modes-agentic]
manuals: [docker-sandboxes-101#s-sbx-policy-init-allow-deny-and-check-network, docker-sandboxes-101#s-sbx-policy-log-and-the-proxy]
practice: []
cheatsheet: []
related: []
updated: 2026-11-03
system:
  version: sbx v0.47.0
  model: none; shell commands inside the sandbox
  hardware: one Mac with the microVM runtime
source:
  - manuals/docker-sandboxes-101/capture/out/09-blocked.txt
  - manuals/docker-sandboxes-101/capture/out/09-check-verbose.json
  - manuals/docker-sandboxes-101/capture/out/09-policy-log.txt
  - manuals/docker-sandboxes-101/capture/out/09-allow.txt
  - manuals/docker-sandboxes-101/capture/out/09-allowed.txt
  - manuals/docker-sandboxes-101/capture/out/09-blocked-by-rule.txt
  - manuals/docker-sandboxes-101/capture/out/09-deny-conflict.txt
  - manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md
  - manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md
---

## Situation

在沙箱内部运行的一个 shell agent 被要求从 `example.com` 拉取页面作为大型任务的第一步。该 agent 随后向外汇报称沙箱内部网络发生故障，并请求操作员修复网络连接。操作员将 agent 的命令直接粘贴进 `sbx exec` 中执行，一秒之内便收到了响应，说明网络并未发生超时。该沙箱创建时采用了 balanced 平衡安全预设，未配置任何自定义规则。

团队最初推测是代理服务发生故障，因为响应中包含了两个相互矛盾的状态行。第二种推测是 DNS 解析失败。你手头掌握了操作员运行的两次请求、针对该域名的策略检查输出、策略日志，以及事后修改安全规则所使用的命令。

## Evidence

- [在 m101-policy 沙箱内部针对 `example.com` 执行的 HEAD 与 GET 请求](evidence/what-the-agent-saw.txt)
- [执行 sbx policy check network 针对 example.com 的决策结果](evidence/check-network-before-any-rule.txt)
- [m101-policy 沙箱的策略审计日志](evidence/the-policy-log.txt)
- [沙箱作用域的放行规则及添加后的策略列表](evidence/one-allow-rule-later.txt)
- [配置放行规则后再次执行相同的 HEAD 请求输出](evidence/the-same-request-after-the-allow.txt)
- [使用拦截规则替换放行规则后执行 GET 请求的响应内容](evidence/an-explicit-deny-reads-differently.txt)
- [在放行规则尚存时尝试添加拦截规则所触发的冲突报错](evidence/a-deny-against-an-existing-allow.txt)

## Questions

1. HEAD 请求输出了两个状态行并以退出码 0 结束。哪个组件发送了每一行，为什么退出码为 0？
2. 策略检查显示判定为 implicit 且未指明任何规则。是什么决定了该请求的结果？
3. 日志显示有两个已放行的域名走了不同的代理路径。forward-bypass 表达了什么含义？
4. 配置放行规则后，相同请求的首个状态行发生了什么变化？
5. 显式拦截会返回不同的响应体。从沙箱内部和宿主机两侧如何区分这两种拒绝？
6. 为什么拦截规则在首次添加时遭到系统拒绝，正确的操作步骤顺序是什么？

## Walkthrough

1. **逐行分析 HEAD 请求输出。** `HTTP/1.1 200 OK` 是正向代理接收并建立了 `CONNECT` 隧道。其下方的 `HTTP/1.1 403 Forbidden` 则是在沙箱信任的自签证书保护下，在 TLS 会话内部返回的带有 90 字节纯文本响应体的拒绝信息。curl 完整接收到了响应因此以退出码 0 结束。GET 请求展现了具体的响应内容：明确提示访问 `example.com:443` 需要人工审批。没有任何网络延迟，没有任何节点不可达。代理服务根据预设策略给出了明确的拒绝裁决。
2. **查验鉴权决策器。** `sbx policy check network` 在不发出任何网络报文的前提下执行与代理服务相同的鉴权逻辑。在沙箱上下文中针对该域名，其返回 `allowed: false`、`deny_kind: implicit`、拒绝原因为 `No matching allow rule (default deny)`，且没有命中任何具体规则。balanced 预设内置了 194 个白名单域名，而 `example.com` 并不在其中。该请求未命中任何放行规则，触发了默认隐式拦截。
3. **查阅审计日志。** 拦截记录明确指明了域名、代理路径 `forward`、规则说明 `no applicable policies for op(...)` 以及相同的默认拒绝原因。两条放行记录展示了预设允许的流量：经 `forward` 代理的软件包源，以及经 `forward-bypass` 隧道直连的下载节点（代理不审查该隧道内容）。日志揭示了放行流量，而检查命令揭示了决策依据。
4. **补充细粒度规则。** `sbx policy allow network --sandbox m101-policy example.com` 在该沙箱的局部作用域内新增了一条规则，`policy ls` 随后显示允许域名增至 195 个。此时相同的 HEAD 请求开头变成了 `HTTP/1.0 200 Connection established`，随后直接跟随源站返回的 `HTTP/2 200`。代理仅充当透明传输隧道，不再介入干预。
5. **辨别两类拒绝特征。** 当使用显式 deny 规则替代 allow 规则后，GET 请求体明确提示 `Blocked by local rule for example.com:443`，而隐式拒绝则提示需要审批。在宿主机上，策略检查对第二种情况报告 `deny_kind: explicit` 并附带规则 ID，对第一种情况报告 `implicit`。
6. **注意规则互斥与执行顺序。** 在同一作用域下针对相同域名已存在 allow 规则时，添加 deny 规则会遭到系统拒绝并指出 allow 规则冲突。必须先移除已有 allow 规则，再追加 deny 规则。在策略评估阶段 deny 优先级绝对高于 allow，但在 CLI 配置管理层面禁止两者共存。

## Resolution

现场根本没有发生任何网络故障。`example.com` 不在拥有 194 个域名的 balanced 预设白名单中。代理服务作为默认隐式防护拦截了该连接，并在 TLS 隧道内返回了附带审批提示的 403 响应。在沙箱作用域内补充一条 allow 规则后，相同的请求顺利穿透代理从源站获得了 200 响应。Agent 的故障报告完完全全符合失效模式课程中的预判：它仅凭单一状态码就草率推断出了一个自己从未动手核验过的根因。

整改措施：

1. 完善 agent 提示词指令：凡是包含审批信息的 403 响应，必须将其如实汇报为命中安全策略拦截，并附带具体域名和端口，以便操作员决定是否添加放行规则。
2. 在介入排查网络前，先在宿主机执行 `sbx policy check network --sandbox NAME host:port --json`，审查 `deny_kind` 与 `rule` 字段。
3. 针对特定 agent 的需求使用 `--sandbox` 添加局部规则，全局策略仅保留通用基础设施域名。在特定作用域添加 deny 规则前，先清理同一作用域下的对应 allow 规则。

## Wrong turns

- "重启后台守护进程，代理返回了两个不同状态码。" 两行状态码都是代理在忠实履行职责：第一行建立隧道，第二行按策略拒绝域名。重启改变不了任何策略。
- "这是 DNS 解析失败，因为 example.com 无法解析。" 请求携带域名顺利抵达了代理端，代理根据策略拒绝了该域名。响应体、检查命令和审计日志均清晰记录了域名与端口。
- "在全局范围放行 example.com 以一劳永逸。" 全局规则会对所有沙箱开放该域名。局部作用域的设计初衷正是为了隔离满足单个 agent 的特定需求。
- "立即添加一条 deny 规则防止 agent 再次尝试。" deny 规则会与同作用域的 allow 规则冲突被拒，且 agent 本次任务确实需要访问该域名。应修正其汇报机制而非阻断访问。

## Generalize

Agent 汇报的失败仅仅是一种推测性主张而非客观诊断。在 agent 外部复现该调用，完整阅读整个响应体而非仅看第一行状态码，在归咎于网络底层硬件前先向策略层确认其裁决结论。附带错误响应体的拒绝属于明确的策略响应，超时挂起才属于真正的网络故障。

## Taught in

[安全策略页面](../../../manuals/docker-sandboxes-101/sections/3-3-sbx-policy-init-allow-deny-and-check-network.md)解释了策略作用域与 `check network` 检查工具，[代理页面](../../../manuals/docker-sandboxes-101/sections/3-4-sbx-policy-log-and-the-proxy.md)解读了 403 状态码与审计日志，而[失效模式课程](../../../phases/14-agent-engineering/26-failure-modes-agentic/)剖析了 agent 汇报未经验证假设的典型行为模式。
